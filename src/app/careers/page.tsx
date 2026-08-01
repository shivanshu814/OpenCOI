import { INK_BG, InkAtmosphere, SURFACE_BG } from "@/components/ink-atmosphere";
import { LiveBadge, LiveOpsTicker } from "@/components/live-activity";
import { ROLES } from "@/content/careers";
import { MarketingShell } from "@/components/marketing-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Careers — Open Roles at CertShield COI Tracking Startup",
  description:
    "Join CertShield: pre-launch AI COI tracking for US property managers and general contractors. Open sales role, remote, commission-only uncapped.",
  path: "/careers",
});

/**
 * Kept intentionally short. Startup with one open role and no cargo-culted
 * "our values" block — we're a solo founder pre-launch, so honesty about the
 * stage does more than a corporate pitch. Roles live in `content/careers.ts`
 * so the sitemap lists every role page too.
 */

export default function CareersPage() {
  return (
    <MarketingShell>
      <section className={`relative overflow-hidden ${INK_BG}`}>
        <InkAtmosphere variant="top" />
        <div className="relative mx-auto max-w-3xl px-4 pt-14 pb-12 sm:px-6 md:pt-20 md:pb-14">
          <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
            Company
          </p>
          <div className="mt-4">
            <LiveOpsTicker />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Careers
            </h1>
            <LiveBadge
              label="Hiring"
              className="border-white/15 bg-white/10 text-white ring-white/20"
            />
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70">
            Solo-founder startup, pre-launch, building AI-powered COI tracking
            for US property managers and small general contractors. If a role
            below matches what you want to do, apply. If nothing fits, email{" "}
            <a
              className="text-white underline-offset-2 hover:underline"
              href="mailto:hello@getcertshield.app"
            >
              hello@getcertshield.app
            </a>{" "}
            anyway — we&rsquo;re small enough to make room for the right person.
          </p>
        </div>
      </section>

      <main
        className={`${SURFACE_BG} mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6 md:py-16`}
      >
        <div className="bg-card divide-y overflow-hidden rounded-xl border border-border/80 shadow-xs">
          <div className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r" />
          {ROLES.map((role) => (
            <Link
              key={role.slug}
              href={role.href}
              className="hover:bg-muted/40 group flex flex-wrap items-center justify-between gap-4 px-5 py-5 transition-colors"
            >
              <div className="space-y-1">
                <h2 className="text-base font-semibold">{role.title}</h2>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {role.location} · {role.comp}
                </p>
              </div>
              <span className="text-brand inline-flex items-center gap-1 text-sm font-medium">
                Read the role
                <ArrowRight
                  className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:translate-x-1"
                  strokeWidth={2.25}
                />
              </span>
            </Link>
          ))}
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Not seeing your role? Email{" "}
          <a
            className="text-foreground font-medium underline-offset-2 hover:underline"
            href="mailto:hello@getcertshield.app"
          >
            hello@getcertshield.app
          </a>{" "}
          with what you&rsquo;d do here and why it fits.
        </p>
      </main>
    </MarketingShell>
  );
}
