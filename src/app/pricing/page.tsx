import { CheckoutButton } from "@/components/checkout-button";
import { MarketingShell } from "@/components/marketing-shell";
import { PLANS } from "@/lib/billing/plans";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CertShield Pricing — COI Tracking from $99/month",
  description:
    "Simple pricing for vendor insurance tracking: Starter $99, Pro $249, Business $499. No annual contract. 2-minute setup, free COI audit included.",
};

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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  const highlight = params.plan;

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.14em] text-emerald-600 uppercase">
          Pricing
        </p>
        <h1 className="text-foreground mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance">
          Simple pricing for vendor insurance tracking
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl text-base leading-relaxed">
          Starter $99, Pro $249, Business $499. No annual contract. 2-minute
          setup, free COI audit included.
        </p>

        <div className="mt-12 grid items-start gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const featured = plan.id === "pro" || plan.id === highlight;
            return (
              <div
                key={plan.id}
                className={
                  featured
                    ? "bg-card ring-primary relative rounded-xl border p-6 shadow-sm ring-2"
                    : "bg-card rounded-xl border p-6"
                }
              >
                {featured ? (
                  <span className="bg-primary text-primary-foreground absolute -top-3 left-6 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    Recommended
                  </span>
                ) : null}
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-foreground text-lg font-semibold">
                    {plan.name}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {plan.vendorLimit == null
                      ? "Unlimited vendors"
                      : `${plan.vendorLimit} vendors`}
                  </p>
                </div>
                <p className="text-foreground mt-3 text-3xl font-semibold tracking-tight tabular-nums">
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
                  />
                </div>
                <ul className="mt-6 space-y-2 border-t pt-5 text-sm leading-relaxed">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-emerald-600"
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
            href="/login"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            Request a free 3-cert audit
          </Link>{" "}
          — no card required.
        </p>

        <section className="mt-16 max-w-3xl">
          <h2 className="text-foreground text-xl font-semibold tracking-tight">
            FAQ
          </h2>
          <dl className="mt-6 divide-y rounded-xl border">
            {faq.map((item) => (
              <div key={item.q} className="px-5 py-4">
                <dt className="text-foreground text-sm font-semibold">
                  {item.q}
                </dt>
                <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </MarketingShell>
  );
}
