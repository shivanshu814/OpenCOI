import { MarketingShell } from "@/components/marketing-shell";

export const metadata = {
  title: "Security — CertShield",
  description:
    "Where CertShield stores data, who can see it, AI subprocessors, and deletion policy.",
};

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "Where is data stored?",
    a: "US-region Supabase (Postgres + Storage) and Vercel. We do not store customer COIs in India.",
  },
  {
    q: "Who can see my vendors’ certificates?",
    a: "Only members of your organization, via Postgres row-level security. CertShield staff access production only for support incidents, logged.",
  },
  {
    q: "What AI vendor do you use?",
    a: "Claude via OpenRouter for COI extraction. Model version, cost, latency, and confidence are logged per document. Temperature is 0.",
  },
  {
    q: "Do you train models on our PDFs?",
    a: "No. Extractions fields stay in your tenant. Human corrections become golden-set regression cases for accuracy testing — not public model training.",
  },
  {
    q: "How are W-9 / TIN numbers protected?",
    a: "Field-level encrypted at rest, masked in the UI (***-**-1234), visible to org Admins only, deletable on offboarding per retention policy.",
  },
  {
    q: "Encryption?",
    a: "TLS in transit; encryption at rest via our US cloud providers. API keys are hashed; portal and agent-confirm links use hashed tokens.",
  },
  {
    q: "Backups & restore?",
    a: "Daily database backups with a tested restore checklist (ops). Point-in-time recovery available via Supabase.",
  },
  {
    q: "Subprocessors?",
    a: "Vercel, Supabase/AWS (US), OpenRouter → Anthropic, Resend, Postmark, Twilio (SMS), Paddle (billing), Documenso (e-sign), Sentry (when enabled).",
  },
  {
    q: "Deletion / export?",
    a: "Litigation and audit export packs are available in-app. Full tenant deletion on written request after cancellation (retention window in Privacy Policy).",
  },
  {
    q: "Is this legal or insurance advice?",
    a: "No. Every verdict surface carries: Document review assistance — not legal, insurance, or professional advice. You remain the final approver.",
  },
];

export default function SecurityPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-16 sm:px-6">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-emerald-600 uppercase">
            Trust
          </p>
          <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight">
            Security
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Answers to the questions buyers ask before trusting COI and W-9
            data with CertShield.
          </p>
        </div>
        <ol className="divide-y rounded-xl border">
          {QUESTIONS.map((item, i) => (
            <li key={item.q} className="flex gap-4 px-5 py-4">
              <span
                className="text-muted-foreground w-5 shrink-0 pt-px text-sm font-medium tabular-nums"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="space-y-1.5">
                <h2 className="text-foreground text-sm font-semibold">
                  {item.q}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.a}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </main>
    </MarketingShell>
  );
}
