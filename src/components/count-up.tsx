"use client";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up when it scrolls into view, then stops observing.
 * Prefix/suffix are rendered verbatim so "$99" and "~40s" keep their shape.
 *
 * Numbers-over-adjectives is the brand voice (02 §7), so the figures earning
 * the attention is the point — this draws the eye to them once, not forever.
 *
 * The real value — never 0 — is what renders on the server, before the observer
 * fires, and whenever motion is off. This matters: these figures include the
 * plan prices, and a crawler or a no-JS visitor must never be shown "$0/mo".
 * The count only replaces it once the animation is genuinely running.
 */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  durationMs = 1100,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  /** `null` = not counting yet, so render the true value. */
  const [display, setDisplay] = useState<number | null>(null);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;

    let raf = 0;
    let start: number | null = null;

    const run = () => {
      const tick = (now: number) => {
        start ??= now;
        const t = Math.min(1, (now - start) / durationMs);
        setDisplay(Math.round(value * (1 - (1 - t) ** 4)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduced, value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {reduced || display === null ? value : display}
      {suffix}
    </span>
  );
}
