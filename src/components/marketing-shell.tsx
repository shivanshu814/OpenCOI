import { BrandMark } from "@/components/certshield-logo";
import { CursorGlint } from "@/components/cursor-glint";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { MarketingHeader } from "@/components/marketing-header";
import { SmoothScroll } from "@/components/smooth-scroll";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

/** Footer carries the header's four items plus Help, which the header drops. */
const nav = [
  { href: "/#product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/login", label: "Free Audit" },
  { href: "/help", label: "Help" },
];

export { BrandMark } from "@/components/certshield-logo";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-full flex-col">
      {/* Inertia scrolling for marketing surfaces only — the app keeps native. */}
      <SmoothScroll />
      {/* Trailing cursor ring — companion to the native cursor, never a replacement. */}
      <CursorGlint />
      <MarketingHeader />

      <div className="flex-1">{children}</div>

      <footer className="relative overflow-hidden border-t border-white/10 bg-[oklch(0.28_0.056_248)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 50% 80% at 10% 50%, oklch(0.68 0.14 163 / 0.25), transparent)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-10 text-sm sm:px-6">
          <div className="space-y-2">
            <BrandMark markSize={24} wordmarkClassName="text-white text-sm" />
            <p className="max-w-xs text-xs leading-relaxed text-white/40">
              Never work with an uninsured vendor again.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/55">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="from-brand to-brand bg-gradient-to-r bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat transition-[background-size,color] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:bg-[length:100%_1px] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/login" className="transition-colors hover:text-white">
              Sign in
            </Link>
            <Link
              href="/pricing"
              className="group inline-flex items-center gap-1 font-medium text-white transition-colors hover:text-brand"
            >
              See pricing
              <ArrowRight
                className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:translate-x-1"
                strokeWidth={2.25}
                aria-hidden
              />
            </Link>
          </div>
        </div>
        <DisclaimerFooter className="relative border-white/10 bg-transparent text-white/40 [&_a]:text-white/50 [&_a:hover]:text-white" />
      </footer>
    </div>
  );
}
