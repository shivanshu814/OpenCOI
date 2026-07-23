import { MarketingShell } from "@/components/marketing-shell";
import Link from "next/link";

export const metadata = {
  title: "Help — CertShield",
  description: "How to use CertShield: upload, review, chase, portal, API.",
};

const SECTIONS = [
  {
    title: "Upload a COI",
    body: "App → Upload, pick a vendor, drop the PDF. Extraction runs in the background; every verdict goes to internal review before publish until the Month 3 accuracy gate.",
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
    body: "Settings → API: create a cs_live_ key. GET /api/v1/vendors with Authorization: Bearer … Webhooks fire on document.published and vendor.status_changed.",
  },
  {
    title: "Export packs",
    body: "Vendor → Litigation pack (ZIP). Property → Audit pack (ZIP). For owners, audits, or counsel.",
  },
];

export default function HelpPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-14">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#0F2A43]">
            Help center
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Short answers for day-one operators. Need a human?{" "}
            <a className="underline" href="mailto:support@getcertshield.com">
              support@getcertshield.com
            </a>{" "}
            (24h weekday SLA).
          </p>
        </div>
        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title} className="space-y-2">
              <h2 className="text-sm font-semibold text-[#0F2A43]">
                {s.title}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {s.body}
              </p>
            </section>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          Also see{" "}
          <Link href="/security" className="underline">
            Security
          </Link>
          ,{" "}
          <Link href="/pricing" className="underline">
            Pricing
          </Link>
          , and the disclaimer on every report.
        </p>
      </main>
    </MarketingShell>
  );
}
