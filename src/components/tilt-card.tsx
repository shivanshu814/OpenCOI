"use client";

import { cn } from "@/lib/utils";
import { useCallback, useRef } from "react";

/**
 * Tips its contents a few degrees toward the cursor, then springs back to flat
 * when the pointer leaves.
 *
 * Used on the two showpiece cards (the hero mockup, the extraction preview).
 * Kept to `maxTiltDeg` ≈ 5: enough that the card reads as a physical object
 * catching the light, not enough to distort the text on it or to compete with
 * the copy beside it.
 *
 * Transform is written straight to the node once per frame — no React state, so
 * pointer movement costs nothing in render. `.cs-tilt` (globals.css) swaps
 * between a near-instant transition while tracking and a slow eased one on
 * release, which is what makes the return feel like a spring rather than a snap.
 * Everything is skipped under `prefers-reduced-motion` and on coarse pointers.
 */
export function TiltCard({
  children,
  className,
  maxTiltDeg = 5,
}: {
  children: React.ReactNode;
  className?: string;
  maxTiltDeg?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const next = useRef({ rx: 0, ry: 0 });

  const enabled = useCallback(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return false;
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const el = ref.current;
      if (!el || event.pointerType !== "mouse" || !enabled()) return;

      const rect = el.getBoundingClientRect();
      // -0.5..0.5 from the card's centre.
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;

      // Pointer above centre tips the top away, which is the intuitive direction.
      next.current = {
        rx: -py * maxTiltDeg * 2,
        ry: px * maxTiltDeg * 2,
      };

      if (raf.current) return;
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        el.dataset.tilting = "true";
        el.style.transform = `perspective(1100px) rotateX(${next.current.rx.toFixed(2)}deg) rotateY(${next.current.ry.toFixed(2)}deg)`;
      });
    },
    [enabled, maxTiltDeg],
  );

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    }
    el.dataset.tilting = "false";
    el.style.transform = "";
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      data-tilting="false"
      className={cn("cs-tilt", className)}
    >
      {children}
    </div>
  );
}
