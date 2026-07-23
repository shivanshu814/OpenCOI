import { CheckoutButton } from "@/components/checkout-button";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
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

export default function HomePage() {
  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="relative overflow-hidden border-b border-[#0F2A43]/10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(22,163,74,0.12),_transparent_55%),linear-gradient(180deg,#F7FAFC_0%,#FFFFFF_70%)]"
        />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-4 py-20 md:py-28">
          <p className="text-sm font-semibold tracking-[0.14em] text-[#16A34A] uppercase">
            CertShield
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-[#0F2A43] md:text-5xl">
            Never work with an uninsured vendor again.
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
            CertShield reads vendor insurance certificates with AI, flags expired
            or insufficient coverage, and chases renewals automatically — so the
            liability never lands on you.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <CheckoutButton planId="starter" label="Start at $99/mo" />
            <Button variant="outline" size="lg" render={<Link href="/login" />}>
              Free 3-cert audit
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Live in a day. No annual contract. Built for US property managers and
            contractors.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-[#0F2A43]">
          COI tracking that replaces the spreadsheet
        </h2>
        <ul className="mt-8 max-w-3xl space-y-4">
          {bullets.map((b) => (
            <li key={b} className="flex gap-3 text-base leading-relaxed">
              <span
                className="mt-2 size-2 shrink-0 rounded-full bg-[#16A34A]"
                aria-hidden
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-[#0F2A43]/10 bg-[#0F2A43]/[0.03]">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-[#0F2A43]">
            What we claim — and what we don&apos;t
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
            We catch expirations and chase renewals automatically. Mid-term
            cancellations aren&apos;t broadcast by carriers — no tool can
            guarantee catching a silent cancellation. We mitigate via agent
            confirmations, notice-of-cancellation endorsements, and re-verification
            on every new cert.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button render={<Link href="/pricing" />}>See pricing</Button>
            <Button variant="outline" render={<Link href="/app" />}>
              Open app
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
