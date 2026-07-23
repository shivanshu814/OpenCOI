import { MarketingShell } from "@/components/marketing-shell";

export const metadata = {
  title: "Terms of Service — CertShield",
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl px-4 py-16 text-sm leading-relaxed sm:px-6">
        <p className="text-sm font-semibold tracking-[0.14em] text-emerald-600 uppercase">
          Legal
        </p>
        <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight">
          Terms of Service
        </h1>
        <p className="text-muted-foreground mt-2 text-xs">
          Last updated: 2026-07-23
        </p>
        <div className="mt-8 max-w-2xl space-y-6">
          <p>
            CertShield provides document review assistance for certificates of
            insurance and related vendor compliance documents. It is{" "}
            <strong>not</strong> legal, insurance, or professional advice. You
            remain solely responsible for vendor selection, coverage decisions,
            and final approval of every verdict.
          </p>
          <p>
            Service is sold via Paddle (merchant of record). Liability for paid
            service is capped at fees paid in the prior 12 months. No warranty
            of compliance outcomes or guaranteed detection of mid-term
            cancellations.
          </p>
          <p>
            Acceptable use: no unlawful content, no attempting to bypass
            multi-tenant isolation, no SMS without TCPA consent logged
            in-product.
          </p>
          <p className="text-muted-foreground border-t pt-6 text-xs">
            Template terms for launch — counsel review planned at ~$5K MRR.
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
