import { INK_BG, InkAtmosphere, SURFACE_BG } from "@/components/ink-atmosphere";
import { LiveBadge, LiveOpsTicker } from "@/components/live-activity";
import { MarketingShell } from "@/components/marketing-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Privacy Policy — CertShield",
  description:
    "How CertShield collects, stores, and deletes account, vendor, and COI data. US-region storage. CCPA access and deletion.",
  path: "/privacy",
});

const SECTIONS = [
  {
    title: "What we collect",
    body: "Account email and name from sign-up (including when you use Sign in with Google); organization profile you fill in during onboarding; vendor contact data you upload; the PDFs you or your vendors send us; extraction metadata (cost, latency, confidence, model version) so we can debug bad verdicts; audit events for every document, verdict, and message; IP address and user-agent on every request for abuse and rate-limit control. Billing information is collected by Paddle, not by us — we never see full card numbers.",
  },
  {
    title: "How we use it",
    body: "To provide the service you paid for and nothing else. Extract fields from COIs, run compliance checks, send chase emails to your vendors, generate reports for you, and keep the workspace working. We do not use your data or your vendors' documents to train AI models — the extraction models we use are commercial APIs, not ours, and are configured with the no-training option enabled. We do not sell or rent personal data. We do not run behavioural advertising.",
  },
  {
    title: "Google sign-in",
    body: "If you choose Sign in with Google, we receive your Google account email and basic profile name solely to create or look up your CertShield workspace account and keep you signed in. We do not access Gmail, Drive, Calendar, or Contacts. CertShield's use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. You can revoke access in your Google Account settings at any time.",
  },
  {
    title: "Where data lives",
    body: "All customer data is stored in the United States (us-east-1). Primary storage is Supabase (Postgres, US region) with row-level security enforcing multi-tenant isolation. Documents are in Supabase Storage, US region. TIN/SSN fields on W-9s are field-level encrypted at rest and masked in the UI. Backups follow the Supabase retention window (7 days point-in-time on paid tiers).",
  },
  {
    title: "Who we share it with (subprocessors)",
    body: "The vendors below process personal data on our behalf, each contractually bound to only use it to deliver their service. A full list with locations and purposes lives on the Subprocessors page: Vercel (hosting, US), Supabase (Postgres + storage, US), OpenRouter / Anthropic (AI extraction, US), Resend (outbound email, US), Postmark (inbound email — deferred until requested), Paddle (billing, merchant of record, US/UK), Cloudflare (DNS + email routing, global), Sentry (error tracking, US), Inngest (background jobs, US).",
  },
  {
    title: "Your rights",
    body: "You can access, export, correct, or delete your workspace data from Settings, or by emailing hello@getcertshield.app. California residents (CCPA/CPRA), EU/UK residents (GDPR), and Canadian residents (PIPEDA) have the same rights and we honour them the same way — no jurisdictional obstacle. We will not discriminate against you for exercising any privacy right. Response target: 30 days.",
  },
  {
    title: "Cookies and tracking",
    body: "We set functional cookies only — session, CSRF, theme, and org-context. No third-party ad cookies, no cross-site tracking pixels. If we add basic first-party analytics later we will disclose it here and add a consent banner in EU jurisdictions.",
  },
  {
    title: "Data retention & deletion",
    body: "Active workspace data is retained while your subscription is active. After cancellation, tenant data is deleted within 90 days by default. Records we must keep for legal, tax, or billing-dispute reasons (invoices, receipts, chargeback evidence) are retained for the shorter of the statutory minimum or 7 years. You can request faster deletion via email.",
  },
  {
    title: "Children",
    body: "CertShield is a B2B product; we do not knowingly collect data from anyone under 16. If we learn we have, we delete it immediately.",
  },
  {
    title: "Changes to this policy",
    body: "Material changes are announced by email to the workspace owner at least 14 days before they take effect. Older versions are available on request.",
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
            Last updated: 2026-08-01 · US data only · no model training on your
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
            href="mailto:hello@getcertshield.app"
          >
            hello@getcertshield.app
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
