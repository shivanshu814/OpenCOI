/**
 * Technical SEO crawl + on-page audit — the free stand-in for Screaming Frog.
 *
 * Screaming Frog's free tier caps at 500 URLs and, more importantly, has no
 * CLI without a paid licence — so it can never run in CI or on a schedule.
 * This does the checks that actually matter for a 20-page marketing site and
 * exits non-zero on anything that would cost us an impression, which means it
 * can gate a deploy.
 *
 * Run:  npm run seo:crawl                      # against production
 *       SEO_SITE_URL=http://localhost:3000 npm run seo:crawl
 *
 * It seeds from `/sitemap.xml`, then follows internal links one hop past the
 * sitemap so it also catches (a) linked pages that were never added to the
 * sitemap and (b) internal links pointing at a 404.
 */

// Extensionless: `tsconfig.json` does not set `allowImportingTsExtensions`, and
// `next build` type-checks this directory, so a ".ts" suffix here fails the build.
import {
  KEYWORDS,
  SITE,
  mapLimit,
  sitemapUrls,
  today,
  writeReport,
} from "./lib";

type PageAudit = {
  url: string;
  status: number;
  redirectedTo?: string;
  title?: string;
  description?: string;
  canonical?: string;
  h1s: string[];
  ogTitle?: string;
  ogImage?: string;
  jsonLdTypes: string[];
  jsonLdInvalid: number;
  wordCount: number;
  imagesMissingAlt: number;
  noindex: boolean;
  /** False for `/llms.txt`, `/blog/rss.xml` and friends — reachable and correct,
   *  but they have no title or canonical to be missing, so counting them as
   *  defects would put a permanent floor of "2 missing titles" on every run. */
  isHtml: boolean;
  internalLinks: string[];
  errors: string[];
  warnings: string[];
};

const UA = "CertShield-SEO-Toolkit (+https://www.getcertshield.app)";

/** The origin every canonical is supposed to name, whatever we are crawling. */
const CANONICAL_ORIGIN = "https://www.getcertshield.app";
/** True when the crawl target IS production, i.e. canonicals should be self-referencing. */
const AUDITING_CANONICAL_ORIGIN = SITE === CANONICAL_ORIGIN;

/** Title/description bands Google actually truncates at, in characters. */
const TITLE_MIN = 25;
const TITLE_MAX = 65;
const DESC_MIN = 70;
const DESC_MAX = 165;
/** Below this a page reads as thin to a crawler and rarely ranks for anything. */
const THIN_CONTENT_WORDS = 250;

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return m?.[1];
}

function metaContent(html: string, matcher: RegExp): string | undefined {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (matcher.test(tag)) return attr(tag, "content");
  }
  return undefined;
}

/** Strip everything a reader would never see, then count words. */
function visibleWordCount(html: string): number {
  const body = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ");
  return body.split(/\s+/).filter((w) => w.length > 1).length;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .trim();
}

async function auditPage(url: string): Promise<PageAudit> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let res: Response;
  try {
    res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  } catch (cause) {
    return {
      url, status: 0, h1s: [], jsonLdTypes: [], jsonLdInvalid: 0, wordCount: 0,
      imagesMissingAlt: 0, noindex: false, internalLinks: [], isHtml: false,
      errors: [`fetch failed: ${(cause as Error).message}`], warnings: [],
    };
  }

  const redirectedTo = res.url !== url ? res.url : undefined;
  const audit: PageAudit = {
    url, status: res.status, redirectedTo, h1s: [], jsonLdTypes: [],
    jsonLdInvalid: 0, wordCount: 0, imagesMissingAlt: 0, noindex: false,
    isHtml: false, internalLinks: [], errors, warnings,
  };

  if (res.status >= 400) {
    errors.push(`HTTP ${res.status}`);
    return audit;
  }
  if (redirectedTo) {
    // A sitemap that lists a redirecting URL wastes crawl budget on every
    // recrawl and splits any link equity the old URL earned.
    warnings.push(`redirects to ${redirectedTo}`);
  }
  if (!res.headers.get("content-type")?.includes("text/html")) return audit;
  audit.isHtml = true;

  const html = await res.text();

  // ── Title ─────────────────────────────────────────────────────────────
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  audit.title = titleTag ? decode(titleTag) : undefined;
  if (!audit.title) errors.push("no <title>");
  else if (audit.title.length < TITLE_MIN) warnings.push(`title short (${audit.title.length} chars)`);
  else if (audit.title.length > TITLE_MAX) warnings.push(`title truncates in SERP (${audit.title.length} chars)`);

  // ── Meta description ──────────────────────────────────────────────────
  const desc = metaContent(html, /name\s*=\s*["']description["']/i);
  audit.description = desc ? decode(desc) : undefined;
  if (!audit.description) errors.push("no meta description");
  else if (audit.description.length < DESC_MIN) warnings.push(`description short (${audit.description.length} chars)`);
  else if (audit.description.length > DESC_MAX) warnings.push(`description truncates (${audit.description.length} chars)`);

  // ── Canonical ─────────────────────────────────────────────────────────
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    if (/rel\s*=\s*["']canonical["']/i.test(tag)) audit.canonical = attr(tag, "href");
  }
  if (!audit.canonical) {
    errors.push("no rel=canonical");
  } else if (AUDITING_CANONICAL_ORIGIN) {
    // These two checks are only meaningful when the origin under audit IS the
    // canonical one. Against localhost or a preview deploy, every canonical
    // correctly points at production — flagging that would turn a healthy
    // local run into 30 red lines and train us to ignore the crawler.
    if (!audit.canonical.startsWith(SITE)) {
      // The classic preview-deploy leak: a canonical pointing at a
      // *.vercel.app host tells Google the preview is the real page.
      errors.push(`canonical off-origin: ${audit.canonical}`);
    }
    const self = (redirectedTo ?? url).replace(/\/$/, "");
    if (audit.canonical.replace(/\/$/, "") !== self && self !== SITE) {
      warnings.push(`canonical points elsewhere: ${audit.canonical}`);
    }
  } else if (!audit.canonical.startsWith(CANONICAL_ORIGIN)) {
    // Still worth one check off-origin: the canonical must at least name the
    // production host. A canonical pointing at the preview URL itself is the
    // bug this whole section exists to catch.
    errors.push(`canonical is neither ${CANONICAL_ORIGIN} nor a valid production URL: ${audit.canonical}`);
  }

  // ── Headings ──────────────────────────────────────────────────────────
  audit.h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => decode(m[1].replace(/<[^>]+>/g, " ")))
    .filter(Boolean);
  if (audit.h1s.length === 0) errors.push("no <h1>");
  else if (audit.h1s.length > 1) warnings.push(`${audit.h1s.length} <h1> tags`);

  // ── Robots meta ───────────────────────────────────────────────────────
  const robotsMeta = metaContent(html, /name\s*=\s*["']robots["']/i) ?? "";
  audit.noindex = /noindex/i.test(robotsMeta);
  if (audit.noindex) errors.push("meta robots noindex — this page cannot rank");

  // ── Social cards ──────────────────────────────────────────────────────
  audit.ogTitle = metaContent(html, /property\s*=\s*["']og:title["']/i);
  audit.ogImage = metaContent(html, /property\s*=\s*["']og:image["']/i);
  if (!audit.ogTitle) warnings.push("no og:title");
  if (!audit.ogImage) warnings.push("no og:image");

  // ── Structured data ───────────────────────────────────────────────────
  for (const m of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(m[1]);
      const nodes = parsed["@graph"] ?? (Array.isArray(parsed) ? parsed : [parsed]);
      for (const node of nodes) if (node?.["@type"]) audit.jsonLdTypes.push(String(node["@type"]));
    } catch {
      // Invalid JSON-LD is worse than none: Google drops the whole block, so
      // a typo silently removes every rich result on the page.
      audit.jsonLdInvalid++;
    }
  }
  if (audit.jsonLdInvalid > 0) errors.push(`${audit.jsonLdInvalid} unparseable JSON-LD block(s)`);
  if (audit.jsonLdTypes.length === 0) warnings.push("no JSON-LD");

  // ── Content depth ─────────────────────────────────────────────────────
  audit.wordCount = visibleWordCount(html);
  if (audit.wordCount < THIN_CONTENT_WORDS) warnings.push(`thin content (${audit.wordCount} words)`);

  // ── Images ────────────────────────────────────────────────────────────
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    if (attr(tag, "alt") === undefined) audit.imagesMissingAlt++;
  }
  if (audit.imagesMissingAlt > 0) warnings.push(`${audit.imagesMissingAlt} <img> without alt`);

  // ── Internal links ────────────────────────────────────────────────────
  const seen = new Set<string>();
  for (const [tag] of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attr(tag, "href");
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) continue;
    let abs: string;
    try {
      abs = new URL(href, redirectedTo ?? url).toString();
    } catch {
      continue;
    }
    if (!abs.startsWith(SITE)) continue;
    seen.add(abs.split("#")[0]);
  }
  audit.internalLinks = [...seen];

  return audit;
}

async function main() {
  console.log(`\n🕷  Crawling ${SITE}\n`);

  const seeds = await sitemapUrls();
  console.log(`   ${seeds.length} URLs in sitemap.xml`);

  const first = await mapLimit(seeds, 4, auditPage);

  // One hop past the sitemap: anything linked but unlisted, and any internal
  // link that 404s. Both are invisible to a sitemap-only crawl.
  const known = new Set(seeds.map((u) => u.replace(/\/$/, "")));
  const discovered = [
    ...new Set(
      first
        .flatMap((p) => p.internalLinks)
        .map((u) => u.replace(/\/$/, ""))
        .filter((u) => !known.has(u))
        // Auth + token surfaces are deliberately out of the sitemap
        // (see src/app/sitemap.ts) — not finding them there is correct.
        .filter((u) => !/\/(app|login|api|portal|confirm|sign|auth)(\/|$)/.test(u.replace(SITE, ""))),
    ),
  ];

  const extra = discovered.length ? await mapLimit(discovered, 4, auditPage) : [];
  if (discovered.length) console.log(`   ${discovered.length} more URLs found via internal links`);

  const pages = [...first, ...extra];

  // ── Site-wide duplicate detection ───────────────────────────────────────
  const byTitle = new Map<string, string[]>();
  const byDesc = new Map<string, string[]>();
  for (const p of pages) {
    if (p.status !== 200) continue;
    if (p.title) byTitle.set(p.title, [...(byTitle.get(p.title) ?? []), p.url]);
    if (p.description) byDesc.set(p.description, [...(byDesc.get(p.description) ?? []), p.url]);
  }
  const dupTitles = [...byTitle.entries()].filter(([, u]) => u.length > 1);
  const dupDescs = [...byDesc.entries()].filter(([, u]) => u.length > 1);

  // ── Orphans: in the sitemap but linked from nothing ─────────────────────
  const linkedTo = new Set(pages.flatMap((p) => p.internalLinks).map((u) => u.replace(/\/$/, "")));
  const orphans = seeds
    .map((u) => u.replace(/\/$/, ""))
    .filter((u) => u !== SITE && !linkedTo.has(u));

  // ── Keyword-map coverage: does every target page exist and answer 200? ──
  const okUrls = new Set(pages.filter((p) => p.status === 200).map((p) => p.url.replace(/\/$/, "")));
  const missingTargets = [...new Set(KEYWORDS.map((k) => k.page))]
    .map((p) => `${SITE}${p}`.replace(/\/$/, ""))
    .filter((u) => !okUrls.has(u));

  // ── Report ──────────────────────────────────────────────────────────────
  const errCount = pages.reduce((n, p) => n + p.errors.length, 0);
  const warnCount = pages.reduce((n, p) => n + p.warnings.length, 0);
  // Only HTML pages can be missing a title, description, canonical or H1.
  // `/llms.txt` and `/blog/rss.xml` are reachable, correct, and have none of
  // those by definition — counting them would put a permanent floor under
  // every "missing" number and make a clean run look broken.
  const htmlPages = pages.filter((p) => p.status === 200 && p.isHtml);

  const lines: string[] = [
    `# SEO crawl — ${SITE}`,
    ``,
    `_${today()} · ${pages.length} URLs · ${errCount} errors · ${warnCount} warnings_`,
    ``,
    `## Summary`,
    ``,
    `| Check | Result |`,
    `| --- | --- |`,
    `| URLs crawled | ${pages.length} (${seeds.length} from sitemap, ${extra.length} discovered, ${htmlPages.length} HTML) |`,
    `| Non-200 | ${pages.filter((p) => p.status !== 200).length} |`,
    `| Missing title | ${htmlPages.filter((p) => !p.title).length} |`,
    `| Missing description | ${htmlPages.filter((p) => !p.description).length} |`,
    `| Missing canonical | ${htmlPages.filter((p) => !p.canonical).length} |`,
    `| Missing/multiple H1 | ${htmlPages.filter((p) => p.h1s.length !== 1).length} |`,
    `| No JSON-LD | ${htmlPages.filter((p) => p.jsonLdTypes.length === 0).length} |`,
    `| noindex | ${pages.filter((p) => p.noindex).length} |`,
    `| Duplicate titles | ${dupTitles.length} |`,
    `| Duplicate descriptions | ${dupDescs.length} |`,
    `| Orphan pages | ${orphans.length} |`,
    `| Keyword targets missing | ${missingTargets.length} |`,
    ``,
  ];

  if (missingTargets.length) {
    lines.push(`## Keyword targets with no live page`, ``,
      `docs/02 §4 names these as ranking targets; a term with no page cannot rank.`, ``);
    for (const u of missingTargets) lines.push(`- ${u}`);
    lines.push(``);
  }
  if (dupTitles.length) {
    lines.push(`## Duplicate titles`, ``);
    for (const [t, urls] of dupTitles) lines.push(`- \`${t}\`\n${urls.map((u) => `  - ${u}`).join("\n")}`);
    lines.push(``);
  }
  if (dupDescs.length) {
    lines.push(`## Duplicate descriptions`, ``);
    for (const [d, urls] of dupDescs) lines.push(`- \`${d.slice(0, 70)}…\`\n${urls.map((u) => `  - ${u}`).join("\n")}`);
    lines.push(``);
  }
  if (orphans.length) {
    lines.push(`## Orphans (in sitemap, linked from no crawled page)`, ``);
    for (const u of orphans) lines.push(`- ${u}`);
    lines.push(``);
  }

  lines.push(`## Per page`, ``);
  for (const p of [...pages].sort((a, b) => b.errors.length - a.errors.length)) {
    const flag = p.errors.length ? "❌" : p.warnings.length ? "⚠️ " : "✅";
    lines.push(`### ${flag} ${p.url.replace(SITE, "") || "/"}`, ``);
    lines.push(
      `- status \`${p.status}\` · ${p.wordCount} words · JSON-LD: ${p.jsonLdTypes.join(", ") || "none"}`,
    );
    lines.push(`- title: ${p.title ? `\`${p.title}\` (${p.title.length})` : "**missing**"}`);
    lines.push(`- desc: ${p.description ? `\`${p.description.slice(0, 90)}…\` (${p.description.length})` : "**missing**"}`);
    for (const e of p.errors) lines.push(`- ❌ ${e}`);
    for (const w of p.warnings) lines.push(`- ⚠️ ${w}`);
    lines.push(``);
  }

  const file = await writeReport(`crawl-${today()}.md`, lines.join("\n"));

  console.log(`\n   ${errCount} errors · ${warnCount} warnings`);
  console.log(`   report → ${file}\n`);

  for (const p of pages) {
    for (const e of p.errors) console.log(`   ❌ ${p.url.replace(SITE, "") || "/"} — ${e}`);
  }

  // Non-zero on errors only. Warnings are for the report, not the gate — a
  // 58-character title should never block a deploy.
  if (errCount > 0 || missingTargets.length > 0) process.exitCode = 1;
}

// Top-level await is unavailable: package.json has no "type": "module", so tsx
// transforms these to CJS. `void` marks the floating promise as deliberate.
void main();
