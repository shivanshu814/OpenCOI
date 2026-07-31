import { posts } from "@/content/blog";
import type { Block } from "@/content/blog/types";
import { COMPARISONS } from "@/content/comparisons";
import { GLOSSARY } from "@/content/glossary";
import { DISCLAIMER_TEXT, ORG, absoluteUrl } from "@/lib/seo/site";

/**
 * `/llms-full.txt` — every answer, definition and FAQ on the site, flattened
 * into one plain-text document.
 *
 * The reason this exists separately from `llms.txt`: an answer engine that
 * decides to read one file from a domain gets the index, not the substance.
 * This file is the substance — a crawler or a user pasting a URL into a model
 * gets the entire corpus in a single fetch, with no JavaScript, no navigation
 * and no markup to strip. It is regenerated from the same content the pages
 * render, so it can never describe a page that no longer says that.
 */

function renderBlock(block: Block): string {
  switch (block.kind) {
    case "p":
      return block.text;
    case "h2":
      return `\n## ${block.text}`;
    case "h3":
      return `\n### ${block.text}`;
    case "ul":
      return block.items.map((i) => `- ${i}`).join("\n");
    case "ol":
      return block.items.map((i, n) => `${n + 1}. ${i}`).join("\n");
    case "table":
      return [
        `| ${block.head.join(" | ")} |`,
        `| ${block.head.map(() => "---").join(" | ")} |`,
        ...block.rows.map((r) => `| ${r.join(" | ")} |`),
        block.caption ? `(${block.caption})` : "",
      ]
        .filter(Boolean)
        .join("\n");
    case "callout":
      return `> ${block.title}: ${block.text}`;
    case "cta":
      return `[${block.label}](${absoluteUrl(block.href)}) — ${block.text}`;
  }
}

export function GET() {
  const sections: string[] = [];

  sections.push(`# ${ORG.name} — full content\n\n> ${ORG.boilerplate}\n\n${DISCLAIMER_TEXT}`);

  sections.push(
    `# Glossary\n\n${GLOSSARY.map(
      (t) => `## ${t.term}\n\n${t.definition}`,
    ).join("\n\n")}`,
  );

  for (const post of posts) {
    const faq = post.faq
      .map((f) => `**${f.q}**\n\n${f.a}`)
      .join("\n\n");

    sections.push(
      [
        `# ${post.h1}`,
        `Source: ${absoluteUrl(`/blog/${post.slug}`)}`,
        `Updated: ${post.updated ?? post.published}`,
        ``,
        `**Short answer.** ${post.answer}`,
        ``,
        post.body.map(renderBlock).join("\n\n"),
        ``,
        `## Frequently asked`,
        ``,
        faq,
      ].join("\n"),
    );
  }

  for (const c of COMPARISONS) {
    sections.push(
      [
        `# ${c.h1}`,
        `Source: ${absoluteUrl(`/compare/${c.slug}`)}`,
        ``,
        `**Short answer.** ${c.answer}`,
        ``,
        `## What ${c.competitor} is`,
        ``,
        c.positioning,
        ``,
        `## What ${c.competitor} does better`,
        ``,
        c.credit.map((i) => `- ${i}`).join("\n"),
        ``,
        `## Side by side`,
        ``,
        `| Dimension | ${c.competitor} | CertShield |`,
        `| --- | --- | --- |`,
        c.rows.map((r) => `| ${r.dimension} | ${r.them} | ${r.us} |`).join("\n"),
        ``,
        `## Choose ${c.competitor} when`,
        ``,
        c.whenThem.map((i) => `- ${i}`).join("\n"),
        ``,
        `## Choose CertShield when`,
        ``,
        c.whenUs.map((i) => `- ${i}`).join("\n"),
        ``,
        `## Frequently asked`,
        ``,
        c.faq.map((f) => `**${f.q}**\n\n${f.a}`).join("\n\n"),
      ].join("\n"),
    );
  }

  return new Response(`${sections.join("\n\n---\n\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
