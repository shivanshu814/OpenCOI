/**
 * Shared plumbing for every script in `scripts/seo/`.
 *
 * One rule holds this directory together: **a missing credential is a skip,
 * never a crash.** Most of the services below are free-tier or trial and will
 * not be wired on day one; a toolkit that dies on the first absent key is a
 * toolkit nobody runs weekly. Each script prints what it skipped and why, so
 * the gap is visible without being fatal.
 *
 * Everything writes into `scripts/seo/out/` (git-ignored) so runs can be
 * diffed week over week — that diff, not any single run, is the signal.
 */

import { loadEnvConfig } from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Load `.env.local` before anything below reads `process.env`.
 *
 * `tsx` does not do this — only `next dev`/`next build` do — so without this
 * line every key in `.env.local` would read as unset and every script would
 * report "skipped, no credential" while sitting right next to the credential.
 *
 * `@next/env` rather than bare `dotenv` because it applies Next's own file
 * precedence (`.env.local` over `.env`, etc.), so a script and the app never
 * disagree about which value is live. It ships with `next`; no new dependency.
 *
 * Must run before the module-level constants below — they are evaluated at
 * import time, and `SITE` reads `SEO_SITE_URL`.
 */
loadEnvConfig(path.join(import.meta.dirname, "..", ".."), true, {
  info: () => {},
  error: console.error,
});

/** Canonical marketing origin. Mirrors `src/lib/hosts.ts` — keep in step. */
export const SITE =
  process.env.SEO_SITE_URL?.trim().replace(/\/+$/, "") ||
  "https://www.getcertshield.app";

export const OUT_DIR = path.join(import.meta.dirname, "out");

/**
 * The keyword map, verbatim from docs/02-BRANDING_SEO.md §4.
 *
 * `page` is the URL that is *supposed* to rank for the term. Rank tracking
 * compares the URL Google actually returns against this: a term ranking with
 * the wrong page is a cannibalisation bug, and it is invisible if you only
 * track positions.
 */
export type Keyword = {
  term: string;
  stage: "BOFU" | "MOFU" | "TOFU";
  page: string;
};

export const KEYWORDS: readonly Keyword[] = [
  // BOFU — money keywords
  { term: "coi tracking software", stage: "BOFU", page: "/" },
  { term: "certificate of insurance tracking software", stage: "BOFU", page: "/" },
  { term: "coi compliance software", stage: "BOFU", page: "/" },
  { term: "coi management software", stage: "BOFU", page: "/" },
  { term: "vendor insurance tracking software", stage: "BOFU", page: "/" },
  { term: "vendor insurance verification software", stage: "BOFU", page: "/" },
  { term: "subcontractor insurance tracking", stage: "BOFU", page: "/subcontractor-insurance-tracking" },
  { term: "coi tracking for property managers", stage: "BOFU", page: "/coi-tracking-for-property-managers" },
  // Slugs match `src/content/comparisons.ts` exactly — the crawler compares
  // these against live URLs, so a guessed slug reports a false "page missing".
  { term: "mycoi alternative", stage: "BOFU", page: "/compare/mycoi-alternative" },
  { term: "trustlayer alternative", stage: "BOFU", page: "/compare/trustlayer-alternative" },
  { term: "jones alternative", stage: "BOFU", page: "/compare/jones-alternative" },
  // MOFU — lead magnets & how-tos
  { term: "coi tracking spreadsheet template", stage: "MOFU", page: "/blog/coi-tracking-spreadsheet-template" },
  { term: "how to track vendor insurance certificates", stage: "MOFU", page: "/blog" },
  { term: "what to check on a certificate of insurance", stage: "MOFU", page: "/blog" },
  { term: "vendor insurance requirements by trade", stage: "MOFU", page: "/vendor-insurance-requirements" },
  // TOFU — definitional, the AI-citation surface
  { term: "what is a certificate of insurance", stage: "TOFU", page: "/glossary" },
  { term: "acord 25 form", stage: "TOFU", page: "/glossary" },
  { term: "additional insured vs certificate holder", stage: "TOFU", page: "/glossary" },
  { term: "cg 20 10 vs cg 20 37", stage: "TOFU", page: "/glossary" },
  { term: "waiver of subrogation meaning", stage: "TOFU", page: "/glossary" },
  { term: "primary and noncontributory meaning", stage: "TOFU", page: "/glossary" },
];

/**
 * The answer-engine citation surface, docs/02 §5.5.
 *
 * These are the pages ChatGPT / Perplexity / AI Overviews actually quote when
 * someone asks "best COI tracking software" — not our own site. Each is a free
 * profile. `url` is where the CertShield listing WILL live; `backlinks.ts`
 * polls them and reports which are still 404, i.e. still to be claimed.
 */
export type CitationTarget = {
  name: string;
  url: string;
  kind: "directory" | "listicle" | "social" | "community" | "code";
  /** Why this one is worth the 20 minutes — keeps the list from growing junk. */
  why: string;
};

export const CITATION_TARGETS: readonly CitationTarget[] = [
  { name: "G2", url: "https://www.g2.com/products/certshield/reviews", kind: "listicle", why: "The #1 source AI engines quote for 'best X software'. Free vendor profile." },
  { name: "Capterra", url: "https://www.capterra.com/p/certshield/", kind: "listicle", why: "Gartner-owned; feeds Software Advice + GetApp from one submission." },
  { name: "GetApp", url: "https://www.getapp.com/p/certshield/", kind: "listicle", why: "Same Gartner network as Capterra — one form, three listings." },
  { name: "Software Advice", url: "https://www.softwareadvice.com/p/certshield/", kind: "listicle", why: "Third Gartner surface; ranks for long-tail 'COI software' queries." },
  { name: "SaaSHub", url: "https://www.saashub.com/certshield", kind: "directory", why: "Free, instant, and heavily scraped for 'alternative to' answers." },
  { name: "AlternativeTo", url: "https://alternativeto.net/software/certshield/", kind: "directory", why: "Owns the 'myCOI alternative' / 'TrustLayer alternative' SERPs." },
  { name: "Product Hunt", url: "https://www.producthunt.com/products/certshield", kind: "listicle", why: "docs/05 launch surface; the dofollow link + entity signal outlast the upvotes." },
  { name: "Crunchbase", url: "https://www.crunchbase.com/organization/certshield", kind: "directory", why: "Entity resolution — the record AI engines use to decide who the company IS." },
  { name: "LinkedIn company", url: "https://www.linkedin.com/company/certshield", kind: "social", why: "docs/02 §1 reserves this handle. Feeds `sameAs` in JSON-LD once live." },
  { name: "X / Twitter", url: "https://x.com/certshieldhq", kind: "social", why: "Reserved handle; goes into `sameAs` the day it exists." },
  { name: "Slashdot / SourceForge", url: "https://sourceforge.net/software/product/CertShield/", kind: "directory", why: "Free B2B listing, unusually strong domain, ranks for comparison terms." },
  { name: "Indie Hackers", url: "https://www.indiehackers.com/product/certshield", kind: "community", why: "Free product page + founder story; Reddit-adjacent weighting in AI answers." },
  { name: "BetaList", url: "https://betalist.com/startups/certshield", kind: "directory", why: "Free early-stage listing; cheap real backlink before Product Hunt." },
  { name: "Stackshare", url: "https://stackshare.io/certshield", kind: "code", why: "Tech-stack entity page; free and links back." },
  { name: "F6S", url: "https://www.f6s.com/company/certshield", kind: "directory", why: "Free startup profile, indexed fast, feeds founder/company entity graph." },
];

/** Every marketing URL we expect to be indexable, read from the live sitemap. */
export async function sitemapUrls(site = SITE): Promise<string[]> {
  const res = await fetch(`${site}/sitemap.xml`, {
    headers: { "user-agent": "CertShield-SEO-Toolkit" },
  });
  if (!res.ok) {
    throw new Error(
      `${site}/sitemap.xml answered ${res.status}. ` +
        `If this is 404 the SEO layer is not deployed — that blocks every other check.`,
    );
  }
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (locs.length === 0) throw new Error("sitemap.xml parsed to zero URLs");

  // Re-host every entry onto the origin we are actually auditing.
  //
  // `sitemap.ts` builds absolute URLs from the canonical production origin, by
  // design — a sitemap that advertised `localhost` would be worthless. But that
  // means a run against a dev server or a preview deploy would fetch the
  // sitemap locally and then crawl *production*, silently reporting the wrong
  // site's health as if it were the local build's.
  return locs.map((loc) => {
    try {
      return `${site}${new URL(loc).pathname}`.replace(/\/$/, "") || site;
    } catch {
      return loc;
    }
  });
}

/** Write a report into `out/`, creating the directory on first use. */
export async function writeReport(name: string, body: string): Promise<string> {
  await mkdir(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, name);
  await writeFile(file, body, "utf8");
  return file;
}

/** Read an env var, or announce the skip and return null. Never throws. */
export function optionalEnv(key: string, hint: string): string | null {
  const value = process.env[key]?.trim();
  if (value) return value;
  console.log(`  ⊘ skipped — ${key} not set. ${hint}`);
  return null;
}

/** Bounded-concurrency map. Free-tier APIs rate-limit hard; 4 is polite. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await fn(items[index], index);
      }
    }),
  );
  return results;
}

/** `2026-07-31` — report filenames and front-matter. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function pct(n: number, total: number): string {
  return total === 0 ? "—" : `${Math.round((n / total) * 100)}%`;
}
