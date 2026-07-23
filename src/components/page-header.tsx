import { LiveBadge } from "@/components/live-activity";
import { cn } from "@/lib/utils";

/**
 * Compact SaaS page header. Live badge on by default across the platform.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  live = true,
  liveLabel = "Live",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Show pulsing Live badge next to the title (default on). */
  live?: boolean;
  liveLabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight text-balance">
            {title}
          </h1>
          {live ? <LiveBadge label={liveLabel} /> : null}
        </div>
        {description ? (
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
