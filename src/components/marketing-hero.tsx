import { INK_BG, InkAtmosphere } from "@/components/ink-atmosphere";
import { LiveOpsTicker } from "@/components/live-activity";
import Link from "next/link";

/**
 * The dark hero band every secondary marketing page opens with.
 *
 * Extracted because /pricing, /security and /help had already grown three
 * near-identical copies, and the SEO build adds twenty more pages. Beyond DRY
 * there is a correctness reason: `h1` lives here, so every page gets exactly
 * one — the failure mode when each page hand-rolls its own hero is two `h1`s
 * or none, and both are hard to notice by eye.
 */
export function MarketingHero({
  eyebrow,
  title,
  subtitle,
  breadcrumb,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
  /** Visible breadcrumb trail. The JSON-LD equivalent is emitted by the page. */
  breadcrumb?: readonly { name: string; path: string }[];
  wide?: boolean;
}) {
  return (
    <section className={`relative overflow-hidden ${INK_BG}`}>
      <InkAtmosphere variant="top" />
      <div
        className={`relative mx-auto ${wide ? "max-w-5xl" : "max-w-3xl"} px-4 pt-14 pb-12 sm:px-6 md:pt-20 md:pb-14`}
      >
        {breadcrumb?.length ? (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-white/45">
              {breadcrumb.map((crumb, i) => (
                <li key={crumb.path} className="flex items-center gap-1.5">
                  {i > 0 ? <span aria-hidden>/</span> : null}
                  <Link
                    href={crumb.path}
                    className="transition-colors hover:text-white/80"
                  >
                    {crumb.name}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
          {eyebrow}
        </p>
        <div className="mt-4">
          <LiveOpsTicker />
        </div>
        <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-balance text-white md:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <div className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
            {subtitle}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The answer-first block (docs/02 §5.1). Rendered with a stable
 * `data-answer` hook so the page's `speakable` JSON-LD can point at it — that
 * pairing is what tells an answer engine "this paragraph is the extract".
 */
export function AnswerBlock({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-answer
      className="border-brand/30 bg-brand/[0.06] rounded-xl border p-5 md:p-6"
    >
      <p className="text-brand text-xs font-semibold tracking-[0.16em] uppercase">
        Short answer
      </p>
      <p className="mt-2 text-[0.975rem] leading-[1.7] font-medium text-balance">
        {children}
      </p>
    </div>
  );
}
