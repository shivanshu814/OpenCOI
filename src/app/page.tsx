import { CheckoutButton } from "@/components/checkout-button";
import { INK_BG, InkAtmosphere, SURFACE_BG } from "@/components/ink-atmosphere";
import { LiveOpsTicker } from "@/components/live-activity";
import { MarketingShell } from "@/components/marketing-shell";
import {
  ExtractionPreviewCard,
  PortfolioPreviewCard,
} from "@/components/product-preview";
import { Button } from "@/components/ui/button";
import {
  Check,
  CheckCircle2,
  FileUp,
  Mail,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
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

const steps: {
  n: string;
  title: string;
  body: string;
  icon: LucideIcon;
  meta: string;
}[] = [
  {
    n: "01",
    title: "Forward or upload the COI",
    body: bullets[0],
    icon: FileUp,
    meta: "~40 seconds",
  },
  {
    n: "02",
    title: "Chase runs by itself",
    body: bullets[1],
    icon: Mail,
    meta: "EN + ES email",
  },
  {
    n: "03",
    title: "You approve, we file",
    body: bullets[2],
    icon: ShieldCheck,
    meta: "Audit-ready",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$99",
    note: "25 vendors",
    planId: "starter" as const,
    highlights: ["AI COI verification", "EN/ES email chase", "Audit trail"],
  },
  {
    name: "Pro",
    price: "$249",
    note: "100 vendors",
    planId: "pro" as const,
    featured: true,
    highlights: [
      "Everything in Starter",
      "Owner reports",
      "Priority review queue",
    ],
  },
  {
    name: "Business",
    price: "$499",
    note: "Unlimited",
    planId: "business" as const,
    highlights: ["Unlimited vendors", "API & webhooks", "White-label chase"],
  },
];

const honesty = {
  weDo: [
    "Catch expirations and chase renewals automatically",
    "Verify limits, endorsements, and expiration dates",
    "Human-review every verdict before publish",
  ],
  weDont: [
    "Guarantee catching silent mid-term cancellations",
    "Give legal or insurance advice",
    "Auto-approve without your final say",
  ],
};

export default function HomePage() {
  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className={`relative overflow-hidden ${INK_BG}`}>
        <InkAtmosphere />
        <div className="relative mx-auto grid max-w-6xl items-center gap-x-14 gap-y-12 px-4 pt-16 pb-20 sm:px-6 md:pt-24 md:pb-28 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,24rem)]">
          <div>
            <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
              COI tracking for property managers &amp; contractors
            </p>
            <div className="mt-4">
              <LiveOpsTicker />
            </div>
            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-white md:text-5xl lg:text-[3.25rem]">
              Never work with an uninsured vendor again.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/65 md:text-lg">
              CertShield reads vendor insurance certificates with AI, flags
              expired or insufficient coverage, and chases renewals
              automatically — so the liability never lands on you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CheckoutButton
                planId="starter"
                label="Start at $99/mo"
                className="bg-brand text-brand-foreground hover:bg-brand/90 h-10 px-5 text-sm font-semibold shadow-xs"
              />
              <Button
                variant="outline"
                size="lg"
                className="h-10 border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white dark:bg-transparent"
                render={<Link href="/login" />}
              >
                Free 3-cert audit
              </Button>
            </div>
            <p className="mt-5 text-sm text-white/45">
              Live in a day. No annual contract. Built for US property managers
              and contractors.
            </p>
          </div>

          <div aria-hidden className="hidden lg:block">
            <PortfolioPreviewCard />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
                How it works
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                COI tracking that replaces the spreadsheet
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed md:text-base">
                Three steps from PDF to audit trail — no spreadsheet follow-ups,
                no guessing on endorsements.
              </p>
            </div>
            <Button variant="outline" size="sm" render={<Link href="/login" />}>
              Try a free audit
            </Button>
          </div>

          <ol className="relative mt-12 grid gap-5 md:grid-cols-3 md:gap-6">
            {/* Connector line across cards (desktop) */}
            <div
              aria-hidden
              className="from-brand/40 via-brand/20 to-brand/40 absolute top-[2.75rem] right-[16%] left-[16%] hidden h-px bg-gradient-to-r md:block"
            />

            {steps.map((step) => (
              <li key={step.n} className="relative">
                <div className="bg-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.18)] transition-transform duration-300 hover:-translate-y-0.5">
                  {/* Top accent bar */}
                  <div className="from-brand via-brand/70 to-brand/30 h-1 w-full bg-gradient-to-r" />

                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span className="bg-brand-muted text-brand relative z-10 flex size-11 items-center justify-center rounded-xl shadow-xs ring-1 ring-brand/15">
                        <step.icon className="size-5" strokeWidth={1.75} />
                      </span>
                      <span className="text-brand/50 text-xs font-semibold tabular-nums tracking-wider">
                        {step.n}
                      </span>
                    </div>

                    <h3 className="mt-5 text-base font-semibold tracking-tight sm:text-lg">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                      {step.body}
                    </p>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/80 ring-inset">
                        <span className="bg-brand size-1.5 rounded-full" />
                        {step.meta}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Certificate decoded */}
      <section className={`relative overflow-hidden border-b ${INK_BG}`}>
        <InkAtmosphere variant="soft" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-x-14 gap-y-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div>
            <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
              ACORD 25, read line by line
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance text-white md:text-3xl">
              The certificate, decoded.
            </h2>
            <ul className="mt-8 space-y-4">
              {bullets.map((b) => (
                <li
                  key={b}
                  className="flex gap-3 text-sm leading-relaxed text-white/70 md:text-base"
                >
                  <CheckCircle2
                    className="text-brand mt-0.5 size-5 shrink-0"
                    aria-hidden
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div aria-hidden>
            <ExtractionPreviewCard />
          </div>
        </div>
      </section>

      {/* Honesty */}
      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="max-w-xl">
            <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
              Honesty
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              What we claim — and what we don&apos;t
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed md:text-base">
              Mid-term cancellations aren&apos;t broadcast by carriers — no tool
              can guarantee catching a silent cancellation. We mitigate via
              agent confirmations, notice-of-cancellation endorsements, and
              re-verification on every new cert.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="bg-card overflow-hidden rounded-2xl border border-border/80 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.18)]">
              <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50/80 px-5 py-3.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Check className="size-4" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    What we do
                  </p>
                  <p className="text-[11px] font-medium text-emerald-700/70">
                    Built into every workflow
                  </p>
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {honesty.weDo.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 px-5 py-3.5 text-sm leading-relaxed"
                  >
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card overflow-hidden rounded-2xl border border-border/80 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.18)]">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-slate-200/80 text-slate-600">
                  <X className="size-4" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    What we don&apos;t
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">
                    No overselling — by design
                  </p>
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {honesty.weDont.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 px-5 py-3.5 text-sm leading-relaxed text-slate-600"
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <X className="size-2.5" strokeWidth={3} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
                Pricing
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                Simple plans. No annual contract.
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                Live in a day. Cancel anytime. Free 3-cert audit included.
              </p>
            </div>
            <Button variant="outline" render={<Link href="/pricing" />}>
              Compare plans
            </Button>
          </div>

          <div className="mt-10 grid items-stretch gap-5 sm:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={
                  p.featured
                    ? "bg-card relative flex flex-col overflow-hidden rounded-2xl border border-brand/40 shadow-[0_16px_48px_-16px_rgba(0,184,132,0.35)] ring-2 ring-brand/25"
                    : "bg-card relative flex flex-col overflow-hidden rounded-2xl border border-border/80 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.18)]"
                }
              >
                {p.featured ? (
                  <div className="bg-brand text-brand-foreground px-5 py-1.5 text-center text-[11px] font-semibold tracking-wide uppercase">
                    Most popular
                  </div>
                ) : (
                  <div className="from-brand/80 via-brand/40 to-transparent h-1 bg-gradient-to-r" />
                )}

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold tracking-tight">
                      {p.name}
                    </p>
                    <p className="text-muted-foreground text-xs font-medium">
                      {p.note}
                    </p>
                  </div>
                  <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
                    {p.price}
                    <span className="text-muted-foreground text-sm font-normal">
                      /mo
                    </span>
                  </p>

                  <ul className="mt-5 flex-1 space-y-2.5 border-t border-slate-100 pt-5">
                    {p.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-2 text-sm leading-snug"
                      >
                        <Check
                          className="text-brand mt-0.5 size-3.5 shrink-0"
                          aria-hidden
                        />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <CheckoutButton
                      planId={p.planId}
                      label={`Choose ${p.name}`}
                      variant={p.featured ? "default" : "outline"}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={`relative overflow-hidden ${INK_BG}`}>
        <InkAtmosphere variant="top" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 md:py-20">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-white md:text-4xl">
            Vendor insurance compliance on autopilot.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <CheckoutButton
              planId="starter"
              label="Start at $99/mo"
              className="bg-brand text-brand-foreground hover:bg-brand/90 h-10 px-5 text-sm font-semibold shadow-xs"
            />
            <Button
              variant="outline"
              size="lg"
              className="h-10 border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white dark:bg-transparent"
              render={<Link href="/login" />}
            >
              Free 3-cert audit
            </Button>
          </div>
          <p className="mt-5 text-sm text-white/45">
            Live in a day. No annual contract.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
