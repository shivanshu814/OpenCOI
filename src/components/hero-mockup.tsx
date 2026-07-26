"use client";

import { TiltCard } from "@/components/tilt-card";
import { TypedText } from "@/components/typed-text";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Hero illustration — abstract, not a product screenshot: no browser chrome, no
 * fake customer names, no typing/toast theatre (that's `product-preview.tsx`,
 * used further down the page and on /login).
 *
 * Copy here is deliberately jargon-free — this card is the first thing a
 * stranger sees, so it says "Insurance valid", not "GL + WC verified", and
 * "Missing a required form", not "CG 20 37 not attached". The trade codes are
 * introduced later on the page, once the reader knows why they matter.
 *
 * It animates because "we watch this continuously" IS the product: the score
 * counts up, the traffic-light bar grows, rows stagger in, a slow sweep reads
 * the header, the expiry ticks down, and the footer cycles live activity.
 * Everything is decorative (`aria-hidden`) and everything stops under
 * `prefers-reduced-motion`.
 */

const ROWS: {
  label: string;
  /** `{days}` is substituted with the ticking countdown. */
  detail: string;
  status: string;
  dot: string;
  pill: string;
  swatch: string;
  /** Statuses that are "in motion" get a pulsing dot. */
  pulse?: boolean;
}[] = [
  {
    label: "Roofing vendor",
    detail: "Insurance valid",
    status: "Covered",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    swatch: "from-emerald-400/25 to-emerald-600/10",
  },
  {
    label: "HVAC vendor",
    detail: "Expires in {days} days",
    status: "Expiring",
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-700 ring-amber-600/15",
    swatch: "from-amber-400/25 to-amber-600/10",
    pulse: true,
  },
  {
    label: "Plumbing vendor",
    detail: "Missing a required form",
    status: "Needs fixing",
    dot: "bg-red-500",
    pill: "bg-red-50 text-red-700 ring-red-600/15",
    swatch: "from-red-400/25 to-red-600/10",
    pulse: true,
  },
];

/** Traffic-light split of the illustrated portfolio (green / amber / red / grey). */
const SEGMENTS = [
  { key: "covered", className: "bg-emerald-500", width: "58%" },
  { key: "expiring", className: "bg-amber-400", width: "18%" },
  { key: "fixing", className: "bg-red-500", width: "14%" },
  { key: "missing", className: "bg-slate-300", width: "10%" },
];

/** Footer ticker — the ongoing work, which is what customers actually pay for. */
const ACTIVITY = [
  { text: "Reading the insurance forms…", tone: "bg-brand" },
  { text: "Renewal reminder sent", tone: "bg-emerald-500" },
  { text: "Missing form flagged for review", tone: "bg-red-500" },
  { text: "Watching 3 expiry dates", tone: "bg-amber-400" },
  { text: "Checked and filed as proof", tone: "bg-emerald-500" },
];

const EXPIRY_DAYS = [21, 20, 19, 18];

const SCORE = 72;

/** Counts 0 → target once on mount. Returns `target` immediately when disabled. */
function useCountUp(target: number, enabled: boolean, durationMs = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, durationMs]);

  return enabled ? value : target;
}

function useInterval(callback: () => void, ms: number | null) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);
  useEffect(() => {
    if (ms === null) return;
    const id = window.setInterval(() => saved.current(), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

export function HeroMockup({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const animate = !usePrefersReducedMotion();

  const score = useCountUp(SCORE, animate);
  const [activityIdx, setActivityIdx] = useState(0);
  const [dayIdx, setDayIdx] = useState(0);

  useInterval(
    () => setDayIdx((i) => (i + 1) % EXPIRY_DAYS.length),
    animate ? 5200 : null,
  );

  const activity = ACTIVITY[activityIdx];
  const days = EXPIRY_DAYS[dayIdx];

  return (
    <div aria-hidden className={cn("relative", className)} style={style}>
      {/* Soft brand halo + a single lifted edge behind the card */}
      <div className="bg-brand/20 absolute -inset-10 rounded-[3rem] blur-3xl" />
      <div className="absolute inset-x-5 top-5 bottom-0 translate-y-2 rounded-3xl bg-white/10" />

      {/* The card tips toward the cursor and rests on a slow float. The halo
          behind it stays put, so the two separate slightly as it moves — which
          is what actually sells the depth. */}
      <TiltCard>
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl bg-white shadow-[0_32px_80px_-24px_rgba(8,20,38,0.55)] ring-1 ring-white/25",
            animate && "cs-float",
          )}
        >
          {/* Header — score + traffic-light distribution */}
          <div className="relative overflow-hidden border-b border-slate-100 px-6 pt-6 pb-5">
            {animate ? (
              <div
                className="cs-scan-sweep from-brand/15 pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b to-transparent"
                style={{ animationDuration: "5s" }}
              />
            ) : null}

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                  Vendors properly insured
                </p>
                <p className="text-foreground mt-2 text-4xl leading-none font-semibold tabular-nums tracking-tight">
                  {score}
                  <span className="text-xl text-slate-300">%</span>
                </p>
              </div>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/15 ring-inset">
                <Check className="size-3" strokeWidth={3} />
                Proof on file
              </span>
            </div>

            <div className="relative mt-5 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
              {SEGMENTS.map((s, i) => (
                <div
                  key={s.key}
                  className={cn(s.className, animate && "cs-grow-x")}
                  style={{
                    width: s.width,
                    animationDelay: animate ? `${120 + i * 90}ms` : undefined,
                  }}
                />
              ))}
            </div>

            <div className="relative mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                Covered
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-2 rounded-full bg-amber-400",
                    animate && "animate-pulse",
                  )}
                />
                Expiring
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500" />
                Needs fixing
              </span>
            </div>
          </div>

          {/* Abstract vendor rows */}
          <ul>
            {ROWS.map((row, i) => (
              <li
                key={row.label}
                className={cn(
                  "flex items-center gap-3.5 px-6 py-4",
                  i < ROWS.length - 1 && "border-b border-slate-100",
                  animate &&
                    "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500",
                )}
                style={{ animationDelay: animate ? `${i * 110}ms` : undefined }}
              >
                <span
                  className={cn(
                    "size-9 shrink-0 rounded-xl bg-gradient-to-br ring-1 ring-black/5",
                    row.swatch,
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-semibold">
                    {row.label}
                  </p>
                  <p
                    key={row.detail.includes("{days}") ? days : row.detail}
                    className={cn(
                      "mt-0.5 truncate text-xs text-slate-500",
                      animate && "animate-in fade-in duration-500",
                    )}
                  >
                    {row.detail.replace("{days}", String(days))}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 ring-inset",
                    row.pill,
                  )}
                >
                  {row.pulse && animate ? (
                    <span className="relative flex size-1.5">
                      <span
                        className={cn(
                          "absolute inline-flex size-full animate-ping rounded-full opacity-50",
                          row.dot,
                        )}
                      />
                      <span
                        className={cn(
                          "relative inline-flex size-1.5 rounded-full",
                          row.dot,
                        )}
                      />
                    </span>
                  ) : (
                    <span className={cn("size-1.5 rounded-full", row.dot)} />
                  )}
                  {row.status}
                </span>
              </li>
            ))}
          </ul>

          {/* Footer — live activity ticker */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-3.5">
            <span className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-slate-500">
              <span className="relative flex size-1.5 shrink-0">
                {animate ? (
                  <span
                    className={cn(
                      "absolute inline-flex size-full animate-ping rounded-full opacity-50",
                      activity.tone,
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative inline-flex size-1.5 rounded-full",
                    activity.tone,
                  )}
                />
              </span>
              {animate ? (
                <TypedText
                  phrases={ACTIVITY.map((a) => a.text)}
                  className="min-w-0"
                  onIndexChange={setActivityIdx}
                />
              ) : (
                <span className="truncate">Checked around the clock</span>
              )}
            </span>
            <span className="text-brand shrink-0 text-[11px] font-semibold">
              Reminders on
            </span>
          </div>
        </div>
      </TiltCard>
    </div>
  );
}
