import { MarketingShell } from "@/components/marketing-shell";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — CertShield",
};

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl px-4 py-16 text-sm leading-relaxed sm:px-6">
        <p className="text-sm font-semibold tracking-[0.14em] text-emerald-600 uppercase">
          Legal
        </p>
        <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground mt-2 text-xs">
          Last updated: 2026-07-23
        </p>
        <div className="mt-8 max-w-2xl space-y-6">
          <p>
            We collect account email, organization profile, vendor contact
            data, uploaded PDFs, extraction metadata (cost, latency,
            confidence, model version), and audit events needed to operate the
            service.
          </p>
          <p>
            Data is stored in the United States (Supabase / AWS + Vercel).
            TIN/SSN on W-9s are field-level encrypted and masked. See{" "}
            <Link
              href="/security"
              className="text-foreground font-medium underline underline-offset-2"
            >
              Security
            </Link>{" "}
            for subprocessors.
          </p>
          <p>
            CCPA: California residents may request access or deletion of
            personal information by emailing privacy@getcertshield.com. We do
            not sell personal information.
          </p>
          <p>
            Retention: after cancellation, tenant data is deleted per our
            retention window (target ≤90 days) except records we must keep for
            legal or billing disputes.
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
