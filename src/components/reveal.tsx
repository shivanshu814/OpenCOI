"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

/**
 * Reveals its children once they scroll into view: fade + 14px rise, exponential
 * easing, one time only (the observer disconnects after firing — no scroll
 * listener, no re-animation on scroll-back, which gets annoying fast).
 *
 * Implementation notes:
 * - The class is toggled on the DOM node directly rather than through React
 *   state, so scrolling never triggers a re-render.
 * - Content is visible by default in the markup (`cs-reveal` only hides it once
 *   JS confirms it will animate it), so it can never be permanently invisible
 *   if JS fails, and crawlers always see it.
 * - `prefers-reduced-motion` is handled in CSS, and re-checked here so we don't
 *   even hide the element first.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  animation = "cs-reveal-in",
  decorative = false,
}: {
  children?: React.ReactNode;
  className?: string;
  /** Stagger offset in ms. Keep under ~450ms total or it reads as slow. */
  delay?: number;
  as?: "div" | "section" | "li" | "ul" | "ol" | "p";
  /**
   * Which reveal to play. Pass the class rather than setting it statically:
   * a static animation class runs at page load, so anything below the fold has
   * finished animating before it is ever seen.
   */
  animation?:
    | "cs-reveal-in"
    | "cs-focus-in"
    | "cs-row-in"
    | "cs-in-left"
    | "cs-in-right"
    /** Draws in horizontally from the left. For rules and connector lines. */
    | "cs-draw-x";
  /** Marks the element `aria-hidden` — for purely ornamental reveals. */
  decorative?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Already on screen at mount (above the fold): reveal without waiting.
    const show = () => {
      el.style.animationDelay = delay ? `${delay}ms` : "";
      el.classList.add(animation);
      el.classList.remove("cs-reveal");
    };

    if (!("IntersectionObserver" in window)) return;

    el.classList.add("cs-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show();
          observer.disconnect();
        }
      },
      // Fire slightly before the element is fully on screen.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, animation]);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(className)}
      aria-hidden={decorative || undefined}
    >
      {children}
    </Tag>
  );
}
