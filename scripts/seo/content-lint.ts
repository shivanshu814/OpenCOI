/**
 * Build-time content lint — the pre-deploy half of the SEO gate.
 *
 * `seo:crawl` audits the LIVE site, which means a violation ships before it is
 * caught. This lints the typed content (blog posts + public routes) at CI time,
 * against the bands Google documents and the rules docs/02 makes binding:
 *
 *  - titles 25–65 chars, descriptions 70–165 (Google truncation bands,
 *    same constants as crawl.ts)
 *  - the answer-first block is 40–60 words (docs/02 §5.1 — the type system
 *    forces the field to exist; this forces it to be liftable)
 *  - the primary keyword appears in the title or H1 (Google: "use words
 *    people search for")
 *  - no two posts target the same primary keyword (cannibalisation)
 *  - related links resolve, no post is an orphan, FAQs are real
 *  - no copy promises "guaranteed compliance" (docs/08 §3) or claims
 *    mid-term cancellation detection (docs/01 Module C honesty rule)
 *
 * Run:  npm run seo:content        Exit code 1 on any error, so it gates CI.
 */

// Extensionless imports: `next build` type-checks this directory (see crawl.ts).
import { posts } from "../../src/content/blog";
import type { Block, Post } from "../../src/content/blog/types";
import { PUBLIC_ROUTES } from "../../src/lib/seo/routes";

const TITLE_MIN = 25;
const TITLE_MAX = 65;
const DESC_MIN = 70;
const DESC_MAX = 165;
const ANSWER_MIN_WORDS = 40;
const ANSWER_MAX_WORDS = 60;
/** Below this the post reads as thin to a crawler (crawl.ts uses 250 for the
 *  whole page; the body alone should comfortably clear it). */
const BODY_MIN_WORDS = 350;

const errors: string[] = [];
const warnings: string[] = [];

const err = (slug: string, msg: string) => errors.push(`${slug} — ${msg}`);
const warn = (slug: string, msg: string) => warnings.push(`${slug} — ${msg}`);

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Lowercase, strip punctuation — so "CG 20 10 vs CG 20 37" matches a title. */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Crude stem so "meaning" matches "means" and "endorsements" matches
 *  "endorsement" without pulling in an NLP dependency. */
const stem = (w: string) => w.replace(/(?:ing|ed|es|s)$/, "");

/** Grammar words whose absence never means the keyword is untargeted. */
const STOPWORDS = new Set([
  "a", "an", "the", "of", "to", "for", "on", "in", "and", "or", "vs",
  "what", "is", "how", "do", "i", "my", "your", "should", "much", "have",
]);

/** The one domain synonym worth knowing about: the whole site says "COI" and
 *  "certificate of insurance" interchangeably, because searchers do. */
const COI_WORDS = new Set(["coi", "certificate", "insurance"]);

/**
 * Keyword-targeting check, token level rather than exact phrase — "waiver of
 * subrogation meaning" IS targeted by the title "Waiver of Subrogation — What
 * It Means", and demanding the verbatim phrase would force keyword-stuffed
 * titles, which is exactly what Google's title guidance says not to do.
 * Returns the keyword tokens the target text is missing.
 */
function missingTokens(keyword: string, target: string): string[] {
  const targetWords = [...new Set(normalize(target).split(" ").map(stem))];
  const targetSet = new Set(targetWords);
  const squashed = normalize(target).replace(/ /g, "");
  const hasCoiLanguage = targetWords.some((w) => COI_WORDS.has(w));
  return normalize(keyword)
    .split(" ")
    .filter((token) => {
      if (STOPWORDS.has(token)) return false;
      const t = stem(token);
      if (targetSet.has(t)) return false;
      // Prefix match: "check" is targeted by "checklist", "track" by "tracking".
      if (t.length >= 4 && targetWords.some((w) => w.startsWith(t))) return false;
      // Hyphen collapse: "noncontributory" vs "non-contributory".
      if (token.length > 5 && squashed.includes(token)) return false;
      if (COI_WORDS.has(token) && hasCoiLanguage) return false;
      return true;
    });
}

function blockText(block: Block): string {
  switch (block.kind) {
    case "p":
    case "h2":
    case "h3":
      return block.text;
    case "ul":
    case "ol":
      return block.items.join(" ");
    case "table":
      return [block.head.join(" "), ...block.rows.map((r) => r.join(" "))].join(" ");
    case "callout":
      return `${block.title} ${block.text}`;
    case "cta":
      return block.text;
  }
}

function allCopy(post: Post): string {
  return [
    post.title,
    post.h1,
    post.description,
    post.answer,
    ...post.body.map(blockText),
    ...post.faq.flatMap((f) => [f.q, f.a]),
  ].join("\n");
}

// ---------------------------------------------------------------- posts

const bySlug = new Map(posts.map((p) => [p.slug, p]));
const seen = {
  title: new Map<string, string>(),
  description: new Map<string, string>(),
  h1: new Map<string, string>(),
  primaryKeyword: new Map<string, string>(),
};
const inboundRelated = new Map<string, number>();

const today = new Date().toISOString().slice(0, 10);

for (const post of posts) {
  const s = post.slug;

  // Duplicates across the corpus — two pages competing for one query.
  for (const key of ["title", "description", "h1"] as const) {
    const value = post[key];
    const holder = seen[key].get(value);
    if (holder) err(s, `duplicate ${key} (also on ${holder})`);
    else seen[key].set(value, s);
  }

  // Google truncation bands.
  if (post.title.length < TITLE_MIN || post.title.length > TITLE_MAX)
    err(s, `title is ${post.title.length} chars (band ${TITLE_MIN}–${TITLE_MAX})`);
  if (post.description.length < DESC_MIN || post.description.length > DESC_MAX)
    err(s, `description is ${post.description.length} chars (band ${DESC_MIN}–${DESC_MAX})`);

  // The answer block is the AEO contract (docs/02 §5.1).
  const answerWords = words(post.answer);
  if (answerWords < ANSWER_MIN_WORDS || answerWords > ANSWER_MAX_WORDS)
    err(s, `answer block is ${answerWords} words (must be ${ANSWER_MIN_WORDS}–${ANSWER_MAX_WORDS})`);

  // Keywords: present, lowercase, primary keyword actually targeted on-page.
  if (post.keywords.length < 2) err(s, `only ${post.keywords.length} keyword(s)`);
  for (const kw of post.keywords)
    if (kw !== kw.toLowerCase()) err(s, `keyword not lowercase: "${kw}"`);

  const primary = post.keywords[0];
  if (primary) {
    const holder = seen.primaryKeyword.get(primary);
    if (holder) err(s, `primary keyword "${primary}" also targeted by ${holder}`);
    else seen.primaryKeyword.set(primary, s);

    const missing = missingTokens(primary, `${post.title} ${post.h1}`);
    if (missing.length > 1)
      err(s, `primary keyword "${primary}" barely targeted — title+H1 missing: ${missing.join(", ")}`);
    else if (missing.length === 1)
      warn(s, `primary keyword token "${missing[0]}" absent from title and H1`);
    const descMissing = missingTokens(primary, post.description);
    if (descMissing.length)
      warn(s, `meta description missing keyword token(s): ${descMissing.join(", ")}`);
  }

  // FAQ — becomes FAQPage JSON-LD; docs/02 §5.2 wants 4–6 real pairs.
  if (post.faq.length < 3) err(s, `only ${post.faq.length} FAQ pair(s) (min 3)`);
  else if (post.faq.length < 4 || post.faq.length > 6)
    warn(s, `${post.faq.length} FAQ pairs (docs/02 §5.2 wants 4–6)`);
  for (const f of post.faq) {
    if (!f.q.trim().endsWith("?")) warn(s, `FAQ question missing "?": "${f.q.slice(0, 50)}"`);
    if (words(f.a) < 15) err(s, `FAQ answer under 15 words for "${f.q.slice(0, 50)}"`);
  }

  // Related links — the internal-linking lever the Post type exists to force.
  if (post.related.length < 2) err(s, `only ${post.related.length} related link(s) (min 2)`);
  for (const r of post.related) {
    if (r === s) err(s, "links to itself in related");
    else if (!bySlug.has(r)) err(s, `related slug does not exist: "${r}"`);
    else inboundRelated.set(r, (inboundRelated.get(r) ?? 0) + 1);
  }

  // Dates.
  for (const [label, value] of [["published", post.published], ["updated", post.updated]] as const) {
    if (value === undefined) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) err(s, `${label} is not YYYY-MM-DD: "${value}"`);
    else if (value > today) err(s, `${label} is in the future: ${value}`);
  }
  if (post.updated && post.updated < post.published)
    err(s, `updated (${post.updated}) precedes published (${post.published})`);

  // Substance.
  const bodyWords = post.body.map(blockText).reduce((n, t) => n + words(t), 0);
  if (bodyWords < BODY_MIN_WORDS) warn(s, `body is ${bodyWords} words (thin under ${BODY_MIN_WORDS})`);
  if (!post.body.some((b) => b.kind === "h2")) err(s, "no h2 blocks — no page outline");
  if (!post.body.some((b) => b.kind === "cta")) warn(s, "no CTA block");

  // Claims the whole company is not allowed to make, anywhere (docs/01, 08 §3).
  const copy = allCopy(post);
  if (/guaranteed?\s+compliance/i.test(copy))
    err(s, `promises "guaranteed compliance" (docs/08 §3 forbids this)`);
  if (/(detect|catch)\w*\s+(every\s+)?mid-?term\s+cancellation/i.test(copy))
    err(s, "claims mid-term cancellation detection (docs/01 Module C honesty rule)");
}

// Orphans: a post nothing links to only gets found through the index page.
for (const post of posts)
  if (!inboundRelated.has(post.slug)) warn(post.slug, "orphan — no other post links here via related");

// ---------------------------------------------------------------- routes

const routeSeen = new Map<string, boolean>();
for (const route of PUBLIC_ROUTES) {
  const s = `route:${route.path}`;
  if (routeSeen.has(route.path)) err(s, "duplicate path in PUBLIC_ROUTES");
  routeSeen.set(route.path, true);
  if (!route.path.startsWith("/")) err(s, "path must start with /");
  if (route.path !== "/" && route.path.endsWith("/")) err(s, "path must not end with /");
  if (route.summary.trim().length < 20) err(s, "summary under 20 chars — llms.txt gets no intent");
  if (route.priority < 0 || route.priority > 1) err(s, `priority ${route.priority} outside 0–1`);
}

// ---------------------------------------------------------------- report

console.log(`\n📝 Content lint — ${posts.length} posts, ${PUBLIC_ROUTES.length} routes\n`);
for (const w of warnings) console.log(`   ⚠️  ${w}`);
for (const e of errors) console.log(`   ❌ ${e}`);
console.log(
  `\n   ${errors.length} error(s), ${warnings.length} warning(s)` +
    (errors.length ? " — failing the gate" : " — clean"),
);
if (errors.length) process.exit(1);
