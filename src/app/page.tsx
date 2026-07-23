import { CheckoutButton } from "@/components/checkout-button";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Check, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "COI Tracking Software for Property Managers — CertShield",
  description:
    "AI reads vendor insurance certificates, flags gaps, and chases renewals automatically. Never work with an uninsured vendor again. From $99/mo.",
};

const bullets = [
  "AI reads ACORD COIs and verifies limits, expiration dates, and endorsements (CG 20 10, CG 20 37, waivers).",
  "Auto-chase renewals by email in English and Spanish — no spreadsheet follow-ups.",
  "Every verdict is human-reviewed before publishing, with an audit-ready document trail.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "CertShield",
      url: "https://getcertshield.com",
      description:
        "CertShield is vendor insurance compliance software for US property managers and contractors. Its AI reads certificates of insurance (ACORD forms), verifies coverage limits, additional-insured endorsements, and expiration dates against each company's requirements, then automatically chases vendors and their insurance agents for renewals by email (English and Spanish). Every verdict is human-reviewed before publishing, with audit-ready document trails. CertShield replaces spreadsheet-based COI tracking at SMB pricing, from $99/month. Founded in 2026.",
    },
    {
      "@type": "SoftwareApplication",
      name: "CertShield",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "99",
        highPrice: "499",
        priceCurrency: "USD",
        offerCount: 3,
      },
      description:
        "AI vendor insurance compliance for US property managers and contractors. COIs read, verified, and chased automatically.",
    },
  ],
};

/** Purely illustrative product panel — decorative, hidden from AT. */
const sampleRows = [
  { vendor: "Roofing vendor", detail: "GL + WC verified", status: "Compliant", dot: "bg-emerald-500", text: "text-emerald-600" },
  { vendor: "HVAC vendor", detail: "GL expires in 21 days", status: "Expiring", dot: "bg-amber-400", text: "text-amber-600" },
  { vendor: "Plumbing vendor", detail: "GL limit below requirement", status: "Non-compliant", dot: "bg-red-500", text: "text-red-600" },
  { vendor: "Landscaping vendor", detail: "COI requested — chase sent", status: "Missing docs", dot: "bg-slate-400", text: "text-slate-500" },
];

/** Purely illustrative "certificate, decoded" rows — decorative, hidden from AT. */
const certRows = [
  { field: "GL each occurrence", value: "$1,000,000", ok: true },
  { field: "GL general aggregate", value: "$2,000,000", ok: true },
  { field: "Expiration date", value: "04/12/2027", ok: true },
  { field: "Additional insured — CG 20 10", value: "Attached", ok: true },
  { field: "Additional insured — CG 20 37", value: "Not found", ok: false },
  { field: "Waiver of subrogation", value: "Included", ok: true },
];

const steps = [
  { n: "01", title: "Forward or upload the COI", body: bullets[0] },
  { n: "02", title: "Chase runs by itself", body: bullets[1] },
  { n: "03", title: "You approve, we file", body: bullets[2] },
];

const plans = [
  { name: "Starter", price: "$99" },
  { name: "Pro", price: "$249" },
  { name: "Business", price: "$499" },
];

export default function HomePage() {
  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero — brand ink navy, the app panel floating on it */}
      <section className="bg-sidebar">
        <div className="mx-auto grid max-w-6xl items-center gap-x-16 gap-y-12 px-4 pt-16 pb-20 sm:px-6 md:pt-24 md:pb-28 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,26rem)]">
          <div>
            <p className="text-sidebar-primary text-xs font-semibold tracking-[0.18em] uppercase">
              COI tracking for property managers &amp; contractors
            </p>
            <h1 className="font-display text-sidebar-accent-foreground mt-5 text-5xl leading-[1.05] font-medium tracking-tight text-balance md:text-6xl">
              Never work with an uninsured vendor again.
            </h1>
            <p className="text-sidebar-foreground mt-6 max-w-xl text-lg leading-relaxed">
              CertShield reads vendor insurance certificates with AI, flags
              expired or insufficient coverage, and chases renewals
              automatically — so the liability never lands on you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CheckoutButton
                planId="starter"
                label="Start at $99/mo"
                className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/85 h-10 px-5 text-sm font-semibold"
              />
              <Button
                variant="outline"
                size="lg"
                className="border-sidebar-border text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-10 bg-transparent px-5 dark:bg-transparent dark:hover:bg-sidebar-accent"
                render={<Link href="/login" />}
              >
                Free 3-cert audit
              </Button>
            </div>
            <p className="text-sidebar-foreground/70 mt-5 text-sm">
              Live in a day. No annual contract. Built for US property managers
              and contractors.
            </p>
          </div>

          <div aria-hidden className="hidden lg:block">
            <div className="bg-card rounded-xl border shadow-2xl shadow-black/30">
              <div className="text-muted-foreground flex items-center justify-between border-b px-4 py-2.5 text-xs font-medium tracking-wide uppercase">
                <span>Vendor compliance</span>
                <span className="tabular-nums">4 vendors</span>
              </div>
              <ul className="divide-y">
                {sampleRows.map((row) => (
                  <li
                    key={row.vendor}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-medium">
                        {row.vendor}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {row.detail}
                      </p>
                    </div>
                    <span
                      className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${row.text}`}
                    >
                      <span className={`size-2 rounded-full ${row.dot}`} />
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="text-muted-foreground border-t px-4 py-2.5 text-xs">
                Illustrative example
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — numbered editorial steps, no icon cards */}
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <h2 className="font-display text-3xl font-medium tracking-tight">
            COI tracking that replaces the spreadsheet
          </h2>
          <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
            {steps.map((step) => (
              <li key={step.n} className="relative">
                <span
                  aria-hidden
                  className="font-display text-muted-foreground/40 text-5xl leading-none font-medium tabular-nums"
                >
                  {step.n}
                </span>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The certificate, decoded — domain-depth ledger */}
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl items-center gap-x-16 gap-y-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-emerald-600 uppercase">
              ACORD 25, read line by line
            </p>
            <h2 className="font-display mt-4 text-3xl font-medium tracking-tight text-balance">
              The certificate, decoded.
            </h2>
            <ul className="mt-8 space-y-4">
              {bullets.map((b) => (
                <li key={b} className="flex gap-3 text-base leading-relaxed">
                  <CheckCircle2
                    className="mt-1 size-5 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div aria-hidden>
            <div className="bg-card rounded-xl border shadow-sm">
              <div className="border-b px-5 py-3">
                <p className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.14em] uppercase">
                  Certificate of liability insurance
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Sample extraction — illustrative
                </p>
              </div>
              <dl className="divide-y">
                {certRows.map((row) => (
                  <div
                    key={row.field}
                    className="flex items-center justify-between gap-4 px-5 py-2.5"
                  >
                    <dt className="text-muted-foreground text-sm">
                      {row.field}
                    </dt>
                    <dd className="flex items-center gap-2 text-sm font-medium tabular-nums">
                      {row.value}
                      {row.ok ? (
                        <span className="flex size-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                          <Check className="size-3" />
                        </span>
                      ) : (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-red-700 uppercase dark:bg-red-500/15 dark:text-red-400">
                          Flag
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Honesty section — verbatim claims copy */}
      <section className="bg-muted/40 border-b">
        <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-6 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,20rem)_1fr] md:py-20">
          <h2 className="font-display text-3xl font-medium tracking-tight">
            What we claim — and what we don&apos;t
          </h2>
          <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
            We catch expirations and chase renewals automatically. Mid-term
            cancellations aren&apos;t broadcast by carriers — no tool can
            guarantee catching a silent cancellation. We mitigate via agent
            confirmations, notice-of-cancellation endorsements, and
            re-verification on every new cert.
          </p>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-12 gap-y-8 px-4 py-14 sm:px-6">
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            {plans.map((p) => (
              <div key={p.name}>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {p.name}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {p.price}
                  <span className="text-muted-foreground text-sm font-normal">
                    /mo
                  </span>
                </p>
              </div>
            ))}
          </div>
          <Button variant="outline" render={<Link href="/pricing" />}>
            Compare plans
          </Button>
        </div>
      </section>

      {/* Final CTA band */}
      <section className="bg-sidebar">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 md:py-20">
          <h2 className="font-display text-sidebar-accent-foreground mx-auto max-w-2xl text-4xl font-medium tracking-tight text-balance">
            Vendor insurance compliance on autopilot.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <CheckoutButton
              planId="starter"
              label="Start at $99/mo"
              className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/85 h-10 px-5 text-sm font-semibold"
            />
            <Button
              variant="outline"
              size="lg"
              className="border-sidebar-border text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-10 bg-transparent px-5 dark:bg-transparent dark:hover:bg-sidebar-accent"
              render={<Link href="/login" />}
            >
              Free 3-cert audit
            </Button>
          </div>
          <p className="text-sidebar-foreground/70 mt-5 text-sm">
            Live in a day. No annual contract.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
