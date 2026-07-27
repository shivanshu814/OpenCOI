import { CertShieldMark } from "@/components/certshield-logo";
import { cn } from "@/lib/utils";

/**
 * The product's one loading language (see .impeccable.md):
 * a thin brand arc over a faint track — around the shield mark for route
 * loads, bare for inline waits. Simple on purpose; the premium is in the
 * restraint, the hairline stroke weight, and the slow shield breathing.
 *
 * Honesty rule: these indicate genuine waiting only. Never fake progress —
 * there is no percentage here because we don't know one.
 */

export function ArcSpinner({
  size = 16,
  strokeWidth = 1.75,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
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
      aria-label="Loading"
    >
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-ink/10 dark:text-white/10"
      />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${c * 0.28} ${c * 0.72}`}
        className="cs-arc-spin"
      />
    </svg>
  );
}

/**
 * Route-level loader: shield mark breathing inside a slow arc, with a quiet
 * label. Replaces the old full-page skeleton mosaics — a branded mark that
 * holds still is calmer than thirty gray boxes pulsing.
 */
export function BrandLoader({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[55svh] w-full flex-col items-center justify-center gap-5",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative flex size-16 items-center justify-center">
        {/* Faint halo grounds the mark on the page. */}
        <div
          className="bg-brand/8 absolute inset-0 rounded-full"
          aria-hidden
        />
        <ArcSpinner size={64} strokeWidth={1.25} className="absolute inset-0" />
        <span className="cs-breathe" aria-hidden>
          <CertShieldMark size={26} />
        </span>
      </div>
      <p className="text-muted-foreground text-xs font-medium tracking-wide">
        {label}
      </p>
    </div>
  );
}
