"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

/** Reveal animations a <Stagger> group can hand to its children. */
export type StaggerAnimation =
  /** Fade + 14px rise. The default; matches <Reveal>. */
  | "cs-reveal-in"
  /** Fade in from the leading edge — for rows in a vertical list. */
  | "cs-row-in"
  /** Scale up from 76%. For icon chips and small badges. */
  | "cs-pop-in";

/**
 * Staggers the reveal of a group's *direct children* once the group scrolls
 * into view. Use this instead of wrapping every child in <Reveal> when the
 * children are a list: one IntersectionObserver for the group rather than N,
 * and the whole group is guaranteed to animate as a single sequence (with
 * per-child observers, a tall list on a fast scroll fires out of order).
 *
 * Same guarantees as <Reveal>:
 * - Children are visible in the markup and only hidden once JS has confirmed it
 *   will animate them back in, so a JS failure can never leave a blank list and
 *   crawlers always see the content.
 * - Classes are toggled on the DOM nodes directly — scrolling never re-renders.
 * - Fires once, then disconnects. Re-animating on scroll-back gets old fast.
 * - `prefers-reduced-motion` is checked before anything is hidden.
 *
 * Children must accept a class and a style (i.e. real elements, not fragments),
 * since that is where the animation and its delay are written.
 */
export function Stagger({
  children,
  className,
  as: Tag = "div",
  step = 70,
  start = 0,
  animation = "cs-reveal-in",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol" | "dl" | "li" | "section";
  /** Per-child delay in ms. Keep `step * count` under ~500ms or the tail drags. */
  step?: number;
  /** Delay before the first child, in ms. For sequencing against a heading. */
  start?: number;
  animation?: StaggerAnimation;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const kids = Array.from(el.children) as HTMLElement[];
    if (kids.length === 0) return;

    // Hide only now that we know we'll animate them back in.
    for (const kid of kids) kid.classList.add("cs-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          kids.forEach((kid, i) => {
            kid.style.animationDelay = `${start + i * step}ms`;
            kid.classList.add(animation);
            kid.classList.remove("cs-reveal");
          });
          observer.disconnect();
        }
      },
      // Fire a little before the group is fully on screen, and on a low
      // threshold so a long list still starts when only its top edge shows.
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [step, start, animation]);

  return (
    <Tag ref={ref as React.Ref<never>} className={cn(className)}>
      {children}
    </Tag>
  );
}
