import { INK_BG, InkAtmosphere, SURFACE_BG } from "@/components/ink-atmosphere";
import { LiveOpsTicker } from "@/components/live-activity";
import { MarketingShell } from "@/components/marketing-shell";
import Link from "next/link";

export const metadata = {
  title: "Help — CertShield",
  description: "How to use CertShield: upload, review, chase, portal, API.",
};

const SECTIONS = [
  {
    title: "Upload a COI",
    body: "In the app, open Upload, pick a vendor, drop the PDF (or tap Use on a sample COI). Same samples appear on the vendor portal. Extraction runs in the background; every verdict goes to internal review before publish until the Month 3 accuracy gate.",
  },
  {
    title: "Review & publish",
    body: "Review queue shows founder/admin checks. Approve & publish, then accept or override as the customer (you are always the final approver).",
  },
  {
    title: "Chase renewals",
    body: "Email chase sequences run EN/ES. SMS only after TCPA opt-in on the vendor. Portal magic links need no password.",
  },
  {
    title: "Agent confirmation",
    body: "From review, request Confirm/Deny from the producer. This mitigates mid-term cancellations — we never claim automatic detection.",
  },
  {
    title: "API & Zapier",
    body: "In Settings, open API and create a cs_live_ key. GET /api/v1/vendors with Authorization: Bearer … Webhooks fire on document.published and vendor.status_changed.",
  },
  {
    title: "Export packs",
    body: "Vendor: Litigation pack (ZIP). Property: Audit pack (ZIP). For owners, audits, or counsel.",
  },
];

export default function HelpPage() {
  return (
    <MarketingShell>
      <section className={`relative overflow-hidden ${INK_BG}`}>
        <InkAtmosphere variant="top" />
        <div className="relative mx-auto max-w-3xl px-4 pt-14 pb-12 sm:px-6 md:pt-20 md:pb-14">
          <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
            Support
          </p>
          <div className="mt-4">
            <LiveOpsTicker />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">
            Help center
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Short answers for day-one operators. Need a human?{" "}
            <a
              className="font-medium text-white underline-offset-2 hover:underline"
              href="mailto:support@getcertshield.com"
            >
              support@getcertshield.com
            </a>{" "}
            (24h weekday SLA).
          </p>
        </div>
      </section>

      <main
        className={`${SURFACE_BG} mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 md:py-16`}
      >
        <div className="bg-card divide-y rounded-xl border border-border/80 shadow-xs">
          {SECTIONS.map((s) => (
            <section key={s.title} className="space-y-1.5 px-5 py-4">
              <h2 className="text-sm font-semibold">{s.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {s.body}
              </p>
            </section>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          Also see{" "}
          <Link
            href="/security"
            className="hover:text-foreground underline underline-offset-2"
          >
            Security
          </Link>
          ,{" "}
          <Link
            href="/pricing"
            className="hover:text-foreground underline underline-offset-2"
          >
            Pricing
          </Link>
          , and the disclaimer on every report.
        </p>
      </main>
    </MarketingShell>
  );
}
