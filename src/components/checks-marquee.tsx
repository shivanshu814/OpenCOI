import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

/**
 * Slow endless belt of the checks that run on every certificate, sitting on the
 * seam between the hero and the first light section.
 *
 * This is the "always on" surface of the page: chase sequences and monitoring
 * are what customers pay for, and a belt that is quietly in motion at 4 PM and
 * at 4 AM says that better than a static list. Every item is a real check from
 * spec Appendix A — no invented capability.
 *
 * Implementation:
 * - Pure CSS animation on a doubled track (`-50%` lands exactly on the seam),
 *   so this stays a server component and ships zero JS.
 * - The second copy is `aria-hidden`; screen readers hear the list once, as
 *   plain text. Under `prefers-reduced-motion` the belt parks and the first
 *   copy reads as a static row.
 * - Pauses on hover/focus (see `.cs-marquee` in globals.css): a ticker you can
 *   stop to read is content, one you can't is decoration.
 * - Edge fade uses mask-image so the belt dissolves at both ends instead of
 *   clipping mid-word.
 */

const CHECKS = [
  "Expiration dates",
  "GL limits vs. your requirements",
  "Workers' comp",
  "CG 20 10 attached",
  "CG 20 37 attached",
  "Waiver of subrogation",
  "Primary & non-contributory",
  "Carrier name & NAIC #",
  "Missing endorsement pages",
];

function Belt({ hidden }: { hidden?: boolean }) {
  return (
    <div
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center"
    >
      {CHECKS.map((check) => (
        <span
          key={check}
          className="flex items-center gap-2 pr-10 text-[13px] font-medium whitespace-nowrap text-white/55"
        >
          <CheckCircle2
            className="text-brand/70 size-3.5 shrink-0"
            strokeWidth={2}
            aria-hidden
          />
          {check}
        </span>
      ))}
    </div>
  );
}

export function ChecksMarquee({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "cs-marquee relative overflow-hidden border-t border-white/10 py-3.5",
        className,
      )}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <p className="sr-only">
        Checked on every certificate: {CHECKS.join(", ")}.
      </p>
      <div className="cs-marquee-track" aria-hidden>
        <Belt />
        <Belt hidden />
      </div>
    </div>
  );
}
