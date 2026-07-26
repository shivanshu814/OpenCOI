import { cn } from "@/lib/utils";

/**
 * A field of tiny brand-coloured motes rising slowly through a dark section.
 *
 * This is the layer that makes the ink surfaces read as *inhabited* — at any
 * moment a few embers are mid-flight, so the section is never a still image.
 * Pure CSS animation on a handful of spans: a server component, zero JS.
 *
 * Positions, durations and delays are derived from the index with prime
 * multipliers — NOT Math.random(), which would differ between server and
 * client render and cause a hydration mismatch. The primes just make eleven
 * embers not look like a grid.
 *
 * Wholly decorative: `aria-hidden`, `pointer-events-none`, and removed outright
 * under `prefers-reduced-motion` (see `.cs-ember` in globals.css) — a paused
 * ember is a smudge, so there is no static fallback worth keeping.
 */
export function EmberField({
  count = 11,
  className,
}: {
  /** Keep it sparse — beyond ~14 it reads as weather, not atmosphere. */
  count?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => {
        const left = (i * 89 + 13) % 100; // %
        const size = 2 + ((i * 31) % 3); // 2-4px
        const dur = 14 + ((i * 47) % 12); // 14-25s
        const delay = -((i * 53) % 24); // negative: mid-flight at load
        const sway = ((i * 37) % 48) - 24; // -24..23px horizontal drift
        const peak = 0.25 + ((i * 29) % 30) / 100; // 0.25-0.54
        return (
          <span
            key={i}
            className="cs-ember absolute bottom-0 rounded-full bg-brand"
            style={
              {
                left: `${left}%`,
                width: size,
                height: size,
                opacity: 0,
                filter: "blur(0.5px)",
                "--cs-ember-dur": `${dur}s`,
                "--cs-ember-delay": `${delay}s`,
                "--cs-ember-sway": `${sway}px`,
                "--cs-ember-peak": peak,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
