/**
 * Paddle publishes the source IP CIDRs it delivers webhooks from at a
 * public endpoint. Allowlisting them lets us reject a random attacker
 * hitting /api/webhooks/paddle with garbage BEFORE we spend cycles on
 * signature verification, and closes a small window where an attacker
 * with a valid old secret could still hit us — signature checks are still
 * the primary defence, this is defence-in-depth.
 *
 * We deliberately do NOT hard-code the list. Paddle can add or remove
 * infrastructure at any time, and a stale hard-coded list would silently
 * start dropping legitimate deliveries. The endpoint is the source of
 * truth; we fetch and cache in-process.
 *
 * Failure mode is fail-OPEN: if we can't reach api.paddle.com we let the
 * request through and rely on signature verification alone. Failing
 * closed here would drop every webhook during any Paddle DNS blip, and
 * the whole point of the belt-and-braces layer is to add safety, not
 * introduce a new outage mode.
 */

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min — Paddle rotations are rare

type Cache = { fetchedAt: number; cidrs: string[] };
let cache: Cache | null = null;

async function fetchPaddleIps(): Promise<string[]> {
  const res = await fetch("https://api.paddle.com/ips", {
    // Short abort so a slow Paddle DNS doesn't hold a webhook request.
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`paddle ips: HTTP ${res.status}`);
  const body = (await res.json()) as {
    data?: { ipv4_cidrs?: string[]; ipv6_cidrs?: string[] };
  };
  const v4 = body.data?.ipv4_cidrs ?? [];
  const v6 = body.data?.ipv6_cidrs ?? [];
  return [...v4, ...v6];
}

export async function getPaddleAllowedCidrs(): Promise<string[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.cidrs;
  try {
    const cidrs = await fetchPaddleIps();
    cache = { fetchedAt: now, cidrs };
    return cidrs;
  } catch (err) {
    // Stale cache is better than none.
    if (cache) return cache.cidrs;
    console.warn(
      "[paddle-ips] could not fetch allow list; falling through to signature-only auth",
      err,
    );
    return [];
  }
}

/** Only /32 and /128 host CIDRs are used today; parse defensively anyway. */
function ipInCidr(ip: string, cidr: string): boolean {
  const [range, maskStr] = cidr.split("/");
  const mask = Number.parseInt(maskStr ?? "0", 10);
  if (!range || Number.isNaN(mask)) return false;
  if (ip.includes(":") || range.includes(":")) return ip === range; // treat v6 as exact match — good enough for /128
  return ipv4ToInt(ip) !== null &&
    ipv4ToInt(range) !== null &&
    ((ipv4ToInt(ip)! ^ ipv4ToInt(range)!) >>> (32 - mask)) === 0;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const p of parts) {
    const n = Number.parseInt(p, 10);
    if (Number.isNaN(n) || n < 0 || n > 255) return null;
    out = (out << 8) | n;
  }
  return out >>> 0;
}

/**
 * Extract the immediate client IP from the standard hop-preserving headers
 * Vercel populates. `x-forwarded-for` is a comma-joined chain, oldest→newest;
 * the first entry is the true client per RFC 7239.
 */
export function clientIpFromHeaders(
  headers: Headers | Record<string, string | null>,
): string | null {
  const get = (k: string): string | null =>
    headers instanceof Headers
      ? headers.get(k)
      : (headers[k] ?? headers[k.toLowerCase()]) ?? null;
  const xff = get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return get("x-real-ip");
}

export async function isPaddleWebhookIp(
  ip: string | null,
): Promise<{ allowed: boolean; reason: string }> {
  if (!ip) return { allowed: false, reason: "no client ip" };
  const cidrs = await getPaddleAllowedCidrs();
  // Empty list = failed to fetch AND no cache — fail open per module docs.
  if (cidrs.length === 0) return { allowed: true, reason: "allowlist unavailable, fail-open" };
  for (const c of cidrs) if (ipInCidr(ip, c)) return { allowed: true, reason: `match ${c}` };
  return { allowed: false, reason: `${ip} not in ${cidrs.length} allowed cidrs` };
}

/** Test hook — resets the in-process cache. */
export function _resetPaddleIpCacheForTests(): void {
  cache = null;
}
