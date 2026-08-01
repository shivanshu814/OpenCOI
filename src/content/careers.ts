/**
 * Open roles — one list, consumed by the careers page AND the sitemap.
 *
 * Lives here rather than inside `app/careers/page.tsx` because the sitemap
 * must know every role page too: Ahrefs' 2026-08-01 crawl flagged
 * `/careers/sales` as "indexable page not in sitemap" — the page existed only
 * inside the component, where nothing else could see it. A role added to this
 * list ships in the sitemap on the same commit, so the gap cannot reopen.
 */

export type Role = {
  slug: string;
  title: string;
  location: string;
  comp: string;
  href: string;
};

export const ROLES: readonly Role[] = [
  {
    slug: "sales",
    title: "Sales — outbound to US property managers",
    location: "Remote (US-friendly hours preferred)",
    comp: "Commission-only, uncapped",
    href: "/careers/sales",
  },
] as const;
