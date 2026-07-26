import { LiveDot } from "@/components/live-activity";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Honest empty state — no fake rows. Primary CTA + optional secondary.
 * Laid out horizontally so it fills a full-width pane instead of leaving a
 * tiny centered island; pass `bordered` only when it stands alone outside a
 * card surface (nesting a dashed box inside a bordered card looks broken).
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
  bordered = false,
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
  /** Dashed frame — for standalone use outside a card. */
  bordered?: boolean;
  className?: string;
}) {
  const hasActions =
    (actionHref && actionLabel) || (secondaryHref && secondaryLabel);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:gap-5 sm:px-5",
        bordered && "overflow-hidden rounded-xl border border-dashed",
        className,
      )}
    >
      {bordered ? (
        <div
          aria-hidden
          className="from-brand/8 pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r via-brand/40 to-transparent"
        />
      ) : null}

      {icon ? (
        <div className="bg-brand-muted text-brand ring-brand/15 flex size-11 shrink-0 items-center justify-center rounded-xl ring-1">
          {icon}
        </div>
      ) : null}

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-semibold">{title}</p>
        {description ? (
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
        {liveHint ? (
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <LiveDot />
            {liveHint}
          </p>
        ) : null}
      </div>

      {hasActions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actionHref && actionLabel ? (
            <Link
              href={actionHref}
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-ink text-ink-foreground hover:bg-ink/90",
              )}
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
