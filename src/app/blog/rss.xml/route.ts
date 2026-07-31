import { posts } from "@/content/blog";
import { ORG, absoluteUrl } from "@/lib/seo/site";

/**
 * RSS 2.0 feed for the blog.
 *
 * Still worth shipping in 2026 for two unglamorous reasons: content
 * aggregators and newsletter tools consume RSS to syndicate posts (each
 * syndication is a backlink and an entity signal), and several AI crawlers use
 * feed discovery to notice new content faster than they would by re-crawling.
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(date: string): string {
  return new Date(`${date}T09:00:00Z`).toUTCString();
}

export function GET() {
  const items = posts
    .map((post) => {
      const url = absoluteUrl(`/blog/${post.slug}`);
      return `    <item>
      <title>${escapeXml(post.h1)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(post.updated ?? post.published)}</pubDate>
      <category>${escapeXml(post.category)}</category>
      <description>${escapeXml(post.answer)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${ORG.name} — COI & vendor compliance guides`)}</title>
    <link>${absoluteUrl("/blog")}</link>
    <description>${escapeXml(
      "Plain-English guides on certificates of insurance, ACORD forms, endorsements, and vendor risk for property managers and contractors.",
    )}</description>
    <language>en-us</language>
    <atom:link href="${absoluteUrl("/blog/rss.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
