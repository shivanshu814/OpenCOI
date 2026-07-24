import { INK_BG, InkAtmosphere, SURFACE_BG } from "@/components/ink-atmosphere";
import { LiveBadge, LiveOpsTicker } from "@/components/live-activity";
import { MarketingShell } from "@/components/marketing-shell";
import Link from "next/link";

export const metadata = {
  title: "Subprocessors & DPA — CertShield",
  description:
    "The third-party subprocessors CertShield uses to operate the service, what data each handles, and how to request a Data Processing Agreement.",
};

type Row = {
  name: string;
  purpose: string;
  data: string;
  region: string;
};

const SUBPROCESSORS: Row[] = [
  {
    name: "Vercel",
    purpose: "Application hosting / CDN",
    data: "Request metadata, app traffic",
    region: "US",
  },
  {
    name: "Supabase (on AWS)",
    purpose: "Database, storage, auth",
    data: "Account, vendor, COI PDFs, audit events",
    region: "US",
  },
  {
    name: "OpenRouter → Anthropic",
    purpose: "COI extraction (Claude vision)",
    data: "Uploaded COI PDFs at extraction time",
    region: "US",
  },
  {
    name: "Resend",
    purpose: "Outbound email (chase, reports)",
    data: "Recipient email, message content",
    region: "US",
  },
  {
    name: "Postmark",
    purpose: "Inbound email intake (email-in)",
    data: "Forwarded COI emails + attachments",
    region: "US",
  },
  {
    name: "Twilio",
    purpose: "SMS chasing (opt-in only)",
    data: "Vendor phone, message content",
    region: "US",
  },
  {
    name: "Paddle",
    purpose: "Billing (merchant of record)",
    data: "Billing contact, subscription data",
    region: "US / EU",
  },
  {
    name: "Documenso",
    purpose: "Agreement e-sign",
    data: "Agreement documents, signer email",
    region: "US",
  },
  {
    name: "Sentry",
    purpose: "Error / performance monitoring (when enabled)",
    data: "Error metadata, request context",
    region: "US",
  },
];

export default function SubprocessorsPage() {
  return (
    <MarketingShell>
      <section className={`relative overflow-hidden ${INK_BG}`}>
        <InkAtmosphere variant="top" />
        <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-12 sm:px-6 md:pt-20 md:pb-14">
          <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
            Legal
          </p>
          <div className="mt-4">
            <LiveOpsTicker />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Subprocessors &amp; DPA
            </h1>
            <LiveBadge
              label="US-region"
              className="border-white/15 bg-white/10 text-white ring-white/20"
            />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            The third-party services CertShield relies on to operate, and how to
            request a Data Processing Agreement. Last updated: 2026-07-24.
          </p>
        </div>
      </section>

      <main
        className={`${SURFACE_BG} mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 md:py-16`}
      >
        <div className="bg-card overflow-hidden rounded-xl border border-border/80 shadow-xs">
          <div className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground border-b bg-muted/40 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 font-medium">Subprocessor</th>
                  <th className="px-4 py-3 font-medium">Purpose</th>
                  <th className="px-4 py-3 font-medium">Data handled</th>
                  <th className="px-4 py-3 font-medium">Region</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {SUBPROCESSORS.map((r) => (
                  <tr key={r.name} className="align-top">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {r.purpose}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{r.data}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {r.region}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card space-y-2 rounded-xl border border-border/80 px-5 py-5 shadow-xs">
          <h2 className="text-sm font-semibold">Data Processing Agreement</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            A Data Processing Agreement (DPA) is available on request for
            customers who need one. Email{" "}
            <a
              className="text-foreground font-medium underline-offset-2 hover:underline"
              href="mailto:privacy@getcertshield.com"
            >
              privacy@getcertshield.com
            </a>{" "}
            and we will send the current DPA for signature. Material changes to
            this subprocessor list are reflected here.
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Document review assistance — not legal, insurance, or professional
            advice.
          </p>
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          See also{" "}
          <Link
            href="/security"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            Security
          </Link>
          ,{" "}
          <Link
            href="/privacy"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            Privacy
          </Link>
          , and{" "}
          <Link
            href="/terms"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            Terms
          </Link>
          .
        </p>
      </main>
    </MarketingShell>
  );
}
