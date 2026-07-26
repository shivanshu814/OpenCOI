"use client";

import { useEffect, useRef } from "react";

/**
 * A small brand ring that trails the cursor across the marketing pages.
 *
 * The native cursor is NEVER hidden or replaced — this is a companion, not a
 * substitute, so precision and familiarity are untouched. The ring lags the
 * pointer on a lerp and swells over interactive elements, which does two jobs:
 * the lag makes every mouse movement produce visible motion (the "page is
 * alive" feel), and the swell is an extra affordance on top of hover states.
 *
 * Engineering notes:
 * - One persistent rAF loop writing a transform — no React state, no layout
 *   reads after the initial style. The loop parks itself (cancels rAF) once
 *   the ring has converged, so an idle page burns zero frames.
 * - Mouse-only: never runs on touch/pen, where a trailing ring is noise.
 * - Skipped under `prefers-reduced-motion`, torn down live if the setting
 *   flips.
 * - `pointer-events-none` + `aria-hidden`: invisible to hit-testing and AT.
 */
export function CursorGlint() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const motionOk = window.matchMedia(
      "(prefers-reduced-motion: no-preference)",
    );
    const mouseOk = window.matchMedia("(hover: hover) and (pointer: fine)");

    let raf = 0;
    let shown = false;
    let x = -100;
    let y = -100;
    let tx = -100;
    let ty = -100;
    let scale = 1;
    let tscale = 1;

    const step = () => {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      scale += (tscale - scale) * 0.2;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      // Park the loop once converged; the next pointermove restarts it.
      if (
        Math.abs(tx - x) > 0.1 ||
        Math.abs(ty - y) > 0.1 ||
        Math.abs(tscale - scale) > 0.002
      ) {
        raf = requestAnimationFrame(step);
      } else {
        raf = 0;
      }
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      tx = event.clientX;
      ty = event.clientY;
      if (!shown) {
        shown = true;
        // First sighting: appear AT the cursor instead of streaking across.
        x = tx;
        y = ty;
        el.style.opacity = "1";
      }
      const interactive = (event.target as Element | null)?.closest?.(
        "a, button, [role='button'], input, textarea, select, summary",
      );
      tscale = interactive ? 1.9 : 1;
      wake();
    };

    const onLeave = () => {
      shown = false;
      el.style.opacity = "0";
    };

    const start = () => {
      document.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    };
    const stop = () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      raf = 0;
      el.style.opacity = "0";
      shown = false;
    };

    const sync = () => {
      stop();
      if (motionOk.matches && mouseOk.matches) start();
    };

    sync();
    motionOk.addEventListener("change", sync);
    return () => {
      motionOk.removeEventListener("change", sync);
      stop();
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="border-brand/60 bg-brand/[0.06] pointer-events-none fixed top-0 left-0 z-[60] size-8 rounded-full border opacity-0 transition-opacity duration-300"
    />
  );
}
