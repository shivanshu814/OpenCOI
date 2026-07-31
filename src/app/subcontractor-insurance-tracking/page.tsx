import { SURFACE_BG } from "@/components/ink-atmosphere";
import { JsonLd } from "@/components/json-ld";
import { AnswerBlock, MarketingHero } from "@/components/marketing-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  faqPageSchema,
  graph,
  softwareApplicationSchema,
  webPageSchema,
} from "@/lib/seo/schema";
import Link from "next/link";

const TITLE = "Subcontractor Insurance Tracking Software — CertShield";
const DESCRIPTION =
  "Track subcontractor COIs, endorsements and expirations automatically. Built for general contractors with 10–100 subs. From $99/mo, no annual contract.";
const PATH = "/subcontractor-insurance-tracking";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "subcontractor insurance tracking",
    "subcontractor coi tracking software",
    "general contractor insurance compliance",
    "sub compliance software",
  ],
});

const RISKS = [
  {
    title: "Completed operations is the exposure that outlives the job",
    body: "Ongoing-operations additional insured status ends when the sub leaves the site. Most construction-defect claims arrive years later, which is precisely when a CG 20 10-only endorsement stops protecting you.",
  },
  {
    title: "A shared aggregate is not your limit",
    body: "A sub carrying a $2,000,000 general aggregate is sharing it across every job they take that year. On anything material, a per-project aggregate is the difference between a real limit and a nominal one.",
  },
  {
    title: "The certificate arrives, the endorsements do not",
    body: "The ADDL INSD box is checked and no endorsement page is attached. It is the most common gap on real certificates, and the one your GL carrier will point at first.",
  },
  {
    title: "Owner and lender audits ask for history",
    body: "Closeout means producing evidence per sub, per job — not a current status page. If that evidence is a shared drive, closeout takes a week.",
  },
];

const CAPABILITIES = [
  {
    title: "Per-project requirements",
    body: "Different jobs, different owners, different limits. Requirements are stored once and applied to every incoming certificate for that project.",
  },
  {
    title: "Endorsement verification, not checkbox trust",
    body: "CG 20 10, CG 20 37, primary and non-contributory, and waivers are checked as documents. A claim with no attached form is flagged, not passed.",
  },
  {
    title: "Chasing that reaches the agent",
    body: "Sequences go to the producer with the sub copied, escalating on a cadence, in English and Spanish — which matters in this trade base more than in most.",
  },
  {
    title: "Closeout packs per project",
    body: "Every certificate, endorsement, verdict and message for a job, exported as one ZIP for the owner, the lender or counsel.",
  },
  {
    title: "Agent confirmations on file",
    body: "Request a written confirm or deny from the producer directly from the review screen — the only check that does not depend on the PDF being genuine.",
  },
  {
    title: "Carrier checks",
    body: "NAIC identity and financial-strength rating checked on every certificate, so a real limit is not sitting behind a carrier that cannot pay it.",
  },
];

const FAQ = [
  {
    q: "What is subcontractor insurance tracking?",
    a: "It is the process of collecting each subcontractor's certificate of insurance, verifying that coverage limits, policy dates and endorsements meet the requirements in their subcontract, chasing renewals before coverage lapses, and retaining dated evidence of all of it for owner audits and claims.",
  },
  {
    q: "What insurance should a general contractor require from subs?",
    a: "Commonly $1,000,000 per occurrence and $2,000,000 aggregate general liability, statutory workers' compensation with $1,000,000 employers liability, $1,000,000 combined single limit auto, plus umbrella for high-hazard trades — and additional insured status for both ongoing and completed operations, primary and non-contributory wording, and waivers of subrogation. Set your own numbers with your broker.",
  },
  {
    q: "Why does completed operations matter so much for subs?",
    a: "Because construction claims surface after the work is done. A CG 20 10 endorsement protects you while the sub is on site; a CG 20 37 protects you for the years afterwards, which is the longer and more litigious window.",
  },
  {
    q: "How does this help at project closeout?",
    a: "Every document, verdict and chase message is retained in an append-only trail, so a closeout pack for a project — or a litigation pack for a single sub — is an export rather than a week of reconstruction.",
  },
  {
    q: "Do my subs need to create accounts?",
    a: "No. Subs upload through a magic link with no password, or simply reply to the chase email with the certificate attached.",
  },
  {
    q: "Will it detect a sub's policy being cancelled mid-term?",
    a: "No, and nothing can promise that — carriers do not broadcast mid-term cancellations to certificate holders. Expirations are caught and chased automatically; cancellation risk is mitigated with written producer confirmations, notice-of-cancellation endorsements in the subcontract, and re-verification on every new document.",
  },
];

export default function SubcontractorPage() {
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
            { name: "Subcontractor insurance tracking", path: PATH },
          ]),
          softwareApplicationSchema(),
          faqPageSchema(FAQ),
        )}
      />

      <MarketingHero
        eyebrow="For general contractors"
        title="Subcontractor insurance tracking"
        subtitle="For GCs running 10 to 100 subs, where the certificate is collected once and the exposure lasts for years. Live the same day, from $99 a month."
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: "Subcontractor insurance tracking", path: PATH },
        ]}
        wide
      />

      <main className={`${SURFACE_BG}`}>
        <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6 md:py-16">
          <AnswerBlock>
            Subcontractor insurance tracking means collecting each sub&rsquo;s
            certificate of insurance, verifying limits, policy dates and
            endorsements against the subcontract, chasing renewals before
            coverage lapses, and retaining dated evidence for owner audits and
            claims. CertShield automates the reading and chasing for general
            contractors from $99 per month, with a person reviewing every
            verdict before it publishes.
          </AnswerBlock>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/free-audit" />}>
              Free 3-certificate audit
            </Button>
            <Button
              variant="outline"
              size="lg"
              render={<Link href="/pricing" />}
            >
              See pricing
            </Button>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Where sub compliance actually fails
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {RISKS.map((r) => (
                <div
                  key={r.title}
                  className="border-border/80 bg-card space-y-2 rounded-xl border p-5 shadow-xs"
                >
                  <h3 className="text-sm font-semibold">{r.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {r.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              What you get
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {CAPABILITIES.map((c) => (
                <div
                  key={c.title}
                  className="border-border/80 bg-card space-y-2 rounded-xl border p-5 shadow-xs"
                >
                  <h3 className="text-sm font-semibold">{c.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Set the requirements before you need them
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Once a sub is off the job you have no leverage left to add an
              endorsement, which is why completed-operations status and
              per-project aggregates belong in the subcontract rather than in a
              follow-up email. Typical bands by trade, and the exact endorsement
              forms to name, are collected here:
            </p>
            <p className="text-muted-foreground text-sm">
              <Link
                href="/vendor-insurance-requirements"
                className="text-foreground font-medium underline underline-offset-2"
              >
                Vendor insurance requirements by trade
              </Link>{" "}
              ·{" "}
              <Link
                href="/blog/cg-20-10-vs-cg-20-37"
                className="text-foreground font-medium underline underline-offset-2"
              >
                CG 20 10 vs CG 20 37
              </Link>
            </p>
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
            Managing properties rather than projects? See{" "}
            <Link
              href="/coi-tracking-for-property-managers"
              className="text-foreground font-medium underline underline-offset-2"
            >
              COI tracking for property managers
            </Link>
            .
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
