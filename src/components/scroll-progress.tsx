"use client";

import { useEffect, useRef } from "react";

/**
 * Thin brand-coloured progress line pinned to the bottom edge of the sticky
 * header. On a page this long it answers "how much is left?", which is the only
 * reason to have it — it is not decoration.
 *
 * Written against the DOM with a rAF-throttled passive scroll listener and a
 * scaleX transform, so it never re-renders React and never triggers layout.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;

    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.transform = `scaleX(${p})`;
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
    >
      <div
        ref={ref}
        className="from-brand via-brand to-brand/50 h-full origin-left scale-x-0 bg-gradient-to-r"
      />
    </div>
  );
}
