import { INK_BG, InkAtmosphere, SURFACE_BG } from "@/components/ink-atmosphere";
import { LiveOpsTicker } from "@/components/live-activity";
import { MarketingShell } from "@/components/marketing-shell";
import type { Metadata } from "next";

// Verbatim from docs/02-BRANDING_SEO.md §3; `absolute` bypasses the title template.
export const metadata: Metadata = {
  title: { absolute: "Security & Data Protection — CertShield" },
  description:
    "US-hosted, encrypted at rest and in transit, strict data isolation. How CertShield protects your vendor and insurance data.",
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
    a: "No. Extracted fields stay in your tenant. Human corrections become golden-set regression cases for accuracy testing — not public model training.",
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
    a: "Vercel, Supabase/AWS (US), OpenRouter to Anthropic, Resend, Postmark, Twilio (SMS), Paddle (billing), Documenso (e-sign), Sentry (when enabled).",
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
      <section className={`relative overflow-hidden ${INK_BG}`}>
        <InkAtmosphere variant="top" />
        <div className="relative mx-auto max-w-3xl px-4 pt-14 pb-12 sm:px-6 md:pt-20 md:pb-14">
          <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
            Trust
          </p>
          <div className="mt-4">
            <LiveOpsTicker />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">
            Security
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Answers to the questions buyers ask before trusting COI and W-9 data
            with CertShield.
          </p>
        </div>
      </section>

      <main
        className={`${SURFACE_BG} mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16`}
      >
        <ol className="bg-card divide-y rounded-xl border border-border/80 shadow-xs">
          {QUESTIONS.map((item, i) => (
            <li key={item.q} className="flex gap-4 px-5 py-4">
              <span
                className="text-brand w-5 shrink-0 pt-px text-sm font-semibold tabular-nums"
                aria-hidden
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="space-y-1.5">
                <h2 className="text-sm font-semibold">{item.q}</h2>
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
