"use client";

import { cn } from "@/lib/utils";
import { useCallback, useRef } from "react";

/**
 * A card that carries a soft brand highlight following the pointer.
 *
 * Justification, since a glow is easy to add for no reason: the pricing row is
 * three cards of near-identical shape and weight, and the highlight is what
 * confirms which one the pointer is actually addressing. It reads as the surface
 * responding, not as decoration.
 *
 * Written straight to CSS custom properties on the DOM node and throttled to
 * one write per frame, so pointer movement never re-renders React. The gradient
 * itself lives in `.cs-spotlight` (globals.css), which also removes it entirely
 * under `prefers-reduced-motion` — a pointer-tracked glow has no static
 * equivalent worth keeping.
 */
export function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const next = useRef({ x: 0, y: 0 });

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const el = ref.current;
    // Coarse pointers have no hover, so tracking would only burn frames.
    if (!el || event.pointerType !== "mouse") return;

    const rect = el.getBoundingClientRect();
    next.current = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };

    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      el.style.setProperty("--cs-mx", `${next.current.x}%`);
      el.style.setProperty("--cs-my", `${next.current.y}%`);
    });
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      className={cn("cs-spotlight", className)}
    >
      {children}
    </div>
  );
}
