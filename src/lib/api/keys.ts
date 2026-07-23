import { createAdminClient } from "@/lib/supabase/admin";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** Mint cs_live_… key; store hash only. */
export function mintApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `cs_live_${randomBytes(24).toString("base64url")}`;
  return {
    raw,
    prefix: raw.slice(0, 12),
    hash: hashApiKey(raw),
  };
}

export type ApiKeyOrg = {
  orgId: string;
  keyId: string;
};

export async function resolveApiKey(
  authorizationHeader: string | null,
): Promise<ApiKeyOrg | null> {
  if (!authorizationHeader?.toLowerCase().startsWith("bearer ")) return null;
  const raw = authorizationHeader.slice(7).trim();
  if (!raw.startsWith("cs_live_")) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("api_keys")
    .select("id, org_id, revoked_at")
    .eq("key_hash", hashApiKey(raw))
    .maybeSingle();

  if (!data || data.revoked_at) return null;

  await admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { orgId: data.org_id, keyId: data.id };
}

export function signWebhookBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

export function verifyWebhookSignature(
  secret: string,
  body: string,
  signature: string,
): boolean {
  const expected = signWebhookBody(secret, body);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Fire-and-forget outbound webhooks for org event. */
export async function dispatchOrgWebhooks(input: {
  orgId: string;
  event: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: hooks } = await admin
    .from("outbound_webhooks")
    .select("id, url, secret, events, active")
    .eq("org_id", input.orgId)
    .eq("active", true);

  const matching = (hooks ?? []).filter((h) =>
    (h.events as string[]).includes(input.event),
  );

  const body = JSON.stringify({
    event: input.event,
    created_at: new Date().toISOString(),
    data: input.payload,
  });

  await Promise.allSettled(
    matching.map(async (h) => {
      const sig = signWebhookBody(h.secret as string, body);
      await fetch(h.url as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CertShield-Signature": sig,
          "X-CertShield-Event": input.event,
        },
        body,
      });
    }),
  );
}
