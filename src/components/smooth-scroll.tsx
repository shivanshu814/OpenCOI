"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/**
 * Inertia smooth-scrolling for the marketing pages (mounted from
 * MarketingShell only — the app dashboard keeps native scrolling, where
 * precision beats polish).
 *
 * This is the layer everything else rides on: the scroll-driven parallax, the
 * hero recede, and the section rises all interpolate through Lenis's eased
 * scroll position instead of jumping wheel-notch to wheel-notch, which is what
 * makes the whole page feel animated rather than paged.
 *
 * Deliberate limits:
 * - Native scroll on touch devices (Lenis default): mobile inertia is already
 *   good, and hijacking it is how sites end up feeling broken on phones.
 * - Skipped entirely under `prefers-reduced-motion` — and torn down/rebuilt
 *   live if the OS setting flips mid-session.
 * - Keyboard scrolling (space, PgDn, arrows) stays native; Lenis only
 *   intercepts wheel. Anchor jumps (nav "Product" → #product) go through
 *   Lenis so they ease along the same curve. `scroll-behavior: smooth` in the
 *   CSS is the no-JS fallback for those anchors; Lenis sets
 *   `data-lenis-smooth` styles that take over when it's active.
 */
export function SmoothScroll() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    let lenis: Lenis | null = null;
    let raf = 0;

    const start = () => {
      if (lenis) return;
      lenis = new Lenis({
        // 0.09 ≈ heavy paper: noticeable glide, still stops where you meant.
        lerp: 0.09,
        // Keep wheel multiplier at 1 — changing scroll *distance* is the
        // hostile version of this; we only change how it eases.
        wheelMultiplier: 1,
        anchors: true,
      });
      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
      lenis = null;
    };

    const sync = () => (mq.matches ? stop() : start());

    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      stop();
    };
  }, []);

  return null;
}
