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

const TITLE = "COI Tracking for Property Managers — CertShield";
const DESCRIPTION =
  "Vendor certificate tracking built for property management companies: AI reads every COI, checks endorsements, and chases renewals in English and Spanish.";
const PATH = "/coi-tracking-for-property-managers";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "coi tracking for property managers",
    "property management vendor insurance",
    "certificate of insurance tracking property management",
    "vendor compliance property manager",
  ],
});

const PAINS = [
  {
    title: "Certificates arrive by email and stay there",
    body: "A vendor's agent sends a PDF to whoever asked for it. It gets read once, filed somewhere, and never revisited. Twelve months later nobody can say whether that vendor is still insured — and the certificate that would have told you is in a thread from last March.",
  },
  {
    title: "Renewals are remembered, not tracked",
    body: "Every expiration date you need is printed on a certificate you already have. The failure is not knowing — it is that nothing turns those dates into an action on a Tuesday morning when three units are flooding.",
  },
  {
    title: "The endorsement page never gets opened",
    body: "The certificate says additional insured. The endorsement that would prove it is a separate page that nobody requested. This is the single most common gap on real certificates, and it is invisible until a claim.",
  },
  {
    title: "Owners ask for evidence you cannot produce quickly",
    body: "An owner, a lender or an insurer asks which vendors were compliant last quarter. Reconstructing that from a shared drive takes a day, and the answer is a folder rather than a record.",
  },
];

const FEATURES = [
  {
    title: "Every certificate read in full",
    body: "Including scans, phone photos and the endorsement pages. Anything the model is less than 90% confident about goes to a person before you see a verdict.",
  },
  {
    title: "Your requirements, per property",
    body: "Store the limits and endorsements you actually require and compare every incoming document against them — not against a generic template.",
  },
  {
    title: "Chasing that happens without you",
    body: "Reminder sequences go to the vendor's insurance producer with the vendor copied, escalating on a cadence, in English and Spanish.",
  },
  {
    title: "A traffic-light board, not a folder",
    body: "One screen showing who is compliant, who is expiring, and who needs attention today — sorted by how close the problem is.",
  },
  {
    title: "Evidence you can hand over",
    body: "An append-only trail of every document, verdict, correction and message, exportable as an audit pack per property or a litigation pack per vendor.",
  },
  {
    title: "A vendor portal with no password",
    body: "Vendors upload through a magic link. No account to create, no password to forget, no reason for a document to sit in someone's inbox.",
  },
];

const FAQ = [
  {
    q: "What is COI tracking for property managers?",
    a: "COI tracking is the process of collecting each vendor's certificate of insurance, verifying that coverage limits, dates and endorsements meet your written requirements, chasing renewals before policies expire, and keeping a dated record of all of it. For property managers it typically covers maintenance trades, contractors and any vendor with access to a property.",
  },
  {
    q: "How many vendors before a property manager needs COI software?",
    a: "Roughly twenty-five with a single requirement tier is where a maintained spreadsheet stops keeping up. The other triggers are requirements that vary by property or owner, more than one person editing the tracker, and any obligation to produce history rather than current state.",
  },
  {
    q: "Does CertShield integrate with AppFolio or Buildium?",
    a: "CSV import and email forwarding today, which works with every system. Native two-way sync is on the roadmap, and Business-plan customers get it first.",
  },
  {
    q: "Can vendors submit certificates themselves?",
    a: "Yes, through a magic-link portal with no password and no account. They can also simply reply to the chase email with the PDF attached, and it is ingested automatically.",
  },
  {
    q: "How long does setup take?",
    a: "Same day. Send a vendor list as CSV or an export from your property management system, and your existing certificates can be read and scored immediately — a compliance snapshot within 24 hours.",
  },
  {
    q: "Will this tell me if a vendor's policy is cancelled mid-term?",
    a: "No, and no tool can promise that — carriers do not broadcast mid-term cancellations to certificate holders. Expirations and renewals are caught and chased automatically. Mid-term cancellation risk is mitigated with written producer confirmations, notice-of-cancellation endorsements in your requirements, and re-verification on every new document.",
  },
];

export default function PropertyManagersPage() {
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
            { name: "For property managers", path: PATH },
          ]),
          softwareApplicationSchema(),
          faqPageSchema(FAQ),
        )}
      />

      <MarketingHero
        eyebrow="For property management companies"
        title="COI tracking for property managers"
        subtitle="Built for the 20-to-2,000-unit firm where vendor compliance is somebody's second job — not a department. Live the same day, from $99 a month."
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: "For property managers", path: PATH },
        ]}
        wide
      />

      <main className={`${SURFACE_BG}`}>
        <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6 md:py-16">
          <AnswerBlock>
            COI tracking software for property managers collects vendor
            certificates of insurance, reads them with AI, checks limits,
            expiration dates and additional-insured endorsements against your
            written requirements, and chases renewals automatically before
            coverage lapses. CertShield does this for property management
            companies from $99 per month, with a person reviewing every verdict
            before it publishes.
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
              What actually goes wrong
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {PAINS.map((p) => (
                <div
                  key={p.title}
                  className="border-border/80 bg-card space-y-2 rounded-xl border p-5 shadow-xs"
                >
                  <h3 className="text-sm font-semibold">{p.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              What CertShield does about it
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="border-border/80 bg-card space-y-2 rounded-xl border p-5 shadow-xs"
                >
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              The vendors this matters most for
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Severity, not spend, is what should drive your requirements. The
              cheap trades are often the dangerous ones — a $900 electrical
              repair can burn a building, and a roofer&rsquo;s work fails years
              after the invoice is paid.
            </p>
            <p className="text-muted-foreground text-sm">
              Typical limits and endorsements for every trade are in the{" "}
              <Link
                href="/vendor-insurance-requirements"
                className="text-foreground font-medium underline underline-offset-2"
              >
                requirements table
              </Link>
              .
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
            Managing subcontractors instead of properties? See{" "}
            <Link
              href="/subcontractor-insurance-tracking"
              className="text-foreground font-medium underline underline-offset-2"
            >
              subcontractor insurance tracking
            </Link>
            .
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
