import { INK_BG, InkAtmosphere, SURFACE_BG } from "@/components/ink-atmosphere";
import { LiveBadge, LiveOpsTicker } from "@/components/live-activity";
import { MarketingShell } from "@/components/marketing-shell";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service — CertShield",
  description:
    "CertShield terms of service: document review assistance, Paddle billing, liability cap, and acceptable use.",
};

const SECTIONS = [
  {
    title: "What CertShield is",
    body: "CertShield provides document review assistance for certificates of insurance and related vendor compliance documents. It is not legal, insurance, or professional advice. You remain solely responsible for vendor selection, coverage decisions, and final approval of every verdict.",
  },
  {
    title: "Billing & liability",
    body: "Service is sold via Paddle (merchant of record). Liability for paid service is capped at fees paid in the prior 12 months. No warranty of compliance outcomes or guaranteed detection of mid-term cancellations.",
  },
  {
    title: "Acceptable use",
    body: "No unlawful content, no attempting to bypass multi-tenant isolation, and no SMS without TCPA consent logged in-product.",
  },
];

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <LiveBadge
              label="Live"
              className="border-white/15 bg-white/10 text-white ring-white/20"
            />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Last updated: 2026-07-23 · Binding for all CertShield workspaces
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
          Questions about these terms? Email{" "}
          <a
            className="text-foreground font-medium underline-offset-2 hover:underline"
            href="mailto:hello@getcertshield.app"
          >
            hello@getcertshield.app
          </a>
          . Also see{" "}
          <Link
            href="/privacy"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            Privacy
          </Link>{" "}
          and{" "}
          <Link
            href="/security"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            Security
          </Link>
          .
        </p>
      </main>
    </MarketingShell>
  );
}
