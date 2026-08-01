/**
 * JSON-LD builders — the machine-readable half of the AEO/GEO strategy.
 *
 * Answer engines (Google AI Overviews, ChatGPT search, Perplexity, Claude) do
 * not re-read your marketing prose to work out what you sell; they read the
 * entity graph. docs/02 §5.2 makes structured data non-optional on every page.
 *
 * Two rules enforced by construction here:
 *  - Every builder returns a plain object with a stable `@id` where the entity
 *    is reusable, so `Organization` on the blog is the SAME node as on Home
 *    rather than a second company with the same name.
 *  - No `aggregateRating` anywhere. Rating markup without real reviews behind
 *    it is a manual-action risk and, per docs/02 §5, we only earn it once G2 /
 *    Capterra reviews actually exist. Do not add a placeholder.
 */

import { ORG, SAME_AS, SITE_URL, absoluteUrl } from "@/lib/seo/site";

type Json = Record<string, unknown>;

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const SOFTWARE_ID = `${SITE_URL}/#software`;

export function organizationSchema(): Json {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: ORG.name,
    legalName: ORG.legalName,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(ORG.logoPath),
    },
    description: ORG.boilerplate,
    slogan: ORG.tagline,
    foundingDate: ORG.foundingDate,
    founder: { "@type": "Person", name: ORG.founder },
    areaServed: { "@type": "Country", name: "United States" },
    knowsAbout: [
      "Certificate of insurance tracking",
      "ACORD 25 certificates",
      "Additional insured endorsements",
      "Vendor insurance compliance",
      "Subcontractor insurance verification",
      "Property management vendor risk",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: ORG.email,
        areaServed: "US",
        availableLanguage: ["English", "Spanish"],
      },
    ],
    ...(SAME_AS.length ? { sameAs: [...SAME_AS] } : {}),
  };
}

export function websiteSchema(): Json {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: ORG.name,
    description: ORG.oneLiner,
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
  };
}

/** Home only. `offers` mirrors `PLANS` — keep the numbers in sync with docs/01 §8. */
export function softwareApplicationSchema(): Json {
  return {
    "@type": "SoftwareApplication",
    "@id": SOFTWARE_ID,
    name: ORG.name,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Insurance compliance software",
    operatingSystem: "Web",
    publisher: { "@id": ORG_ID },
    description: ORG.oneLiner,
    featureList: [
      "AI extraction of ACORD 25 certificates of insurance",
      "Coverage limit and expiration verification against your requirements",
      "Additional-insured endorsement checks (CG 20 10, CG 20 37)",
      "Automatic renewal chasing by email in English and Spanish",
      "Human review of every verdict before it publishes",
      "Audit-ready document trail and export packs",
    ],
    offers: {
      "@type": "AggregateOffer",
      // Google's SoftwareApplication rich-result validator requires a scalar
      // `price` on `offers`; lowPrice/highPrice alone trip a validation error.
      // Mirrors ORG.priceLow (the entry plan) so the two cannot drift.
      price: String(ORG.priceLow),
      lowPrice: String(ORG.priceLow),
      highPrice: String(ORG.priceHigh),
      priceCurrency: "USD",
      offerCount: 3,
      availability: "https://schema.org/InStock",
    },
  };
}

export function breadcrumbSchema(
  trail: readonly { name: string; path: string }[],
): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function faqPageSchema(items: readonly { q: string; a: string }[]): Json {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function articleSchema({
  title,
  description,
  path,
  published,
  updated,
  keywords,
  images,
  type = "Article",
}: {
  title: string;
  description: string;
  path: string;
  published: string;
  updated?: string;
  keywords?: readonly string[];
  /** Site-relative or absolute. Google's Article docs want `image` on every
   *  article — without it the rich result is text-only. The per-page `/og`
   *  card (1200×630) is always available, so there is no excuse to omit it. */
  images?: readonly string[];
  /** `BlogPosting` for blog posts; Google treats the subtypes equally but the
   *  more precise type costs nothing. */
  type?: "Article" | "BlogPosting";
}): Json {
  const url = absoluteUrl(path);
  return {
    "@type": type,
    "@id": `${url}#article`,
    headline: title,
    description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: published,
    dateModified: updated ?? published,
    inLanguage: "en-US",
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
    ...(images?.length ? { image: images.map((i) => absoluteUrl(i)) } : {}),
    ...(keywords?.length ? { keywords: keywords.join(", ") } : {}),
  };
}

/**
 * `speakable` marks the answer-first block that opens every article (docs/02
 * §5.1) as the passage worth reading aloud / lifting. It is the closest thing
 * schema.org has to "this is the extractable answer", and costs nothing.
 */
export function speakableSchema(cssSelectors: readonly string[]): Json {
  return {
    "@type": "SpeakableSpecification",
    cssSelector: [...cssSelectors],
  };
}

export function howToSchema({
  name,
  description,
  steps,
  totalTime,
}: {
  name: string;
  description: string;
  steps: readonly { name: string; text: string }[];
  /** ISO 8601 duration, e.g. "PT10M". */
  totalTime?: string;
}): Json {
  return {
    "@type": "HowTo",
    name,
    description,
    ...(totalTime ? { totalTime } : {}),
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function definedTermSetSchema({
  name,
  description,
  path,
  terms,
}: {
  name: string;
  description: string;
  path: string;
  terms: readonly { term: string; definition: string; slug: string }[];
}): Json {
  const setId = `${absoluteUrl(path)}#termset`;
  return {
    "@type": "DefinedTermSet",
    "@id": setId,
    name,
    description,
    url: absoluteUrl(path),
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `${absoluteUrl(path)}#${t.slug}`,
      name: t.term,
      description: t.definition,
      inDefinedTermSet: { "@id": setId },
      url: `${absoluteUrl(path)}#${t.slug}`,
    })),
  };
}

export function itemListSchema(
  items: readonly { name: string; path: string; description?: string }[],
): Json {
  return {
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: absoluteUrl(item.path),
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

export function webPageSchema({
  title,
  description,
  path,
  speakableSelectors,
}: {
  title: string;
  description: string;
  path: string;
  speakableSelectors?: readonly string[];
}): Json {
  const url = absoluteUrl(path);
  return {
    "@type": "WebPage",
    "@id": url,
    url,
    name: title,
    description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    inLanguage: "en-US",
    ...(speakableSelectors?.length
      ? { speakable: speakableSchema(speakableSelectors) }
      : {}),
  };
}

/** Wraps nodes into one `@graph` document — one `<script>` per page, not six. */
export function graph(...nodes: (Json | null | undefined)[]): Json {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean) as Json[],
  };
}
