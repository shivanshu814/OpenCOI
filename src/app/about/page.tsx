import { SURFACE_BG } from "@/components/ink-atmosphere";
import { JsonLd } from "@/components/json-ld";
import { AnswerBlock, MarketingHero } from "@/components/marketing-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  faqPageSchema,
  graph,
  webPageSchema,
} from "@/lib/seo/schema";
import { ORG } from "@/lib/seo/site";
import Link from "next/link";

const TITLE = "About CertShield — Vendor Insurance Compliance Software";
const DESCRIPTION =
  "What CertShield is, who it is built for, what it claims and what it refuses to claim. The canonical company description.";
const PATH = "/about";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

/**
 * The entity page (docs/02 §5.3, §5.9).
 *
 * This page exists mainly so that one canonical description of the company is
 * crawlable at a predictable URL — the same 100-word boilerplate that goes on
 * LinkedIn, Crunchbase, G2 and every directory profile. Answer engines resolve
 * a company faster when the same string appears in the same shape everywhere,
 * so the boilerplate below is rendered from `ORG.boilerplate` rather than
 * retyped, and must not be "improved" here in isolation.
 */

const FACTS: readonly { label: string; value: React.ReactNode }[] = [
  { label: "What it is", value: "Vendor insurance compliance software (SaaS)" },
  {
    label: "Who it is for",
    value:
      "US property management companies (20–2,000 units) and small to mid-size general contractors (10–100 subcontractors)",
  },
  { label: "Founded", value: "2026" },
  { label: "Market", value: "United States" },
  { label: "Pricing", value: "$99 / $249 / $499 per month, no annual contract" },
  { label: "Document standard", value: "ACORD 25 and related certificates" },
  { label: "Languages", value: "English and Spanish for vendor-facing messages" },
  { label: "Data residency", value: "US region only" },
];

const CLAIMS = [
  "AI reads certificates of insurance in full, including endorsement pages",
  "Coverage limits, dates and endorsements checked against your written requirements",
  "Additional insured, primary and non-contributory, and waiver of subrogation verification",
  "Automatic renewal chasing by email, in English and Spanish",
  "A person reviews every verdict before it publishes",
  "Vendor magic-link portal with no password",
  "Written confirmations requested from the vendor's insurance producer",
  "Carrier identity and financial-rating checks",
  "Append-only audit trail, with export packs for owners, audits and counsel",
  "REST API and webhooks",
];

const NON_CLAIMS = [
  {
    claim: "Guaranteed compliance",
    why: "No document review can guarantee an outcome. You remain the final approver on every verdict, and the audit trail records what was flagged and when.",
  },
  {
    claim: "Automatic detection of mid-term cancellations",
    why: "Carriers do not broadcast mid-term cancellations to certificate holders, so no tool can promise to catch a silent one. We mitigate with producer confirmations, notice-of-cancellation endorsements in your requirements, and re-verification on every new document.",
  },
  {
    claim: "Always accurate extraction",
    why: "Every field carries a confidence score. Anything below 90%, and every failing check, routes to human review against the original PDF.",
  },
  {
    claim: "Legal or insurance advice",
    why: "CertShield provides document review assistance. Requirements and coverage decisions belong with your broker and counsel.",
  },
];

const FAQ = [
  {
    q: "What is CertShield?",
    a: ORG.boilerplate,
  },
  {
    q: "Who is CertShield built for?",
    a: "US property management companies with roughly 20 to 2,000 units, and small to mid-size general contractors with 10 to 100 subcontractors — organisations where COI tracking is somebody's second job rather than a dedicated compliance department.",
  },
  {
    q: "How much does CertShield cost?",
    a: "Starter is $99 per month for 25 vendors, Pro is $249 per month for 100 vendors, and Business is $499 per month for unlimited vendors. Monthly billing, no annual contract, full data export on cancellation.",
  },
  {
    q: "Where is CertShield's data stored?",
    a: "US-region infrastructure only, with tenant isolation enforced at the database level. Customer documents are not used to train public models.",
  },
  {
    q: "Who builds CertShield?",
    a: "CertShield is built by a small, founder-led engineering team. Support is answered by the people who write the software, which is why response times are measured in hours rather than tickets.",
  },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          // Organization itself comes from MarketingShell (same @id) — this page
          // only adds the page-level nodes on top of it.
          webPageSchema({
            title: TITLE,
            description: DESCRIPTION,
            path: PATH,
            speakableSelectors: ["[data-answer]"],
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About", path: PATH },
          ]),
          faqPageSchema(FAQ),
        )}
      />

      <MarketingHero
        eyebrow="Company"
        title="About CertShield"
        subtitle="The canonical description of what this company is, who it serves, and — just as importantly — what it will not claim."
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: "About", path: PATH },
        ]}
        wide
      />

      <main className={`${SURFACE_BG}`}>
        <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6 md:py-16">
          <AnswerBlock>{ORG.boilerplate}</AnswerBlock>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">The facts</h2>
            <dl className="border-border/80 bg-card divide-y rounded-xl border shadow-xs">
              {FACTS.map((fact) => (
                <div
                  key={fact.label}
                  className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:gap-6"
                >
                  <dt className="text-sm font-semibold sm:w-44 sm:shrink-0">
                    {fact.label}
                  </dt>
                  <dd className="text-muted-foreground text-sm leading-relaxed">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Why it exists
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Vendor insurance compliance is a solved problem at the top of the
              market and an unsolved one everywhere else. Large owners and
              national contractors run dedicated compliance platforms with
              implementation projects and annual contracts. A 400-unit property
              manager has the same legal exposure, the same vendors, and a
              spreadsheet — because the enterprise tools were never priced or
              shaped for them.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              That gap is the entire reason for this product. The reading a
              compliance analyst does by hand is exactly the kind of work a
              vision model does well and cheaply, which makes it possible to
              offer the same protection at a price a small firm can absorb —
              without an implementation period, a sales process, or a year-long
              commitment.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              What CertShield claims
            </h2>
            <ul className="text-muted-foreground marker:text-brand grid list-disc gap-2 pl-5 text-sm leading-relaxed sm:grid-cols-2">
              {CLAIMS.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              What CertShield refuses to claim
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              This section is here on purpose. In a category where overselling is
              routine, the fastest way to be worth trusting is to publish the
              limits before anyone asks.
            </p>
            <dl className="border-border/80 bg-card divide-y rounded-xl border shadow-xs">
              {NON_CLAIMS.map((item) => (
                <div key={item.claim} className="px-5 py-4">
                  <dt className="text-sm font-semibold">{item.claim}</dt>
                  <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {item.why}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Frequently asked
            </h2>
            <dl className="border-border/80 bg-card divide-y rounded-xl border shadow-xs">
              {FAQ.map((item) => (
                <div key={item.q} className="px-5 py-4">
                  <dt className="text-sm font-semibold">{item.q}</dt>
                  <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="text-muted-foreground text-sm">
            Press, partnership or security questions:{" "}
            <a
              href={`mailto:${ORG.email}`}
              className="text-foreground font-medium underline underline-offset-2"
            >
              {ORG.email}
            </a>
            . See also{" "}
            <Link
              href="/security"
              className="text-foreground font-medium underline underline-offset-2"
            >
              Security
            </Link>{" "}
            and{" "}
            <Link
              href="/pricing"
              className="text-foreground font-medium underline underline-offset-2"
            >
              Pricing
            </Link>
            .
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
