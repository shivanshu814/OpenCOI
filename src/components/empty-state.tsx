import { LiveDot } from "@/components/live-activity";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Honest empty state — no fake rows. Primary CTA + optional secondary.
 */
export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  liveHint,
  icon,
  className,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  /** Optional status line under the empty copy */
  liveHint?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-dashed px-6 py-12 text-center sm:py-14",
        className,
      )}
    >
      <div
        aria-hidden
        className="from-brand/8 pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r via-brand/40 to-transparent"
      />
      {icon ? (
        <div className="bg-brand-muted text-brand mx-auto mb-3 flex size-11 items-center justify-center rounded-xl ring-1 ring-brand/15">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="text-muted-foreground mx-auto mt-1.5 max-w-md text-sm leading-relaxed">
          {description}
        </p>
      ) : null}
      {liveHint ? (
        <p className="text-muted-foreground mx-auto mt-3 inline-flex items-center gap-1.5 text-xs">
          <LiveDot />
          {liveHint}
        </p>
      ) : null}
      {(actionHref && actionLabel) || (secondaryHref && secondaryLabel) ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actionHref && actionLabel ? (
            <Link
              href={actionHref}
              className={cn(buttonVariants({ size: "sm" }), "bg-ink text-ink-foreground hover:bg-ink/90")}
            >
              {actionLabel}
            </Link>
          ) : null}
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
