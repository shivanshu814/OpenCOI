/**
 * Canonical public app URL (portal, chase, agent-confirm and e-sign links).
 *
 * These URLs are PERSISTED and EMAILED to vendors, so they have to point at a
 * hostname that still resolves weeks later. That rules out `VERCEL_URL`: it is
 * the per-DEPLOYMENT hostname (`web-abc123-team.vercel.app`), which changes on
 * every push and is gated by Vercel deployment protection — a link minted at
 * build time or on a preview deploy is dead on arrival for the vendor.
 *
 * Precedence, most stable first:
 *   1. NEXT_PUBLIC_APP_URL              — explicitly configured canonical domain
 *   2. VERCEL_PROJECT_PRODUCTION_URL    — stable production alias for the project
 *   3. VERCEL_URL                       — per-deployment host; last resort only
 *   4. hard-coded production fallback
 */

function clean(raw: string | undefined): string | null {
  const trimmed = raw?.trim().replace(/\/+$/, "");
  return trimmed ? trimmed : null;
}

/** Vercel exposes bare hostnames (no scheme); everything we mint is https. */
function withScheme(host: string): string {
  return /^https?:\/\//i.test(host) ? host : `https://${host}`;
}

export function appBaseUrl(): string {
  const explicit = clean(process.env.NEXT_PUBLIC_APP_URL);
  if (explicit) return withScheme(explicit);

  const productionAlias = clean(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (productionAlias) return withScheme(productionAlias);

  const deploymentHost = clean(process.env.VERCEL_URL);
  if (deploymentHost) return withScheme(deploymentHost);

  return "https://getcertshield.vercel.app";
}
