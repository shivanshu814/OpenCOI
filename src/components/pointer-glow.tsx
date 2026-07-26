"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

/**
 * A soft brand glow that follows the cursor across the dark sections.
 *
 * Drop it inside a `relative` section; it listens on its own parent, so the
 * listeners only ever fire while the pointer is actually over that section
 * rather than on every mousemove across the page.
 *
 * Cheap by construction: the parent's rect is measured on enter (not per move),
 * writes are throttled to one per frame, and everything goes straight to CSS
 * custom properties — React never re-renders while the pointer moves. The
 * gradient lives in `.cs-pointer-glow` (globals.css), which removes it entirely
 * under `prefers-reduced-motion`.
 */
export function PointerGlow({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Touch/pen have no hover state, so a follow-the-cursor glow is meaningless.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let rect: DOMRect | null = null;
    let raf = 0;
    let next = { x: 0, y: 0 };

    const onEnter = () => {
      rect = host.getBoundingClientRect();
      el.dataset.active = "true";
    };

    const onMove = (event: PointerEvent) => {
      if (!rect) rect = host.getBoundingClientRect();
      next = {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100,
      };
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty("--cs-gx", `${next.x}%`);
        el.style.setProperty("--cs-gy", `${next.y}%`);
      });
    };

    const onLeave = () => {
      el.dataset.active = "false";
      rect = null;
    };

    // The cached rect goes stale as the section moves up the page.
    const invalidate = () => {
      rect = null;
    };

    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate, { passive: true });

    return () => {
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      data-active="false"
      className={cn(
        "cs-pointer-glow pointer-events-none absolute inset-0 z-0",
        className,
      )}
    />
  );
}
