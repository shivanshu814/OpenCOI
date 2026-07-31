import { SURFACE_BG } from "@/components/ink-atmosphere";
import { JsonLd } from "@/components/json-ld";
import { AnswerBlock, MarketingHero } from "@/components/marketing-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { ORG } from "@/lib/seo/site";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  faqPageSchema,
  graph,
  howToSchema,
  webPageSchema,
} from "@/lib/seo/schema";
import Link from "next/link";

const TITLE = "Free COI Audit — Find Gaps in Your Vendor Insurance";
const DESCRIPTION =
  "Upload 3 vendor certificates of insurance. Our AI flags expired coverage, low limits & missing endorsements in minutes. Free, no card required.";
const PATH = "/free-audit";

// Title/description verbatim from docs/02-BRANDING_SEO.md §3.
export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "free coi audit",
    "certificate of insurance review",
    "vendor insurance gap check",
    "free coi check",
  ],
});

const STEPS = [
  {
    name: "Send three certificates",
    text: "Email three vendor COIs — PDF, scan or phone photo, whatever you have. No call, no card, no form to fill in.",
  },
  {
    name: "We read them and run your checks",
    text: "Each certificate is read in full, including endorsement pages, and compared against standard requirements for the trade: limits, expiration dates, additional insured, primary and non-contributory, waiver of subrogation.",
  },
  {
    name: "A person verifies every verdict",
    text: "Nothing is auto-approved. Anything the model is less than 90% confident about, and every failing check, is reviewed against the original PDF before the report is written.",
  },
  {
    name: "You get a report within 24 hours",
    text: "A traffic-light PDF showing each vendor as compliant, expiring or non-compliant, with the specific reason for every flag. The report is yours whether or not you ever talk to us.",
  },
];

const FAQ = [
  {
    q: "Is the COI audit really free?",
    a: "Yes. Three certificates, no card, no call required. The report is yours to keep and to send to whoever else needs to see it.",
  },
  {
    q: "What do you need from me?",
    a: "Three vendor certificates of insurance as PDFs, scans or photos — and, if you have one, your written insurance requirement so we can check against your standard rather than a generic one.",
  },
  {
    q: "How long does it take?",
    a: "Within 24 hours on a business day. The reading itself takes under a minute per certificate; the rest is a person verifying the verdicts before anything is sent.",
  },
  {
    q: "What will the report tell me?",
    a: "For each vendor: whether coverage is currently in force, whether limits meet the requirement, how many days until expiration, and which endorsements are claimed but not evidenced — with the specific reason for every flag.",
  },
  {
    q: "Will you keep or share my documents?",
    a: "Your documents stay in your tenant on US infrastructure and are never used to train public models. Human corrections become internal accuracy test cases, and you can request deletion at any time.",
  },
  {
    q: "Is this legal or insurance advice?",
    a: "No. CertShield provides document review assistance — not legal, insurance, or professional advice. You remain the final approver on every verdict.",
  },
];

export default function FreeAuditPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          webPageSchema({
            title: TITLE,
            description: DESCRIPTION,
            path: PATH,
            speakableSelectors: ["[data-answer]"],
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Free COI audit", path: PATH },
          ]),
          howToSchema({
            name: "How to get a free COI audit",
            description:
              "Send three vendor certificates of insurance and receive a compliance report within 24 hours.",
            totalTime: "PT24H",
            steps: STEPS,
          }),
          faqPageSchema(FAQ),
        )}
      />

      <MarketingHero
        eyebrow="Free, no card"
        title="Free COI audit — find the gaps in your vendor insurance"
        subtitle="Send three vendor certificates. We read them in full, check them against standard requirements, and send back a compliance report within 24 hours."
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: "Free COI audit", path: PATH },
        ]}
        wide
      />

      <main className={`${SURFACE_BG}`}>
        <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6 md:py-16">
          <AnswerBlock>
            A free COI audit reviews three of your vendors&rsquo; certificates
            of insurance and reports what is wrong with them: expired or
            expiring coverage, limits below requirement, and additional-insured
            or waiver endorsements that are claimed on the certificate but not
            actually attached. CertShield returns the report within 24 hours,
            free, with no card and no call required.
          </AnswerBlock>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              render={
                <a
                  href={`mailto:${ORG.email}?subject=${encodeURIComponent("Free 3-COI audit")}&body=${encodeURIComponent("Hi — attaching 3 vendor certificates of insurance for the free audit.\n\nCompany:\nNumber of vendors we track today:\nOur current insurance requirement (if we have one written down):\n")}`}
                />
              }
            >
              Email three certificates
            </Button>
            <Button variant="outline" size="lg" render={<Link href="/login" />}>
              Or run them yourself in the app
            </Button>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              How the audit works
            </h2>
            <ol className="border-border/80 bg-card divide-y rounded-xl border shadow-xs">
              {STEPS.map((step, i) => (
                <li key={step.name} className="flex gap-4 px-5 py-4">
                  <span
                    className="text-brand w-5 shrink-0 pt-px text-sm font-semibold tabular-nums"
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold">{step.name}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              What we check on each certificate
            </h2>
            <ul className="text-muted-foreground marker:text-brand grid list-disc gap-2 pl-5 text-sm leading-relaxed sm:grid-cols-2">
              <li>
                Insured legal entity matches the vendor you contracted with
              </li>
              <li>Every required coverage line is present</li>
              <li>Each limit against the requirement, line by line</li>
              <li>Policy effective and expiration dates, per coverage line</li>
              <li>
                Additional insured — ongoing operations, endorsement attached
              </li>
              <li>
                Additional insured — completed operations, endorsement attached
              </li>
              <li>Primary and non-contributory wording, evidenced</li>
              <li>
                Waiver of subrogation on GL and workers&rsquo; compensation
              </li>
              <li>
                Carrier identity and NAIC number resolve to a real carrier
              </li>
              <li>Layout and content signals that warrant a closer look</li>
            </ul>
            <p className="text-muted-foreground text-sm">
              Not sure what some of those mean? Every term is defined in the{" "}
              <Link
                href="/glossary"
                className="text-foreground font-medium underline underline-offset-2"
              >
                glossary
              </Link>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              What we will not tell you
            </h2>
            <div className="border-border/80 bg-card space-y-3 rounded-xl border p-5 text-sm leading-relaxed shadow-xs">
              <p>
                <span className="font-semibold">
                  That you are guaranteed compliant.
                </span>{" "}
                No document review can promise that, and any vendor who says
                otherwise is overselling. The report tells you what the
                documents show and what they fail to show.
              </p>
              <p>
                <span className="font-semibold">
                  That a policy has not been cancelled mid-term.
                </span>{" "}
                Carriers do not broadcast mid-term cancellations to certificate
                holders. We mitigate it with written confirmations from the
                producer, notice-of-cancellation endorsements in your
                requirements, and re-verification on every new document — we do
                not claim to detect it.
              </p>
              <p className="text-muted-foreground">
                Document review assistance — not legal, insurance, or
                professional advice.
              </p>
            </div>
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
        </div>
      </main>
    </MarketingShell>
  );
}
