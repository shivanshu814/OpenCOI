import { isSupabaseConfigured } from "@/lib/config";
import { sanitizeHexColor, sanitizeLogoUrl } from "@/lib/portal/tokens";
import { intakeEmailForToken } from "@/lib/email/intake-address";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

export type SessionOrg = {
  orgId: string;
  orgName: string;
  intakeToken: string | null;
  intakeEmail: string | null;
  userId: string;
  email: string | null;
  role: string;
  onboardingCompletedAt: string | null;
  plan: string | null;
  subscriptionStatus: string | null;
  /** White-label accent (#rrggbb) — drives the workspace theme when set. */
  brandColor: string | null;
  /** White-label logo (https URL) — replaces the CertShield mark in the shell. */
  logoUrl: string | null;
};

type OrgRow = {
  id: string;
  name: string;
  intake_token: string | null;
  onboarding_completed_at: string | null;
  plan: string | null;
  subscription_status: string | null;
  brand_primary_color: string | null;
  logo_url: string | null;
};

function toSession(
  userId: string,
  email: string | null,
  role: string,
  org: OrgRow,
): SessionOrg {
  const token = org.intake_token;
  return {
    orgId: org.id,
    orgName: org.name,
    intakeToken: token,
    intakeEmail: token ? intakeEmailForToken(token) : null,
    userId,
    email,
    role,
    onboardingCompletedAt: org.onboarding_completed_at,
    plan: org.plan,
    subscriptionStatus: org.subscription_status,
    brandColor: sanitizeHexColor(org.brand_primary_color),
    logoUrl: sanitizeLogoUrl(org.logo_url),
  };
}

/**
 * Returns null in demo mode or when the user is not signed in / has no org.
 * Wrapped in React cache() so layout, page, and RoleGate calls within one
 * request share a single lookup instead of re-querying Supabase.
 */
export const getSessionOrg = cache(async (): Promise<SessionOrg | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Split queries — nested `orgs(...)` embed can come back null under RLS
  // even when membership exists, which previously fell through to create_org
  // and failed on slug unique → permanent Unauthorized.
  const { data: membership, error: memErr } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (memErr) {
    console.error("org_members lookup failed", memErr);
  }

  if (membership?.org_id) {
    const { data: org, error: orgErr } = await supabase
      .from("orgs")
      .select(
        "id, name, intake_token, onboarding_completed_at, plan, subscription_status, brand_primary_color, logo_url",
      )
      .eq("id", membership.org_id)
      .maybeSingle();

    if (orgErr) {
      console.error("orgs lookup failed", orgErr);
    }

    if (org) {
      return toSession(user.id, user.email ?? null, membership.role, org as OrgRow);
    }
  }

  // First login: if this email was invited to an org, join it instead of
  // bootstrapping a separate one (migration 015). SECURITY DEFINER, matches
  // only the caller's own verified email.
  const { data: invitedOrgId, error: inviteErr } = await supabase.rpc(
    "claim_pending_invites",
  );
  if (inviteErr) {
    console.error("claim_pending_invites failed", inviteErr);
  }
  if (invitedOrgId) {
    const { data: joinedMem } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .eq("org_id", invitedOrgId as string)
      .maybeSingle();
    const { data: joinedOrg } = await supabase
      .from("orgs")
      .select(
        "id, name, intake_token, onboarding_completed_at, plan, subscription_status, brand_primary_color, logo_url",
      )
      .eq("id", invitedOrgId as string)
      .maybeSingle();
    if (joinedMem?.org_id && joinedOrg) {
      return toSession(
        user.id,
        user.email ?? null,
        joinedMem.role,
        joinedOrg as OrgRow,
      );
    }
  }

  // Otherwise bootstrap a fresh org via security-definer RPC (migration 002/003).
  const slugBase =
    (user.email?.split("@")[0] ?? "org")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "org";
  const slug = `${slugBase}-${user.id.slice(0, 8)}`;
  const name =
    user.user_metadata?.org_name ??
    (user.email ? `${user.email.split("@")[0]} org` : "My organization");

  const { data: orgId, error } = await supabase.rpc("create_org", {
    p_name: name,
    p_slug: slug,
  });

  if (error || !orgId) {
    console.error("create_org failed", error);
    // Slug collision / race: membership may already exist — re-read once.
    const { data: retryMem } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (retryMem?.org_id) {
      const { data: org } = await supabase
        .from("orgs")
        .select(
          "id, name, intake_token, onboarding_completed_at, plan, subscription_status, brand_primary_color, logo_url",
        )
        .eq("id", retryMem.org_id)
        .maybeSingle();
      if (org) {
        return toSession(
          user.id,
          user.email ?? null,
          retryMem.role,
          org as OrgRow,
        );
      }
    }
    return null;
  }

  const { data: orgRow } = await supabase
    .from("orgs")
    .select(
      "id, name, intake_token, onboarding_completed_at, plan, subscription_status, brand_primary_color, logo_url",
    )
    .eq("id", orgId)
    .maybeSingle();

  if (!orgRow) {
    return {
      orgId: orgId as string,
      orgName: name,
      intakeToken: null,
      intakeEmail: null,
      userId: user.id,
      email: user.email ?? null,
      role: "owner",
      onboardingCompletedAt: null,
      plan: null,
      subscriptionStatus: null,
      brandColor: null,
      logoUrl: null,
    };
  }

  return toSession(user.id, user.email ?? null, "owner", orgRow as OrgRow);
});
