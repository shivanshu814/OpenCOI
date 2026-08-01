import { CheckoutButton } from "@/components/checkout-button";
import { INK_BG, InkAtmosphere, SURFACE_BG } from "@/components/ink-atmosphere";
import { LiveOpsTicker } from "@/components/live-activity";
import { MarketingShell } from "@/components/marketing-shell";
import { JsonLd } from "@/components/json-ld";
import { PLANS } from "@/lib/billing/plans";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  faqPageSchema,
  graph,
  softwareApplicationSchema,
  webPageSchema,
} from "@/lib/seo/schema";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

// Verbatim from docs/02-BRANDING_SEO.md §3.
export const metadata: Metadata = pageMetadata({
  title: "CertShield Pricing — COI Tracking from $99/month",
  description:
    "Simple pricing for vendor insurance tracking: Starter $99, Pro $249, Business $499. No annual contract. 2-minute setup, free COI audit included.",
  path: "/pricing",
  keywords: [
    "coi tracking software pricing",
    "certificate of insurance software cost",
    "coi software $99",
  ],
});

const faq = [
  {
    q: "Can I cancel anytime?",
    a: "Yes, monthly plans, no cancellation fee, full data export in one click. We keep customers with results, not contracts.",
  },
  {
    q: "What's included at $99?",
    a: "Starter tracks 25 vendors with AI COI verification (including endorsement checks), EN/ES email chase, dashboard, audit trail, and compliance report PDFs.",
  },
  {
    q: "Is this guaranteed compliance?",
    a: "No. CertShield is document review assistance — not legal, insurance, or professional advice. Every verdict is human-reviewed before publishing; you remain the final approver.",
  },
  {
    q: "Will you catch mid-term cancellations automatically?",
    a: "Expirations and renewals we catch and chase automatically. Mid-term cancellations aren't broadcast by carriers — no tool can guarantee catching a silent cancellation. We mitigate with agent confirmations, notice-of-cancellation endorsements, and re-verification on every new document.",
  },
];

const jsonLd = graph(
  webPageSchema({
    title: "CertShield Pricing — COI Tracking from $99/month",
    description:
      "Simple pricing for vendor insurance tracking: Starter $99, Pro $249, Business $499. No annual contract.",
    path: "/pricing",
  }),
  breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Pricing", path: "/pricing" },
  ]),
  // The price band belongs on the pricing page too, not only on Home — this is
  // the URL an answer engine lands on for "how much does COI software cost".
  softwareApplicationSchema(),
  faqPageSchema(faq),
);

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; promo?: string }>;
}) {
  const params = await searchParams;
  const highlight = params.plan;
  const promo =
    params.promo && /^[a-zA-Z0-9]{1,32}$/.test(params.promo)
      ? params.promo.toUpperCase()
      : null;

  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />

      <section className={`relative overflow-hidden ${INK_BG}`}>
        <InkAtmosphere variant="top" />
        <div className="relative mx-auto max-w-5xl px-4 pt-14 pb-12 sm:px-6 md:pt-20 md:pb-16">
          <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
            Pricing
          </p>
          <div className="mt-4">
            <LiveOpsTicker />
          </div>
          <h1 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-white md:text-4xl">
            Simple pricing for vendor insurance tracking
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
            Starter $99, Pro $249, Business $499. No annual contract. 2-minute
            setup, free COI audit included.
          </p>
          {promo ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-brand/40 bg-brand/10 px-3 py-1.5 text-sm text-white">
              <span className="text-brand font-semibold">Promo {promo}</span>
              <span className="text-white/70">
                will be applied automatically at checkout.
              </span>
            </p>
          ) : null}
        </div>
      </section>

      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-16">
          <div className="grid items-start gap-5 md:grid-cols-3">
            {PLANS.map((plan) => {
              const featured = plan.id === "pro" || plan.id === highlight;
              return (
                <div
                  key={plan.id}
                  className={
                    featured
                      ? "bg-card relative rounded-xl border border-brand/40 p-6 shadow-xs ring-2 ring-brand/30"
                      : "bg-card rounded-xl border border-border/80 p-6 shadow-xs"
                  }
                >
                  {featured ? (
                    <span className="bg-brand text-brand-foreground absolute -top-3 left-6 rounded-md px-2.5 py-0.5 text-xs font-medium">
                      Recommended
                    </span>
                  ) : null}
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold">{plan.name}</h2>
                    <p className="text-muted-foreground text-sm">
                      {plan.vendorLimit == null
                        ? "Unlimited vendors"
                        : `${plan.vendorLimit} vendors`}
                    </p>
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
                    ${plan.priceMonthly}
                    <span className="text-muted-foreground text-base font-normal">
                      /mo
                    </span>
                  </p>
                  <div className="mt-5">
                    <CheckoutButton
                      planId={plan.id}
                      label={`Choose ${plan.name}`}
                      variant={featured ? "default" : "outline"}
                      className="w-full"
                      discountCode={promo}
                    />
                  </div>
                  <ul className="mt-6 space-y-2 border-t pt-5 text-sm leading-relaxed">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check
                          className="text-brand mt-0.5 size-4 shrink-0"
                          aria-hidden
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                    {plan.comingSoon?.map((f) => (
                      <li key={f} className="text-muted-foreground flex gap-2">
                        <span aria-hidden className="w-4 text-center">
                          —
                        </span>
                        <span>{f} (coming soon)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="text-muted-foreground mt-8 text-sm">
            Prefer a free look first?{" "}
            <Link
              href="/free-audit"
              className="text-foreground font-medium underline-offset-2 hover:underline"
            >
              Request a free 3-cert audit
            </Link>{" "}
            — no card required.
          </p>
        </div>
      </section>

      <section className={`${SURFACE_BG}`}>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
          <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
            FAQ
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">
            Common questions
          </h2>
          <dl className="bg-card mt-6 divide-y rounded-xl border border-border/80 shadow-xs">
            {faq.map((item) => (
              <div key={item.q} className="px-5 py-4">
                <dt className="text-sm font-semibold">{item.q}</dt>
                <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </MarketingShell>
  );
}
