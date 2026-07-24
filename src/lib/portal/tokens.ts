import { appBaseUrl } from "@/lib/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash, randomBytes } from "crypto";

const TOKEN_TTL_DAYS = 30;

export function hashPortalToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function portalUrlForToken(raw: string): string {
  return `${appBaseUrl()}/portal/${raw}`;
}

export type PortalContext = {
  tokenId: string;
  orgId: string;
  orgName: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string | null;
  vendorStatus: string;
  preferredLocale: "en" | "es";
  agentEmail: string | null;
  trade: string | null;
  /** F2 white-label — sanitized hex color, or null. */
  brandColor: string | null;
  /** F2 white-label — customer logo URL, or null. */
  logoUrl: string | null;
};

/** Accept only a valid #rgb/#rrggbb hex so it's safe to inline as CSS. */
export function sanitizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : null;
}

/** Mint a portal token for a vendor. Returns plaintext once (hash stored). */
export async function issuePortalToken(input: {
  orgId: string;
  vendorId: string;
}): Promise<{ rawToken: string; url: string; expiresAt: string }> {
  const admin = createAdminClient();
  const expiresAt = new Date(
    Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Cannot recover prior plaintext — revoke active tokens, mint fresh.
  await admin
    .from("vendor_portal_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("org_id", input.orgId)
    .eq("vendor_id", input.vendorId)
    .is("revoked_at", null);

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashPortalToken(rawToken);

  const { error } = await admin.from("vendor_portal_tokens").insert({
    org_id: input.orgId,
    vendor_id: input.vendorId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) throw new Error(error.message);

  return {
    rawToken,
    url: portalUrlForToken(rawToken),
    expiresAt,
  };
}

/** Resolve a raw portal token → vendor/org context (service role). */
export async function resolvePortalToken(
  rawToken: string,
): Promise<PortalContext | null> {
  if (!rawToken || rawToken.length < 16) return null;

  const admin = createAdminClient();
  const tokenHash = hashPortalToken(rawToken);

  const { data: row } = await admin
    .from("vendor_portal_tokens")
    .select("id, org_id, vendor_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  const [{ data: vendor }, { data: org }] = await Promise.all([
    admin
      .from("vendors")
      .select(
        "id, name, email, status, preferred_locale, agent_email, trade, org_id",
      )
      .eq("id", row.vendor_id)
      .eq("org_id", row.org_id)
      .maybeSingle(),
    admin
      .from("orgs")
      .select("id, name, brand_primary_color, logo_url")
      .eq("id", row.org_id)
      .maybeSingle(),
  ]);

  if (!vendor || !org) return null;

  await admin
    .from("vendor_portal_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return {
    tokenId: row.id,
    orgId: org.id,
    orgName: org.name,
    vendorId: vendor.id,
    vendorName: vendor.name,
    vendorEmail: vendor.email,
    vendorStatus: vendor.status,
    preferredLocale: vendor.preferred_locale === "es" ? "es" : "en",
    agentEmail: vendor.agent_email,
    trade: vendor.trade,
    brandColor: sanitizeHexColor(org.brand_primary_color),
    logoUrl:
      typeof org.logo_url === "string" && org.logo_url.trim()
        ? org.logo_url.trim()
        : null,
  };
}
