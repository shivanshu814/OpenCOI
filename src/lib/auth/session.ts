import { isSupabaseConfigured } from "@/lib/config";
import { intakeEmailForToken } from "@/lib/email/intake-address";
import { createClient } from "@/lib/supabase/server";

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
};

/** Returns null in demo mode or when the user is not signed in. */
export async function getSessionOrg(): Promise<SessionOrg | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("org_members")
    .select(
      "org_id, role, orgs(id, name, intake_token, onboarding_completed_at, plan, subscription_status)",
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership?.org_id && membership.orgs) {
    const org = membership.orgs as unknown as {
      id: string;
      name: string;
      intake_token: string | null;
      onboarding_completed_at: string | null;
      plan: string | null;
      subscription_status: string | null;
    };
    const token = org.intake_token;
    return {
      orgId: membership.org_id,
      orgName: org.name,
      intakeToken: token,
      intakeEmail: token ? intakeEmailForToken(token) : null,
      userId: user.id,
      email: user.email ?? null,
      role: membership.role,
      onboardingCompletedAt: org.onboarding_completed_at,
      plan: org.plan,
      subscriptionStatus: org.subscription_status,
    };
  }

  // First login: bootstrap org via security-definer RPC (migration 002/003).
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
    return null;
  }

  const { data: orgRow } = await supabase
    .from("orgs")
    .select("intake_token")
    .eq("id", orgId)
    .maybeSingle();

  const token = orgRow?.intake_token ?? null;

  return {
    orgId: orgId as string,
    orgName: name,
    intakeToken: token,
    intakeEmail: token ? intakeEmailForToken(token) : null,
    userId: user.id,
    email: user.email ?? null,
    role: "owner",
    onboardingCompletedAt: null,
    plan: null,
    subscriptionStatus: null,
  };
}
