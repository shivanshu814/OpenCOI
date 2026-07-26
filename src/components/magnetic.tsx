"use client";

import { cn } from "@/lib/utils";
import { useCallback, useRef } from "react";

/**
 * Nudges its child a few pixels toward the cursor as the pointer approaches,
 * and releases it back to rest on leave.
 *
 * Applied to the two primary CTAs. The pull is capped at `strength` px — the
 * point is that the button feels like it wants to be clicked, not that it runs
 * around the page. Anything larger starts to make the button hard to actually
 * hit, which would be a usability regression dressed up as polish.
 *
 * Renders an inline-block wrapper so the button keeps its own layout box; the
 * transform is written to the wrapper, never to the button, so focus rings and
 * hit-testing stay exactly where the browser expects them.
 */
export function Magnetic({
  children,
  className,
  strength = 5,
}: {
  children: React.ReactNode;
  className?: string;
  /** Maximum pull in px. Keep single-digit. */
  strength?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);
  const next = useRef({ x: 0, y: 0 });

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const el = ref.current;
      if (!el || event.pointerType !== "mouse") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const rect = el.getBoundingClientRect();
      next.current = {
        x: ((event.clientX - rect.left) / rect.width - 0.5) * 2 * strength,
        y: ((event.clientY - rect.top) / rect.height - 0.5) * 2 * strength,
      };

      if (raf.current) return;
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        el.dataset.pulling = "true";
        el.style.transform = `translate3d(${next.current.x.toFixed(1)}px, ${next.current.y.toFixed(1)}px, 0)`;
      });
    },
    [strength],
  );

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    }
    el.dataset.pulling = "false";
    el.style.transform = "";
  }, []);

  return (
    <span
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      data-pulling="false"
      className={cn("cs-magnetic inline-block", className)}
    >
      {children}
    </span>
  );
}
