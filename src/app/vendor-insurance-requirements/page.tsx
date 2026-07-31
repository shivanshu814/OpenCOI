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
import Link from "next/link";

const TITLE = "Vendor Insurance Requirements by Trade (2026)";
const DESCRIPTION =
  "Commonly required liability limits and endorsements for roofers, plumbers, electricians, landscapers, janitorial and more — in one table.";
const PATH = "/vendor-insurance-requirements";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "vendor insurance requirements by trade",
    "subcontractor insurance requirements",
    "contractor insurance limits",
    "coi requirements checklist",
  ],
});

type TradeRow = {
  trade: string;
  tier: "Low" | "Medium" | "High";
  gl: string;
  umbrella: string;
  auto: string;
  wc: string;
  extras: string;
  why: string;
};

/**
 * Commonly observed requirement bands, not advice. Written as ranges on
 * purpose — a single number here would read as a standard we are in no
 * position to set for someone else's contracts (docs/08 §3 liability strategy).
 */
const TRADES: readonly TradeRow[] = [
  {
    trade: "Janitorial / cleaning",
    tier: "Low",
    gl: "$1M / $2M",
    umbrella: "Optional",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Crime / employee dishonesty where keys are held",
    why: "Frequency risk — slips, chemical exposure, property access",
  },
  {
    trade: "Landscaping / grounds",
    tier: "Low",
    gl: "$1M / $2M",
    umbrella: "Optional",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Confirm no height or tree-work exclusion",
    why: "Vehicles and equipment do more damage than the work itself",
  },
  {
    trade: "Painting / drywall",
    tier: "Low",
    gl: "$1M / $2M",
    umbrella: "$1M",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Completed operations; lead/asbestos where pre-1978 stock",
    why: "Overspray and surface-prep damage claims are common",
  },
  {
    trade: "Plumbing",
    tier: "Medium",
    gl: "$1M / $2M",
    umbrella: "$1M–$2M",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Completed operations mandatory; per-project aggregate on large jobs",
    why: "Water damage propagates through multiple units quickly",
  },
  {
    trade: "HVAC",
    tier: "Medium",
    gl: "$1M / $2M",
    umbrella: "$1M–$2M",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Completed operations; pollution for refrigerant work",
    why: "Condensate and refrigerant losses surface long after install",
  },
  {
    trade: "Appliance / general handyman",
    tier: "Medium",
    gl: "$1M / $2M",
    umbrella: "Optional",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Confirm scope is not broader than the policy classification",
    why: "Classification mismatch is the usual coverage failure here",
  },
  {
    trade: "Electrical",
    tier: "High",
    gl: "$1M / $2M",
    umbrella: "$1M–$5M",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Completed operations mandatory; per-project aggregate",
    why: "Fire is the loss, and fire claims are catastrophic and delayed",
  },
  {
    trade: "Roofing",
    tier: "High",
    gl: "$1M / $2M",
    umbrella: "$2M–$5M",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Completed operations mandatory; confirm no hot-work exclusion",
    why: "Falls, torch-down fire, and water intrusion discovered years later",
  },
  {
    trade: "Tree work",
    tier: "High",
    gl: "$1M / $2M",
    umbrella: "$1M–$2M",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Confirm no height exclusion; verify equipment coverage",
    why: "Heights, chainsaws, and damage to adjacent property",
  },
  {
    trade: "Elevator / structural",
    tier: "High",
    gl: "$2M / $4M",
    umbrella: "$5M+",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Completed operations for the full statute of repose",
    why: "Life-safety exposure and very long claim tails",
  },
  {
    trade: "Pest control",
    tier: "Medium",
    gl: "$1M / $2M",
    umbrella: "$1M",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Pollution liability — chemical application is often GL-excluded",
    why: "The exact exposure is commonly carved out of a standard GL policy",
  },
  {
    trade: "Security services",
    tier: "Medium",
    gl: "$1M / $2M",
    umbrella: "$1M–$2M",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Confirm no assault-and-battery exclusion; professional liability",
    why: "The loss you are insuring against is frequently excluded by default",
  },
  {
    trade: "Snow removal",
    tier: "Medium",
    gl: "$1M / $2M",
    umbrella: "$1M–$2M",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Confirm snow and ice operations are not excluded",
    why: "Slip-and-fall frequency plus a short, contested causation window",
  },
  {
    trade: "Architect / engineer",
    tier: "Medium",
    gl: "$1M / $2M",
    umbrella: "$1M",
    auto: "$1M CSL",
    wc: "Statutory + $1M EL",
    extras: "Professional liability (E&O) $1M–$2M, claims-made with tail",
    why: "The exposure is design error, which general liability does not cover",
  },
];

const ENDORSEMENTS = [
  {
    name: "Additional insured — ongoing operations",
    form: "CG 20 10 (or blanket equivalent)",
    when: "Every vendor, every trade",
  },
  {
    name: "Additional insured — completed operations",
    form: "CG 20 37 (or blanket equivalent)",
    when: "Anything that can fail after the job ends",
  },
  {
    name: "Primary and non-contributory",
    form: "CG 20 01 (or blanket wording)",
    when: "Every vendor — it keeps their claim off your policy",
  },
  {
    name: "Waiver of subrogation — general liability",
    form: "CG 24 04 (or blanket)",
    when: "Every vendor",
  },
  {
    name: "Waiver of subrogation — workers' compensation",
    form: "WC 00 03 13 (or state equivalent)",
    when: "Any vendor whose employees are physically on your property",
  },
  {
    name: "Per-project aggregate",
    form: "CG 25 03 / CG 25 04",
    when: "Large jobs, where a shared annual aggregate would be meaningless",
  },
  {
    name: "Notice of cancellation to certificate holder",
    form: "Carrier-specific",
    when: "Where the carrier will write it — the only real defense against a silent lapse",
  },
];

const FAQ = [
  {
    q: "What insurance should I require from a vendor?",
    a: "At minimum, commercial general liability at $1,000,000 per occurrence and $2,000,000 aggregate, statutory workers' compensation with $1,000,000 employers liability, and $1,000,000 combined single limit commercial auto — plus additional insured status for both ongoing and completed operations, primary and non-contributory wording, and waivers of subrogation. High-hazard trades add umbrella coverage on top.",
  },
  {
    q: "Should insurance requirements vary by trade?",
    a: "Yes, by hazard rather than by contract value. A $900 electrical repair can cause a building fire; a $90,000 painting contract rarely causes a severe injury. Two or three tiers is usually enough to capture the difference without becoming unenforceable.",
  },
  {
    q: "How many requirement tiers should I have?",
    a: "Two or three. A bespoke schedule per vendor becomes a stack of exceptions, and exceptions are where uninsured vendors hide. Tiers you actually enforce beat a perfect schedule you cannot audit.",
  },
  {
    q: "What if a vendor cannot meet the required limits?",
    a: "Options are a documented, time-boxed exception approved by whoever owns the risk, requiring an umbrella that closes the gap, or narrowing their scope to lower-hazard work. What fails is an undocumented exception that outlives the person who granted it.",
  },
  {
    q: "Are these requirements legally binding standards?",
    a: "No. They are commonly observed market practices collected for reference. The limits and endorsements you put into a contract should be set with your broker and counsel against your own exposure, your policy, and your owner and lender obligations.",
  },
];

export default function VendorRequirementsPage() {
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
            { name: "Requirements by trade", path: PATH },
          ]),
          faqPageSchema(FAQ),
        )}
      />

      <MarketingHero
        eyebrow="Reference"
        title="Vendor insurance requirements by trade"
        subtitle="What property managers and general contractors commonly require, trade by trade — limits, umbrella, and the endorsements that do the real work."
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: "Requirements by trade", path: PATH },
        ]}
        wide
      />

      <main className={`${SURFACE_BG}`}>
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 md:py-16">
          <div className="max-w-3xl">
            <AnswerBlock>
              Most US property managers and general contractors require vendors
              to carry at least $1,000,000 per occurrence and $2,000,000
              aggregate general liability, statutory workers&rsquo; compensation
              with $1,000,000 employers liability, and $1,000,000 combined single
              limit commercial auto. High-hazard trades — roofing, electrical,
              tree work, elevator and structural — commonly add $1,000,000 to
              $5,000,000 of umbrella coverage, and completed-operations
              additional insured status is treated as non-negotiable.
            </AnswerBlock>
          </div>

          <aside className="border-border/80 bg-card rounded-xl border p-5 shadow-xs">
            <p className="text-sm font-semibold">Reference, not advice</p>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              These are commonly observed requirement bands, collected to help
              you sanity-check a list you already have. The numbers that go into
              your contracts should be set with your broker and counsel against
              your own exposure. CertShield provides document review assistance
              — not legal, insurance, or professional advice.
            </p>
          </aside>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Limits by trade
            </h2>
            <div className="border-border/80 bg-card overflow-x-auto rounded-xl border shadow-xs">
              <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border/80 border-b">
                    {[
                      "Trade",
                      "Hazard",
                      "GL each occ / agg",
                      "Umbrella",
                      "Auto",
                      "Workers' comp",
                      "Also require",
                    ].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-3 text-xs font-semibold tracking-wide uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border/60 divide-y">
                  {TRADES.map((row) => (
                    <tr key={row.trade}>
                      <th
                        scope="row"
                        className="px-4 py-3 text-left align-top font-medium"
                      >
                        {row.trade}
                        <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                          {row.why}
                        </span>
                      </th>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={
                            row.tier === "High"
                              ? "rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700"
                              : row.tier === "Medium"
                                ? "rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700"
                                : "rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          }
                        >
                          {row.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top tabular-nums">
                        {row.gl}
                      </td>
                      <td className="px-4 py-3 align-top tabular-nums">
                        {row.umbrella}
                      </td>
                      <td className="px-4 py-3 align-top tabular-nums">
                        {row.auto}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 align-top">
                        {row.wc}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 align-top leading-relaxed">
                        {row.extras}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground text-xs">
              GL = commercial general liability. CSL = combined single limit. EL
              = employers liability.
            </p>
          </section>

          <section className="max-w-3xl space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              The endorsements matter more than the numbers
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A vendor with $5,000,000 in limits and no additional insured
              endorsement has bought protection for themselves, not for you. The
              list below costs the vendor very little and does most of the actual
              work.
            </p>
            <div className="border-border/80 bg-card overflow-x-auto rounded-xl border shadow-xs">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border/80 border-b">
                    {["Endorsement", "Form", "When to require it"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-3 text-xs font-semibold tracking-wide uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border/60 divide-y">
                  {ENDORSEMENTS.map((e) => (
                    <tr key={e.name}>
                      <th
                        scope="row"
                        className="px-4 py-3 text-left align-top font-medium"
                      >
                        {e.name}
                      </th>
                      <td className="text-muted-foreground px-4 py-3 align-top">
                        {e.form}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 align-top leading-relaxed">
                        {e.when}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground text-sm">
              Not sure what these forms do?{" "}
              <Link
                href="/glossary"
                className="text-foreground font-medium underline underline-offset-2"
              >
                Every one is defined in the glossary
              </Link>
              .
            </p>
          </section>

          <section className="max-w-3xl space-y-4">
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

          <section className="border-brand/30 bg-brand/[0.06] max-w-3xl space-y-2 rounded-xl border p-6">
            <h2 className="text-base font-semibold">
              Check your vendors against this list automatically
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              CertShield stores your requirements once and compares every
              incoming certificate against them — limits, dates and endorsements
              — with a person reviewing every verdict before it publishes.
            </p>
            <Link
              href="/free-audit"
              className="text-brand inline-flex text-sm font-semibold underline-offset-4 hover:underline"
            >
              Try it on three certificates, free →
            </Link>
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
