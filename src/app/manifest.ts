import type { MetadataRoute } from "next";

import { ORG } from "@/lib/seo/site";

/**
 * Web app manifest.
 *
 * Present mainly for completeness of the "installable, well-formed site"
 * signals — name, theme colour and icons are read by browsers, by some
 * crawlers and by link-preview tooling. `display: browser` on purpose: this is
 * a document-heavy B2B app, and a standalone window with no address bar makes
 * it harder to copy a link to a vendor, which is a thing people do constantly.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${ORG.name} — vendor insurance compliance`,
    short_name: ORG.name,
    description: ORG.oneLiner,
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#182b45",
    categories: ["business", "productivity", "finance"],
    lang: "en-US",
    icons: [
      // Raster brand mark for PWA install prompts on iOS/Android — SVG is
      // still fine for browsers but home-screen thumbnails render better
      // from a real bitmap. Served from public/logo.png (128x128 source).
      {
        src: "/logo.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "any",
      },
      // Kept as a fallback for browsers that prefer vector when available.
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
