"use client";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

/**
 * Types through `phrases` one character at a time, holds, deletes, moves on.
 *
 * This is the page's signature motion, and it is not decoration: it's the only
 * honest way to show "the system is reading a document right now" on a static
 * marketing page. Used inside decorative, `aria-hidden` surfaces only — a real
 * screen reader should never have to sit through a typing animation.
 *
 * Under `prefers-reduced-motion` it renders the first phrase as plain text.
 */
export function TypedText({
  phrases,
  className,
  caretClassName,
  typeMs = 42,
  deleteMs = 18,
  holdMs = 1700,
  onIndexChange,
  srLabel,
  reserveCh,
}: {
  phrases: string[];
  className?: string;
  caretClassName?: string;
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
  /** Fires when the active phrase changes, so callers can sync e.g. a status dot. */
  onIndexChange?: (index: number) => void;
  /**
   * REQUIRED when this sits in real prose rather than a decorative surface.
   * The animated span becomes `aria-hidden` and this is exposed to screen
   * readers instead, so nobody hears half-typed words.
   */
  srLabel?: string;
  /**
   * Reserves inline width (in `ch`) so surrounding prose never reflows as the
   * word grows and shrinks. Set it to the longest phrase's length. Without
   * this, typing inside a paragraph causes cumulative layout shift.
   */
  reserveCh?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [len, setLen] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const timer = useRef<number | null>(null);
  const notify = useRef(onIndexChange);

  useEffect(() => {
    notify.current = onIndexChange;
  }, [onIndexChange]);

  const phrase = phrases[phraseIdx] ?? "";

  useEffect(() => {
    if (reduced) return;

    const clear = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };

    if (!deleting && len < phrase.length) {
      // Slight jitter so it reads as typing, not a metronome.
      timer.current = window.setTimeout(
        () => setLen((l) => l + 1),
        typeMs + Math.random() * 34,
      );
    } else if (!deleting && len === phrase.length) {
      timer.current = window.setTimeout(() => setDeleting(true), holdMs);
    } else if (deleting && len > 0) {
      timer.current = window.setTimeout(() => setLen((l) => l - 1), deleteMs);
    } else {
      timer.current = window.setTimeout(() => {
        setDeleting(false);
        setPhraseIdx((i) => {
          const next = (i + 1) % phrases.length;
          notify.current?.(next);
          return next;
        });
      }, 260);
    }

    return clear;
  }, [reduced, deleting, len, phrase, phrases.length, typeMs, deleteMs, holdMs]);

  if (reduced) {
    return <span className={className}>{srLabel ?? phrases[0]}</span>;
  }

  const animated = (
    <span
      className={cn("inline-flex min-w-0 items-center", className)}
      style={reserveCh ? { minWidth: `${reserveCh}ch` } : undefined}
      aria-hidden={srLabel ? true : undefined}
    >
      <span className="truncate">{phrase.slice(0, len)}</span>
      <span
        className={cn(
          "cs-caret ml-0.5 inline-block h-3 w-px shrink-0 bg-current align-middle",
          caretClassName,
        )}
      />
    </span>
  );

  // In prose: expose stable text to assistive tech, animate only for sighted users.
  if (srLabel) {
    return (
      <>
        <span className="sr-only">{srLabel}</span>
        {animated}
      </>
    );
  }

  return animated;
}
