import type { MetadataRoute } from "next";

import { SITE_URL, absoluteUrl } from "@/lib/seo/site";

/**
 * Paths no crawler should ever index.
 *
 * `/portal`, `/confirm` and `/sign` are magic-link surfaces: the URL contains a
 * one-time token that identifies a specific vendor or agent. Indexing them
 * would publish those tokens in a search result. `/app` and `/login` answer
 * behind auth, and `/api` returns JSON — all three are crawl budget burnt for
 * nothing.
 */
const PRIVATE_PATHS = [
  "/app",
  "/app/",
  "/login",
  "/api/",
  "/portal/",
  "/confirm/",
  "/sign/",
  "/auth/",
];

/**
 * AI crawlers, allowed explicitly and by name.
 *
 * This is a deliberate business decision, not an oversight (docs/02 §5): the
 * entire AEO/GEO strategy is to be the source an answer engine cites for
 * "best COI tracking software" and "what is a CG 20 37". A tool that blocks
 * GPTBot and ClaudeBot cannot be cited by the products those bots feed. We are
 * publishing marketing content we want repeated — there is nothing here worth
 * withholding from a model.
 *
 * Naming them individually rather than relying on `*` matters because several
 * of these bots only honour a rule that matches their exact token, and because
 * an explicit allow survives a future tightening of the wildcard rule.
 */
const AI_CRAWLERS = [
  // OpenAI
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Google AI surfaces (separate token from Googlebot)
  "Google-Extended",
  // Apple Intelligence
  "Applebot",
  "Applebot-Extended",
  // Meta AI
  "meta-externalagent",
  "FacebookBot",
  // Common Crawl — feeds a long tail of models
  "CCBot",
  // Others that show up in answer-engine citations
  "Amazonbot",
  "Bytespider",
  "cohere-ai",
  "DuckAssistBot",
  "YouBot",
  "Diffbot",
  "Timpibot",
  "PetalBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      // Bing carries ChatGPT's browsing index — worth its own explicit rule
      // (docs/02 §5.8), including the Bing-specific crawl-delay reset.
      {
        userAgent: "bingbot",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
