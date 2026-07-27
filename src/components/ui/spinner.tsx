import { cn } from "@/lib/utils";

/**
 * Bare busy arc — used where there is no verb to name (toasts, inline field
 * lookups). Buttons that are doing something specific use PendingGlyph
 * instead: a custom SVG that moves its own geometry, with no outer ring.
 *
 * Rotation is linear — a spinner that eases looks like it is stalling.
 * Honesty rule: this means "genuinely working", never fake progress.
 */

export function Spinner({
  size = 16,
  strokeWidth = 2,
  className,
  label = "Working",
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}) {
  const r = (24 - strokeWidth) / 2;
  const c = 2 * Math.PI * r;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role="status"
      aria-label={label}
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
}
