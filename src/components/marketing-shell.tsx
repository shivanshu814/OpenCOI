import { BrandMark } from "@/components/certshield-logo";
import { CursorGlint } from "@/components/cursor-glint";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { GoogleAnalytics } from "@/components/google-analytics";
import { JsonLd } from "@/components/json-ld";
import { MarketingHeader } from "@/components/marketing-header";
import { SmoothScroll } from "@/components/smooth-scroll";
import { routesByGroup } from "@/lib/seo/routes";
import { graph, organizationSchema, websiteSchema } from "@/lib/seo/schema";
import { ORG } from "@/lib/seo/site";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export { BrandMark } from "@/components/certshield-logo";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const groups = routesByGroup();

  return (
    <div className="bg-background flex min-h-full flex-col">
      {/*
        The Organization + WebSite entity, emitted once per marketing page.
        It lives here rather than in the root layout because the root layout
        also wraps the authenticated workspace and the vendor portal, and a
        company entity asserted on a magic-link page is noise. Pages add their
        own nodes (Article, FAQPage, …) and reference this one by @id, so the
        graph resolves to one company rather than thirty.
      */}
      <JsonLd data={graph(organizationSchema(), websiteSchema())} />

      {/*
        GA4 lives here, not in the root layout, for the same reason as the
        entity graph — and one sharper one: the root layout wraps `/portal`,
        `/sign` and `/confirm`, whose URLs carry a vendor's one-time token.
        gtag reports the full URL, so a global mount would hand those tokens
        to Google. Marketing surfaces have no such secret in the path.
      */}
      <GoogleAnalytics />

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
        {/*
          A real site index, not a five-link row.
          Two jobs: crawlers reach every indexable page from any page (nothing
          orphaned, and internal links are the cheapest ranking lever we have),
          and a reader who lands on a definition post from a search result can
          see the whole surface without going back.
        */}
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
            <div className="space-y-3 lg:max-w-xs">
              <BrandMark markSize={24} wordmarkClassName="text-white text-sm" />
              <p className="text-xs leading-relaxed text-white/40">
                {ORG.tagline}
              </p>
              <Link
                href="/pricing"
                className="hover:text-brand group inline-flex items-center gap-1 text-sm font-medium text-white transition-colors"
              >
                See pricing
                <ArrowRight
                  className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:translate-x-1"
                  strokeWidth={2.25}
                  aria-hidden
                />
              </Link>
              {/*
                Address surfaced on every page — Paddle verification checks
                that a real contact is one click from the homepage, and
                mail apps + spam filters look for a visible reply-to when
                deciding whether a domain looks legitimate.
              */}
              <a
                href="mailto:hello@getcertshield.app"
                className="block text-xs text-white/40 transition-colors hover:text-white"
              >
                hello@getcertshield.app
              </a>
              {/*
                Product Hunt's official badge for our launch page (post
                1212021). PH is one of the two live profiles in `SAME_AS` —
                the visible link and the JSON-LD assert the same entity.
              */}
              <a
                href="https://www.producthunt.com/products/certshield?utm_source=badge-featured&utm_medium=badge"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block opacity-80 transition-opacity hover:opacity-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1212021&theme=dark"
                  alt="CertShield on Product Hunt"
                  width={250}
                  height={54}
                  loading="lazy"
                />
              </a>
              {/*
                "Listed on" strip — plain facts, no achievement claims.
                Every profile here is live and also asserted in `SAME_AS`.
                Earned-only rule: rating/award badges (G2, Capterra, SF
                achievements) may only be added once actually earned.
              */}
              <p className="text-xs text-white/40">
                Listed on{" "}
                <a
                  href="https://www.producthunt.com/products/certshield"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 transition-colors hover:text-white"
                >
                  Product Hunt
                </a>
                {" · "}
                <a
                  href="https://www.saashub.com/certshield"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 transition-colors hover:text-white"
                >
                  SaaSHub
                </a>
                {" · "}
                <a
                  href="https://sourceforge.net/projects/certshield/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 transition-colors hover:text-white"
                >
                  SourceForge
                </a>
              </p>
            </div>

            <nav
              aria-label="Site"
              className="grid flex-1 gap-8 sm:grid-cols-3 lg:max-w-3xl lg:grid-cols-5"
            >
              {groups.map((group) => (
                <div key={group.group} className="space-y-3">
                  <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-white/35 uppercase">
                    {group.group}
                  </p>
                  <ul className="space-y-2 text-sm text-white/55">
                    {group.routes.map((route) => (
                      <li key={route.path}>
                        <Link
                          href={route.path}
                          className="from-brand to-brand bg-gradient-to-r bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat transition-[background-size,color] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:bg-[length:100%_1px] hover:text-white"
                        >
                          {route.label}
                        </Link>
                      </li>
                    ))}
                    {group.group === "Product" ? (
                      <li>
                        <Link
                          href="/login"
                          className="transition-colors hover:text-white"
                        >
                          Sign in
                        </Link>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
        <DisclaimerFooter className="relative border-white/10 bg-transparent text-white/40 [&_a]:text-white/50 [&_a:hover]:text-white" />
      </footer>
    </div>
  );
}
