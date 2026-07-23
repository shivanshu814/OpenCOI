import { MarketingShell } from "@/components/marketing-shell";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — CertShield",
};

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-14 text-sm leading-relaxed">
        <h1 className="text-3xl font-semibold tracking-tight text-[#0F2A43]">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground text-xs">Last updated: 2026-07-23</p>
        <p>
          We collect account email, organization profile, vendor contact data,
          uploaded PDFs, extraction metadata (cost, latency, confidence, model
          version), and audit events needed to operate the service.
        </p>
        <p>
          Data is stored in the United States (Supabase / AWS + Vercel). TIN/SSN
          on W-9s are field-level encrypted and masked. See{" "}
          <Link href="/security" className="underline">
            Security
          </Link>{" "}
          for subprocessors.
        </p>
        <p>
          CCPA: California residents may request access or deletion of personal
          information by emailing privacy@getcertshield.com. We do not sell
          personal information.
        </p>
        <p>
          Retention: after cancellation, tenant data is deleted per our retention
          window (target ≤90 days) except records we must keep for legal or
          billing disputes.
        </p>
      </main>
    </MarketingShell>
  );
}
