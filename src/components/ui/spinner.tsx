import { cn } from "@/lib/utils";

/**
 * The product's busy indicator: a brand arc sweeping a faint track, with an
 * optional glyph at its centre naming the work.
 *
 * The arc is always the same — same weight, same speed, same geometry — so
 * every waiting state in the app is recognisably one family. What varies is
 * the glyph inside it, because "sending an email", "reading a certificate"
 * and "opening checkout" are different waits and the icon can say which
 * without a word of copy. One system, many meanings; not ten unrelated
 * spinners, which would read as scattered rather than considered.
 *
 * Rotation is linear — a spinner that eases looks like it is stalling —
 * while everything else in the app decelerates.
 *
 * Honesty rule: this means "genuinely working", never fake progress. There
 * is no percentage because we do not know one.
 */

type Glyph = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

/**
 * How the centre glyph moves. Pick the one that acts out the verb: a globe
 * turns, a document travels, a spark twinkles, a pen writes, a card swipes.
 * Keyframes live in globals.css and are all disabled under reduced motion.
 */
export type GlyphMotion =
  | "pulse"
  | "orbit"
  | "fly"
  | "lift"
  | "twinkle"
  | "write"
  | "swipe";

const MOTION_CLASS: Record<GlyphMotion, string> = {
  pulse: "cs-glyph-pulse",
  orbit: "cs-glyph-orbit",
  fly: "cs-glyph-fly",
  lift: "cs-glyph-lift",
  twinkle: "cs-glyph-twinkle",
  write: "cs-glyph-write",
  swipe: "cs-glyph-swipe",
};

export function Spinner({
  size = 16,
  strokeWidth = 2,
  className,
  label = "Working",
  icon: Icon,
  motion = "pulse",
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
  /** Optional centre glyph naming the action (Mail, Sparkles, Globe…). */
  icon?: Glyph;
  motion?: GlyphMotion;
}) {
  const r = (24 - strokeWidth) / 2;
  const c = 2 * Math.PI * r;

  const arc = (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", Icon ? "absolute inset-0" : className)}
      role={Icon ? undefined : "status"}
      aria-label={Icon ? undefined : label}
      aria-hidden={Icon ? true : undefined}
    >
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        opacity={0.2}
      />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${c * 0.28} ${c * 0.72}`}
        className="cs-arc-spin"
      />
    </svg>
  );

  if (!Icon) return arc;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    >
      {arc}
      {/* Sized off the arc so the glyph clears the stroke at every size, and
          beating on its own slower period so the indicator reads as live
          rather than as one rotating asset. */}
      <Icon
        className={cn("relative", MOTION_CLASS[motion])}
        style={{
          width: Math.round(size * 0.5),
          height: Math.round(size * 0.5),
        }}
      />
    </span>
  );
}
