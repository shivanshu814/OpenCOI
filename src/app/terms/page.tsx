import { MarketingShell } from "@/components/marketing-shell";

export const metadata = {
  title: "Terms of Service — CertShield",
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-14 text-sm leading-relaxed">
        <h1 className="text-3xl font-semibold tracking-tight text-[#0F2A43]">
          Terms of Service
        </h1>
        <p className="text-muted-foreground text-xs">Last updated: 2026-07-23</p>
        <p>
          CertShield provides document review assistance for certificates of
          insurance and related vendor compliance documents. It is{" "}
          <strong>not</strong> legal, insurance, or professional advice. You
          remain solely responsible for vendor selection, coverage decisions, and
          final approval of every verdict.
        </p>
        <p>
          Service is sold via Paddle (merchant of record). Liability for paid
          service is capped at fees paid in the prior 12 months. No warranty of
          compliance outcomes or guaranteed detection of mid-term cancellations.
        </p>
        <p>
          Acceptable use: no unlawful content, no attempting to bypass
          multi-tenant isolation, no SMS without TCPA consent logged in-product.
        </p>
        <p className="text-muted-foreground text-xs">
          Template terms for launch — counsel review planned at ~$5K MRR.
        </p>
      </main>
    </MarketingShell>
  );
}
