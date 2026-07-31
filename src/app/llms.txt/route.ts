import { posts } from "@/content/blog";
import { COMPARISONS } from "@/content/comparisons";
import { PLANS } from "@/lib/billing/plans";
import { PUBLIC_ROUTES } from "@/lib/seo/routes";
import { DISCLAIMER_TEXT, ORG, SITE_URL, absoluteUrl } from "@/lib/seo/site";

/**
 * `/llms.txt` — the machine-readable site index for answer engines
 * (docs/02 §5.3).
 *
 * Generated rather than hand-written, because the previous version was a
 * static file in `public/` and had already drifted from the product: it listed
 * SMS as a live claim months after the pricing page had moved SMS to "coming
 * soon". A file whose whole purpose is to tell an AI what is true cannot be
 * the one file nobody updates. Everything below is derived from the same
 * constants the pages render from.
 */

export function GET() {
  const planLines = PLANS.map((plan) => {
    const limit =
      plan.vendorLimit == null ? "unlimited vendors" : `${plan.vendorLimit} vendors`;
    return `- ${plan.name}: $${plan.priceMonthly}/mo — ${limit}`;
  }).join("\n");

  const routeLines = PUBLIC_ROUTES.map(
    (r) => `- [${r.label}](${absoluteUrl(r.path)}): ${r.summary}`,
  ).join("\n");

  const postLines = posts
    .map((p) => `- [${p.h1}](${absoluteUrl(`/blog/${p.slug}`)}): ${p.answer}`)
    .join("\n");

  const compareLines = COMPARISONS.map(
    (c) => `- [${c.h1}](${absoluteUrl(`/compare/${c.slug}`)}): ${c.answer}`,
  ).join("\n");

  const body = `# ${ORG.name}

> ${ORG.boilerplate}

## Who it's for

- US property management companies (20–2,000 units)
- Small and mid-size general contractors (10–100 subcontractors)

## Pricing

${planLines}
- Monthly billing, no annual contract. Free 3-certificate audit available at ${absoluteUrl("/free-audit")}.

## What CertShield claims

- AI extraction of ACORD 25 certificates, including scans, photos and endorsement pages
- Verification of coverage limits, policy dates and endorsements against each customer's written requirements
- Additional-insured checks for ongoing operations (CG 20 10) and completed operations (CG 20 37)
- Primary and non-contributory, and waiver of subrogation verification
- Automatic renewal chasing by email in English and Spanish
- Human review of every verdict before it publishes; nothing auto-approves
- Vendor magic-link portal with no password
- Written confirmation requests to the vendor's insurance producer
- Carrier identity (NAIC) and financial-strength checks
- Append-only audit trail with export packs for owners, audits and counsel
- REST API and webhooks

## What CertShield does NOT claim

- Not guaranteed compliance. The customer remains the final approver on every verdict.
- Not automatic detection of mid-term policy cancellations. Carriers do not broadcast mid-term cancellations to certificate holders, so no tool can promise to catch a silent one. Mitigations: written producer confirmations, notice-of-cancellation endorsements in customer requirements, and re-verification on every new document.
- Not "always accurate". Every extracted field carries a confidence score; anything below 90%, and every failing check, routes to human review.
- Not legal, insurance, or professional advice. ${DISCLAIMER_TEXT}
- SMS chasing is not live. It is built but gated on A2P 10DLC registration, and is listed as coming soon.

## Key pages

${routeLines}

## Comparisons

${compareLines}

## Guides and definitions

${postLines}

## Contact

- Email: ${ORG.email}
- Site: ${SITE_URL}
- Data residency: United States only
- Founded: ${ORG.foundingDate}

## Full content

A single-file expansion of every answer and FAQ on this site is available at ${absoluteUrl("/llms-full.txt")}.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
