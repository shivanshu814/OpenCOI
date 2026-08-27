/**
 * Single source of truth for every SEO / AEO / GEO surface.
 *
 * Why this file exists: entity consistency is the #1 lever for getting resolved
 * as ONE company by AI engines (docs/02 §5.9). The boilerplate, tagline, price
 * band and URL must be byte-identical on the site, in JSON-LD, in `llms.txt`,
 * in OG tags and on every directory profile. Anything that repeats lives here
 * exactly once, so it can never drift between two of those places again.
 *
 * Copy in this file is verbatim from docs/02-BRANDING_SEO.md §2 and obeys the
 * claims-staging table in docs/01 §0 (no SMS-as-live, no guarantees, no
 * automatic mid-term cancellation detection).
 */

import { MARKETING_ORIGIN } from "@/lib/hosts";

/**
 * Canonical marketing origin — what goes in `<link rel=canonical>`, sitemaps,
 * JSON-LD `url` and OG tags.
 *
 * Defaults to the live custom domain rather than `appBaseUrl()` on purpose:
 * `appBaseUrl()` resolves to the per-deployment `*.vercel.app` host on preview
 * builds, and a canonical pointing at a preview URL tells Google the preview is
 * the real page. `NEXT_PUBLIC_SITE_URL` exists for the day the domain changes.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
  MARKETING_ORIGIN
).replace(/\/+$/, "");

/** Absolute URL for a site-relative path. Always use this — never template a
 *  string, or a missing slash silently becomes a different canonical. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const ORG = {
  name: "CertShield",
  legalName: "CertShield",
  tagline: "Never work with an uninsured vendor again.",
  taglineAlt: "Vendor insurance compliance on autopilot.",
  oneLiner:
    "CertShield reads vendor insurance certificates with AI, flags expired or insufficient coverage, and chases renewals automatically — so the liability never lands on you.",
  /** v0 boilerplate, docs/02 §2 — use verbatim everywhere until W3–W4 claims open up. */
  boilerplate:
    "CertShield is vendor insurance compliance software for US property managers and contractors. Its AI reads certificates of insurance (ACORD forms), verifies coverage limits, additional-insured endorsements, and expiration dates against each company's requirements, then automatically chases vendors and their insurance agents for renewals by email (English and Spanish). Every verdict is human-reviewed before publishing, with audit-ready document trails. CertShield replaces spreadsheet-based COI tracking at SMB pricing, from $99/month. Founded in 2026.",
  foundingDate: "2026",
  /** Entity signal for answer engines — ties the Organization to the person
   *  answering on Reddit/LinkedIn under the same name (docs/02 §5.7, §5.9). */
  founder: "Shivanshu Pathak",
  email: "hello@getcertshield.app",
  areaServed: "US",
  priceLow: 99,
  priceHigh: 499,
  logoPath: "/logo.svg",
} as const;

/**
 * Google Calendar appointment schedule — the "Free COI Audit — Review Call
 * (15 min)" booking page.
 *
 * Lives here for the same reason every other URL does: it appears in more than
 * one place over time (free-audit CTA, nurture emails, email signature), and a
 * hand-templated scheduling URL is exactly the kind of string that drifts.
 *
 * Deliberately NOT Google's `scheduling-button-script.js` or their iframe
 * embed. The button script is a third-party synchronous script on whatever page
 * carries it, which is the same weight problem the 2026-08-01 marketing JS diet
 * just removed; the iframe is a 600px unstylable frame that can become the LCP
 * element and cannot be made to look like the rest of the site. A plain link to
 * the same URL loses nothing — Google's booking page opens either way.
 *
 * Override exists so a move to Cal.com (docs/03 lists it in the tool stack)
 * is one env var, not a code change.
 */
export const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL?.trim() ||
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ3IDjLYNa11JcAk4gLMCgmbkRj7VR3LPrZej9gsSX4NpYGnEyRZqlsth35k-YDQT7xW9ztIVd5x?gv=true";

/**
 * `sameAs` for the Organization entity.
 *
 * Only profiles that actually exist. Instagram `@certshieldhq` went live
 * 2026-08-27 and is listed. docs/02 §1 also reserves LinkedIn
 * `/company/certshield`, X `@certshieldhq` and YouTube `@certshield` — none of
 * those three exists yet (checked: all 404). Listing dead profiles is worse
 * than listing none — it splits the entity instead of consolidating it. Add
 * each URL here the day the profile goes live, and it flows into JSON-LD
 * everywhere automatically.
 */
export const SAME_AS: readonly string[] = [
  // Live 2026-08-01 (post_id 1212021).
  "https://www.producthunt.com/products/certshield",
  // Live earlier; profile links back to the site.
  "https://www.indiehackers.com/product/certshield",
  // Live 2026-08-01 (project id 4121819). Profile link only — achievement
  // badges are earn-gated on SourceForge and none are earned yet, so no
  // badge appears in the footer (fake social proof would undercut the
  // "honest about limits" positioning).
  "https://sourceforge.net/projects/certshield/",
  // Live 2026-08-01. Footer badge removed 2026-08-27; the profile and this
  // entity assertion stay.
  "https://www.saashub.com/certshield",
  // Live 2026-08-27 — the first real social profile. docs/02 §1 reserved
  // LinkedIn /company/certshield, X @certshieldhq and YouTube @certshield;
  // Instagram @certshieldhq is the one that actually exists, so it is the one
  // listed. Add the others the day each goes live, per the §7 rule.
  "https://www.instagram.com/certshieldhq/",
];

/** Search-engine verification tokens. Empty string = tag omitted (docs/02 §5.8). */
export const VERIFICATION = {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || undefined,
  bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim() || undefined,
  // LaunchZone domain-ownership token. Not sensitive (it's meant to appear
  // publicly in HTML meta), so hardcoded rather than pushed through env —
  // one less thing to keep in sync across Vercel envs for a one-time verify.
  launchzone: "6f37792c732227cbbf52c4333e90296c",
} as const;

/**
 * The disclaimer that has to ride along with anything verdict-shaped
 * (docs/01 non-negotiable rule 2). Marketing pages get it via `MarketingShell`;
 * this export is for structured data and feeds, which the shell never touches.
 */
export const DISCLAIMER_TEXT =
  "Document review assistance — not legal, insurance, or professional advice.";
