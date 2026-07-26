"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

/**
 * Reveals a heading word by word when it scrolls into view — each word rising
 * out from behind a mask rather than simply fading in.
 *
 * The mask is what makes this read as typeset rather than as "an animation":
 * every word sits in an `overflow-hidden` box and slides up from below its own
 * baseline, so the text appears to be set into the page instead of ghosting on
 * top of it.
 *
 * SEO/a11y notes that matter here:
 * - The words are real text nodes in the markup, so crawlers and screen readers
 *   read a normal heading. We only wrap them in spans for masking/staggering.
 * - Each word keeps its trailing space inside the span, so text selection and
 *   copy/paste still produce the original sentence.
 * - Nothing is hidden until JS confirms it will animate, so a JS failure or
 *   `prefers-reduced-motion` leaves plain, fully visible text.
 * - The mask box carries `pb`/`-mb` of 0.18em so descenders (g, y, p) are not
 *   clipped by the very overflow that produces the effect.
 *
 * Deliberately NOT used on the hero <h1>: masking the largest text element
 * delays Largest Contentful Paint, which Google measures. The hero animates
 * with transform only.
 */
export function WordReveal({
  text,
  className,
  wordClassName,
  stagger = 46,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  /** Per-word delay in ms. Keep the total under ~600ms. */
  stagger?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const words = text.split(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const inners = Array.from(el.querySelectorAll<HTMLElement>("[data-word]"));

    // Hide only now that we know we'll animate them back in.
    for (const inner of inners) inner.classList.add("cs-mask-hidden");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          inners.forEach((inner, i) => {
            inner.style.animationDelay = `${i * stagger}ms`;
            inner.classList.add("cs-mask-in");
            inner.classList.remove("cs-mask-hidden");
          });
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [stagger, text]);

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <span
          // Words repeat in a sentence, so index is the only stable key here.
          key={`${word}-${i}`}
          // The mask. Padding/negative-margin keep descenders out of the clip.
          className="-mb-[0.18em] inline-block overflow-hidden pb-[0.18em] align-bottom"
        >
          <span
            data-word
            className={cn("inline-block whitespace-pre", wordClassName)}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </span>
  );
}
