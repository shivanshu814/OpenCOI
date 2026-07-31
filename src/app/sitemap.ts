import type { MetadataRoute } from "next";

import { latestPostDate, posts } from "@/content/blog";
import { PUBLIC_ROUTES } from "@/lib/seo/routes";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * `/sitemap.xml`.
 *
 * Marketing surfaces only. The workspace (`/app`), the vendor portal, magic-link
 * pages and `/login` are deliberately absent — they are either behind auth or
 * behind a one-time token, so listing them would hand crawlers a pile of URLs
 * that answer 401 or 404 and drag down the site's crawl reputation.
 *
 * `lastModified` is taken from real content dates where content exists rather
 * than `new Date()`: a sitemap that claims every page changed today, every day,
 * teaches crawlers to ignore the field.
 */
/**
 * Bumped by hand when marketing pages change materially. Deliberately a
 * constant: `new Date()` here would make every build a "everything changed"
 * signal, and Next would also make the route dynamic.
 */
const SITE_LAST_MODIFIED = "2026-07-31";

export default function sitemap(): MetadataRoute.Sitemap {
  const blogIndexDate = latestPostDate();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: route.path === "/blog" ? blogIndexDate : SITE_LAST_MODIFIED,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.updated ?? post.published,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...postEntries];
}
