import { INK_BG, InkAtmosphere, SURFACE_BG } from "@/components/ink-atmosphere";
import { LiveBadge, LiveOpsTicker } from "@/components/live-activity";
import { MarketingShell } from "@/components/marketing-shell";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — CertShield",
  description:
    "How CertShield collects, stores, and deletes account, vendor, and COI data. US-region storage. CCPA access and deletion.",
};

const SECTIONS = [
  {
    title: "What we collect",
    body: "We collect account email, organization profile, vendor contact data, uploaded PDFs, extraction metadata (cost, latency, confidence, model version), and audit events needed to operate the service.",
  },
  {
    title: "Where data lives",
    body: "Data is stored in the United States (Supabase / AWS + Vercel). TIN/SSN on W-9s are field-level encrypted and masked. See Security for subprocessors.",
  },
  {
    title: "CCPA",
    body: "California residents may request access or deletion of personal information by emailing privacy@getcertshield.com. We do not sell personal information.",
  },
  {
    title: "Retention",
    body: "After cancellation, tenant data is deleted per our retention window (target ≤90 days) except records we must keep for legal or billing disputes.",
  },
];

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <LiveBadge
              label="US-region"
              className="border-white/15 bg-white/10 text-white ring-white/20"
            />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Last updated: 2026-07-23 · US data only · no model training on your
            PDFs
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
                {s.title === "Where data lives" ? (
                  <>
                    Data is stored in the United States (Supabase / AWS +
                    Vercel). TIN/SSN on W-9s are field-level encrypted and
                    masked. See{" "}
                    <Link
                      href="/security"
                      className="text-foreground font-medium underline-offset-2 hover:underline"
                    >
                      Security
                    </Link>{" "}
                    for subprocessors.
                  </>
                ) : (
                  s.body
                )}
              </p>
            </section>
          ))}
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Privacy requests:{" "}
          <a
            className="text-foreground font-medium underline-offset-2 hover:underline"
            href="mailto:privacy@getcertshield.com"
          >
            privacy@getcertshield.com
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
