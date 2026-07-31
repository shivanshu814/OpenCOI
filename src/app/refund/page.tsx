import { INK_BG, InkAtmosphere, SURFACE_BG } from "@/components/ink-atmosphere";
import { LiveBadge, LiveOpsTicker } from "@/components/live-activity";
import { MarketingShell } from "@/components/marketing-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Refund & Cancellation Policy — CertShield",
  description:
    "How to cancel your CertShield subscription and when refunds apply. Paddle is the merchant of record; cancellation and refund requests are honoured within a clear, published policy.",
  path: "/refund",
});

const SECTIONS = [
  {
    title: "Cancelling your subscription",
    body: "You can cancel at any time from your workspace — Settings → Billing. Cancellation takes effect at the end of the current billing period; you keep access to the plan you paid for until then and are not charged again. There are no fees or forms to cancel.",
  },
  {
    title: "Refund window",
    body: "First invoice: full refund on request within 14 days, no questions asked. Later invoices: we refund at our discretion for genuine issues — an unusable service, a billing error we caused, or a plan change we mishandled. Downgrades take effect at the next billing period without a refund of the current one, since the plan is already usable through it.",
  },
  {
    title: "How to request a refund",
    body: "Email hello@getcertshield.app from the address on the workspace, and include the invoice number or Paddle order ID. We reply within one business day. Approved refunds are issued via Paddle to the original payment method and typically appear within 5–10 business days.",
  },
  {
    title: "Merchant of record",
    body: "Paddle handles the transaction, sales tax, and payment method. Refunds are processed through Paddle back to the card or account originally charged. Chargebacks are best avoided by emailing us first — most cases are resolved same-day.",
  },
  {
    title: "Prorated changes on upgrades",
    body: "Upgrading mid-cycle bills a prorated amount for the days remaining on the higher tier. This is Paddle's default behaviour and is shown in the checkout summary before you confirm.",
  },
];

export default function RefundPage() {
  return (
    <MarketingShell>
      <section className={`relative overflow-hidden ${INK_BG}`}>
        <InkAtmosphere variant="top" />
        <div className="relative mx-auto max-w-3xl px-4 pt-14 pb-12 sm:px-6 md:pt-20 md:pb-14">
          <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
            Legal
          </p>
          <div className="mt-4">
            <LiveOpsTicker />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Refund & Cancellation Policy
            </h1>
            <LiveBadge
              label="Live"
              className="border-white/15 bg-white/10 text-white ring-white/20"
            />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Last updated: 2026-07-31 · Applies to every paid CertShield workspace
          </p>
        </div>
      </section>

      <main
        className={`${SURFACE_BG} mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 md:py-16`}
      >
        <div className="bg-card divide-y overflow-hidden rounded-xl border border-border/80 shadow-xs">
          <div className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r" />
          {SECTIONS.map((s) => (
            <section key={s.title} className="space-y-1.5 px-5 py-5">
              <h2 className="text-sm font-semibold">{s.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {s.body}
              </p>
            </section>
          ))}
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Refund or cancellation question? Email{" "}
          <a
            className="text-foreground font-medium underline-offset-2 hover:underline"
            href="mailto:hello@getcertshield.app"
          >
            hello@getcertshield.app
          </a>
          . Also see{" "}
          <Link
            href="/terms"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            Privacy
          </Link>
          .
        </p>
      </main>
    </MarketingShell>
  );
}
