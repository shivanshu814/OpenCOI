import { CertShieldMark } from "@/components/certshield-logo";
import { cn } from "@/lib/utils";

/**
 * The product's one loading language (see .impeccable.md):
 * a precise brand arc over a faint track — around the shield mark for route
 * loads, bare for inline waits. Simple on purpose; the premium is in the
 * restraint, the hairline stroke weight, layered ink shadows, and the slow
 * shield breathing.
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
      className={cn("shrink-0 overflow-visible", className)}
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
        className="text-ink/10 dark:text-white/12"
      />
      <circle
        cx="12"
        cy="12"
        r={r - strokeWidth * 1.9}
        fill="none"
        stroke="currentColor"
        strokeWidth={Math.max(strokeWidth * 0.55, 0.75)}
        className="text-ink/5 dark:text-white/8"
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
      <circle
        cx="12"
        cy="12"
        r={r - strokeWidth * 1.9}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={Math.max(strokeWidth * 0.55, 0.75)}
        strokeLinecap="round"
        strokeDasharray={`${c * 0.08} ${c * 0.92}`}
        className="cs-arc-spin-reverse opacity-70"
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
      <div className="cs-loader-arrive relative flex size-24 items-center justify-center">
        {/* Faint halo grounds the mark on the page without reading as glow. */}
        <div
          className="bg-brand/7 absolute inset-1 rounded-full blur-xl dark:bg-brand/10"
          aria-hidden
        />
        <div
          className="cs-loader-ring absolute inset-2 rounded-full border border-ink/10 bg-[radial-gradient(circle_at_50%_42%,color-mix(in_oklab,var(--brand)_16%,transparent),transparent_46%),linear-gradient(180deg,oklch(1_0_0/.92),oklch(0.965_0.008_264/.74))] shadow-[0_1px_0_oklch(1_0_0/.72)_inset,0_18px_38px_-28px_oklch(0.28_0.056_248/.7)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_50%_42%,color-mix(in_oklab,var(--brand)_18%,transparent),transparent_50%),linear-gradient(180deg,oklch(0.25_0.025_264/.9),oklch(0.17_0.02_264/.76))]"
          aria-hidden
        />
        <div
          className="absolute inset-[15px] rounded-full border border-white/75 dark:border-white/10"
          aria-hidden
        />
        <ArcSpinner
          size={78}
          strokeWidth={1.15}
          className="absolute inset-[9px]"
        />
        <span
          className="absolute top-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_12%,transparent)]"
          aria-hidden
        />
        <span
          className="absolute right-2 bottom-6 h-1 w-1 rounded-full bg-ink/20 dark:bg-white/20"
          aria-hidden
        />
        <span
          className="absolute bottom-6 left-2 h-1 w-1 rounded-full bg-ink/20 dark:bg-white/20"
          aria-hidden
        />
        <span
          className="cs-breathe relative flex size-11 items-center justify-center rounded-[14px] border border-white/80 bg-white/88 shadow-[0_1px_0_oklch(1_0_0/.9)_inset,0_14px_30px_-20px_oklch(0.28_0.056_248/.72)] dark:border-white/10 dark:bg-white/8"
          aria-hidden
        >
          <CertShieldMark size={30} />
        </span>
      </div>
      <p className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
        {label}
      </p>
    </div>
  );
}
