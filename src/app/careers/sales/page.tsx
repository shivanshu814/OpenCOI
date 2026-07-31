import { CareersApplyForm } from "@/components/careers-apply-form";
import { INK_BG, InkAtmosphere, SURFACE_BG } from "@/components/ink-atmosphere";
import { LiveBadge, LiveOpsTicker } from "@/components/live-activity";
import { MarketingShell } from "@/components/marketing-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Sales — outbound to US property managers · CertShield Careers",
  description:
    "Commission-only, uncapped sales role at a pre-launch AI COI tracking startup. Remote, US-friendly hours.",
  path: "/careers/sales",
});

const SECTIONS = [
  {
    title: "What CertShield is",
    body: "AI-powered Certificate of Insurance tracking for US property managers and small general contractors. We chase vendor documents automatically, verify coverage in seconds, and turn a spreadsheet-and-email process into a dashboard. Pre-launch, self-funded, real product.",
  },
  {
    title: "What you'd actually do",
    body: "Cold outbound to US property managers and small GC shops — email and LinkedIn. Book demos with the founder for anyone interested. Close the ones who want to move. This is the whole scope of the role right now — no CRM cleanup, no marketing, no meetings about meetings.",
  },
  {
    title: "Comp — commission-only, uncapped",
    body: "$75 for every Starter close ($99/mo plan). $125 for every Pro or Business close ($249–$499/mo plans). No base salary. No cap. Paid 7 days after the customer's first payment clears in Paddle (so a refund or chargeback doesn't put you in the negative).",
  },
  {
    title: "The first week",
    body: "Mutual trial. You learn the product, we work outbound together for a few hours a day, we see how you sell it and you see how we work. Commission structure applies from day 1 — anything you close in week 1 pays per the numbers above. At the end of week 1 we both decide whether to keep going.",
  },
  {
    title: "Who this fits",
    body: "Someone who's sold B2B SaaS or services before, writes clean English, and would rather be measured on outcomes than hours. Location doesn't matter, but overlap with US business hours does. Twenty-plus hours a week to start, more if it's working.",
  },
  {
    title: "Who this doesn't fit",
    body: "Someone who needs a base salary right now — we can't offer one. Agencies or teams — we want one person we work with directly. Someone who'd feel weird cold-emailing property managers in Texas from anywhere in the world.",
  },
];

export default function SalesRolePage() {
  return (
    <MarketingShell>
      <section className={`relative overflow-hidden ${INK_BG}`}>
        <InkAtmosphere variant="top" />
        <div className="relative mx-auto max-w-3xl px-4 pt-14 pb-12 sm:px-6 md:pt-20 md:pb-14">
          <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
            <Link href="/careers" className="hover:text-white/70">
              Careers
            </Link>
          </p>
          <div className="mt-4">
            <LiveOpsTicker />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Sales — outbound to US property managers
            </h1>
            <LiveBadge
              label="Open"
              className="border-white/15 bg-white/10 text-white ring-white/20"
            />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Remote · Commission-only, uncapped · Report to founder
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
                {s.body}
              </p>
            </section>
          ))}
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            Apply — takes two minutes
          </h2>
          <CareersApplyForm jobSlug="sales" />
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Questions before applying? Email{" "}
          <a
            className="text-foreground font-medium underline-offset-2 hover:underline"
            href="mailto:hello@getcertshield.app"
          >
            hello@getcertshield.app
          </a>
          .
        </p>
      </main>
    </MarketingShell>
  );
}
