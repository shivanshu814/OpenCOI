import type { Metadata } from "next";

import { ORG, SITE_URL, absoluteUrl } from "@/lib/seo/site";

/**
 * Per-page social card, rendered on demand by `/og`.
 *
 * A single static card for the whole site would put the homepage headline on
 * every blog post shared into a Slack channel — the one place a B2B link
 * actually gets clicked. The route is a GET with a cached response, so the cost
 * is one render per unique title, forever.
 */
export function ogImageUrl(title: string, eyebrow?: string): string {
  const params = new URLSearchParams({ title });
  if (eyebrow) params.set("eyebrow", eyebrow);
  return `/og?${params.toString()}`;
}

/**
 * Builds the full metadata block for a marketing page.
 *
 * Every public page must go through here rather than hand-writing a `Metadata`
 * object, because three things are easy to forget individually and fatal
 * collectively:
 *
 *  1. `alternates.canonical` — without it, `?plan=pro`, `?utm_source=…` and the
 *     `www`/apex pair are four URLs for one page, and the ranking signal splits
 *     four ways.
 *  2. `openGraph.images` — a page with no OG image is rendered as a bare link
 *     in Slack/LinkedIn/X, which is where B2B sharing actually happens.
 *  3. `title.absolute` — the root layout's `%s · CertShield` template appends to
 *     any plain string title, which already shipped one live bug where Home
 *     rendered "… — CertShield · CertShield" (STATUS 2026-07-26).
 *
 * Pass `titleTemplate: true` only for pages whose short title genuinely reads
 * better with " · CertShield" appended (blog posts, glossary terms).
 */
export function pageMetadata({
  title,
  description,
  path,
  titleTemplate = false,
  images,
  type = "website",
  publishedTime,
  modifiedTime,
  noindex = false,
  keywords,
}: {
  title: string;
  description: string;
  /** Site-relative, leading slash, no trailing slash (except "/"). */
  path: string;
  titleTemplate?: boolean;
  images?: string[];
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  keywords?: readonly string[];
}): Metadata {
  const url = absoluteUrl(path);
  const ogImages = (images ?? [ogImageUrl(title)])
    .map((i) => absoluteUrl(i))
    .map((i) => ({ url: i, width: 1200, height: 630, alt: title }));

  return {
    title: titleTemplate ? title : { absolute: title },
    description,
    keywords: keywords ? [...keywords] : undefined,
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type,
      url,
      siteName: ORG.name,
      title: titleTemplate ? `${title} · ${ORG.name}` : title,
      description,
      locale: "en_US",
      images: ogImages,
      ...(type === "article" ? { publishedTime, modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: titleTemplate ? `${title} · ${ORG.name}` : title,
      description,
      images: ogImages.map((i) => i.url),
    },
    metadataBase: new URL(SITE_URL),
  };
}
