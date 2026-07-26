/**
 * Extract client IP + User-Agent from request headers for audit_events.
 * Prefer x-forwarded-for (first hop) then x-real-ip — typical on Vercel.
 */

export type RequestAuditMeta = {
  ip_address: string | null;
  user_agent: string | null;
};

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  if (!first) return null;
  // Strip IPv6 brackets / port noise lightly
  const cleaned = first.replace(/^\[|\]$/g, "").split("%")[0]?.trim() ?? first;
  return cleaned || null;
}

export function clientMetaFromHeaders(
  headers: Headers | { get(name: string): string | null },
): RequestAuditMeta {
  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const cfIp = headers.get("cf-connecting-ip");
  const ip =
    firstForwardedIp(forwarded) ??
    firstForwardedIp(realIp) ??
    firstForwardedIp(cfIp);

  const ua = headers.get("user-agent")?.trim() || null;

  return {
    ip_address: ip,
    user_agent: ua && ua.length > 512 ? `${ua.slice(0, 509)}…` : ua,
  };
}

/** Next.js App Router — reads current request headers (no-op outside a request). */
export async function clientMetaFromNextHeaders(): Promise<RequestAuditMeta> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return clientMetaFromHeaders(h);
  } catch {
    return { ip_address: null, user_agent: null };
  }
}
