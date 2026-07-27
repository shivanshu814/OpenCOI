import type { LiveTable } from "@/lib/live/tables";

/**
 * The allowlist for client-side persistence.
 *
 * Every panel that caches to IndexedDB names a policy from this file instead
 * of passing its own TTL and options. That is deliberate: caching decisions in
 * this product are safety decisions, and safety decisions scattered across
 * twelve components cannot be reviewed. Here they fit on one screen.
 *
 * What must NEVER get a policy:
 * - anything carrying a compliance verdict (checks, documents, reports,
 *   extractions). A cached PASS repainted after the coverage lapsed is the
 *   precise harm this product exists to prevent, and no TTL makes it safe.
 * - secret material: raw API keys, webhook signing secrets, portal tokens,
 *   encrypted TINs. Realtime excludes the same tables (migration 024).
 *
 * `persist` exists for the in-between case — a response that is fine to hold
 * in memory but should not be written to a disk that outlives the session.
 */

export type CacheTier =
  /** Public, effectively static. Same bytes for every customer. */
  | "reference"
  /** Org configuration. Changes rarely, corrected by Realtime within ms. */
  | "config"
  /** Org working data. Changes often; short TTL, always revalidated. */
  | "operational";

export type CachePolicy<T = unknown> = {
  /** Stable cache key. An `id` passed at the call site is appended. */
  key: string;
  tier: CacheTier;
  /** Cached copy older than this is ignored for first paint. */
  maxAgeMs: number;
  /** Realtime tables that make the cached copy wrong. */
  tables: readonly LiveTable[] | null;
  /**
   * `org` namespaces per workspace so two accounts on one browser can never
   * see each other's copy. `public` is for data that is identical for
   * everyone and therefore carries no tenant boundary.
   */
  scope: "org" | "public";
  /**
   * Top-level fields blanked to `null` before the copy is written to disk.
   * The in-memory value is always the full response; only the persisted copy
   * is trimmed. Declarative on purpose — a data-only rule can be asserted in
   * a test, where a projection function could quietly stop dropping a field.
   */
  persistDrops?: readonly (keyof T & string)[];
};

/**
 * Structural constraint for the registry below. `persist` is deliberately
 * loose here and checked precisely on the individual policy that declares it
 * — a single generic cannot describe every entry's payload at once.
 */
type RegisteredPolicy = {
  key: string;
  tier: CacheTier;
  maxAgeMs: number;
  tables: readonly LiveTable[] | null;
  scope: "org" | "public";
  persistDrops?: readonly string[];
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Narrow view of the vendor onboarding response — only the dropped field. */
type OnboardingLike = { tax: unknown };

export const CACHE_POLICIES = {
  /** US states for every address picker. Fires on each address-form mount. */
  geoStates: {
    key: "geo-states",
    tier: "reference",
    maxAgeMs: 7 * DAY,
    tables: null,
    scope: "public",
  },

  /** Workspace settings: profile, branding, notifications, members, invites. */
  orgSettings: {
    key: "org-settings",
    tier: "config",
    maxAgeMs: 10 * MINUTE,
    tables: ["orgs", "org_members", "org_invites"],
    scope: "org",
  },

  /** G1 per-property grants shown alongside the member list. */
  propertyAccess: {
    key: "property-access",
    tier: "config",
    maxAgeMs: 10 * MINUTE,
    tables: ["properties", "org_members"],
    scope: "org",
  },

  /** API key metadata (prefix only — the raw key is never in this response). */
  integrations: {
    key: "integrations",
    tier: "config",
    maxAgeMs: 10 * MINUTE,
    tables: null,
    scope: "org",
  },

  /** The org's uploaded agreement PDF: name and upload time, never bytes. */
  agreementTemplate: {
    key: "agreement-template",
    tier: "config",
    maxAgeMs: 10 * MINUTE,
    tables: ["orgs"],
    scope: "org",
  },

  /**
   * Vendor onboarding documents. Licences and agreements persist; the tax
   * block does not. It carries `tin_last4` — already masked and low
   * severity, but a tax identifier written to a disk that outlives the
   * session is not a call to make for a convenience feature. It arrives on
   * the revalidate a moment later.
   */
  vendorOnboarding: {
    key: "vendor-onboarding",
    tier: "operational",
    maxAgeMs: 5 * MINUTE,
    tables: ["vendor_licenses", "vendor_agreements"],
    scope: "org",
    persistDrops: ["tax"],
  } satisfies CachePolicy<OnboardingLike>,
} as const satisfies Record<string, RegisteredPolicy>;

export type CachePolicyName = keyof typeof CACHE_POLICIES;

/** Ceilings per tier — a policy may be tighter, never looser. */
export const TIER_MAX_AGE: Record<CacheTier, number> = {
  reference: 30 * DAY,
  config: 60 * MINUTE,
  operational: 15 * MINUTE,
};
