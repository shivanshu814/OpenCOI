/**
 * Host split: marketing lives on the apex/www, the product lives on `app.`.
 *
 * Both hostnames are served by this one Next.js project, so without an explicit
 * rule every route answers on every host — `www.getcertshield.app/app` served
 * the workspace, and the same page existed twice for crawlers. These helpers
 * are the single source of truth for which host owns which path.
 *
 * Deliberately pure and network-free: `proxy.ts` calls this on every matched
 * request BEFORE any Supabase session work, so it must never add latency.
 */

export const APP_ORIGIN = "https://app.getcertshield.app";

/** Canonical marketing origin. Vercel 308s the apex to `www`, so target `www`
 *  directly — pointing at the apex would cost every visitor a second hop. */
export const MARKETING_ORIGIN = "https://www.getcertshield.app";

const APP_HOSTS = new Set(["app.getcertshield.app"]);
const MARKETING_HOSTS = new Set([
  "getcertshield.app",
  "www.getcertshield.app",
]);

/** Product surfaces: only ever served from `app.` */
function isAppPath(path: string): boolean {
  return path === "/login" || path === "/app" || path.startsWith("/app/");
}

/** Marketing surfaces: only ever served from the apex/www. */
function isMarketingPath(path: string): boolean {
  if (path === "/") return true;
  return MARKETING_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

/**
 * Every marketing prefix, mirrored from `lib/seo/routes.ts`.
 *
 * Deliberately duplicated rather than imported: this module runs inside the
 * proxy on every request, and `routes.ts` is a much larger object graph that
 * would be pulled into that bundle for no benefit. The cost of the duplication
 * is that a new marketing page must be added in both places — the symptom of
 * forgetting is that `app.getcertshield.app/new-page` serves a second copy of
 * the page instead of redirecting, i.e. duplicate content for crawlers.
 */
const MARKETING_PREFIXES = [
  "/pricing",
  "/security",
  "/privacy",
  "/terms",
  "/subprocessors",
  "/refund",
  "/help",
  "/about",
  "/free-audit",
  "/blog",
  "/glossary",
  "/compare",
  "/vendor-insurance-requirements",
  "/coi-tracking-for-property-managers",
  "/subcontractor-insurance-tracking",
];

/**
 * Paths that must answer identically on BOTH hosts — moving them would break
 * things we do not control:
 *   /api      — Paddle/Twilio/Postmark webhooks POST to fixed URLs; a 308 would
 *               drop the body on some clients and silently lose events.
 *   /portal   — vendor magic links already minted and emailed; they must keep
 *               resolving on whatever host they were minted with.
 *   /auth     — the OAuth callback origin is allow-listed in Supabase; bouncing
 *               it mid-flow invalidates the code exchange.
 *   /sign, /confirm — same, persisted links sent to vendors and agents.
 */
function isSharedPath(path: string): boolean {
  return ["/api", "/portal", "/auth", "/sign", "/confirm"].some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

/**
 * Returns an absolute URL to redirect to, or null to serve the request here.
 *
 * Unknown hosts (localhost, *.vercel.app preview deploys) return null on
 * purpose: preview URLs are per-deployment and have no `app.` counterpart, so
 * enforcing the split there would make every preview deploy unreachable.
 */
export function hostRedirect(
  host: string | null,
  path: string,
  search: string,
): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();

  if (isSharedPath(path)) return null;

  if (MARKETING_HOSTS.has(hostname) && isAppPath(path)) {
    return `${APP_ORIGIN}${path}${search}`;
  }

  if (APP_HOSTS.has(hostname) && isMarketingPath(path)) {
    return `${MARKETING_ORIGIN}${path}${search}`;
  }

  return null;
}
