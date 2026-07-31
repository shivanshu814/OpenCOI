/**
 * Blog content model.
 *
 * Deliberately a typed data structure rather than MDX. Three reasons:
 *  - Every post is forced to carry the fields AEO depends on — the 40–60 word
 *    answer block (docs/02 §5.1), the FAQ pairs that become `FAQPage` JSON-LD,
 *    the keyword list — instead of them being optional frontmatter someone
 *    forgets on post 7.
 *  - No new dependency, no MDX bundler config, and `tsc` type-checks the
 *    content the same way it checks the app.
 *  - Blocks render through one component, so heading IDs, table overflow and
 *    prose rhythm are correct everywhere by construction.
 */

export type Block =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: readonly string[] }
  | { kind: "ol"; items: readonly string[] }
  | {
      kind: "table";
      head: readonly string[];
      rows: readonly (readonly string[])[];
      caption?: string;
    }
  | { kind: "callout"; title: string; text: string }
  | { kind: "cta"; text: string; href: string; label: string };

export type PostCategory =
  | "Definitions"
  | "Guides"
  | "Templates"
  | "Benchmarks";

export type Post = {
  slug: string;
  /** `<title>` — aim ≤ 60 chars, docs/02 §3. */
  title: string;
  /** On-page H1. May differ from `<title>`; the H1 is for humans. */
  h1: string;
  /** Meta description — aim ≤ 155 chars. */
  description: string;
  /**
   * The answer-first block, 40–60 words, written to be lifted verbatim by an
   * answer engine (docs/02 §5.1). Must stand alone: no "as we said above", no
   * pronouns pointing at the title.
   */
  answer: string;
  /** ISO date. */
  published: string;
  updated?: string;
  category: PostCategory;
  keywords: readonly string[];
  readingMinutes: number;
  body: readonly Block[];
  faq: readonly { q: string; a: string }[];
  /** Slugs of related posts — internal linking is the cheapest ranking lever. */
  related: readonly string[];
};
