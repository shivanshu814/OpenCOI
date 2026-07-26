import { LiveBadge } from "@/components/live-activity";
import { PageHelp } from "@/components/page-help";
import { cn } from "@/lib/utils";

/**
 * Compact SaaS page header with optional “what / who / next” guidance.
 * Live badge on by default across the platform.
 */
export function PageHeader({
  title,
  description,
  audience,
  nextStep,
  help,
  actions,
  className,
  live = true,
  liveLabel = "Live",
}: {
  title: React.ReactNode;
  /** Short purpose line — what this page is for. */
  description?: React.ReactNode;
  /** Who typically uses this page (e.g. “Property managers”). */
  audience?: React.ReactNode;
  /** Primary next action in plain words (link or text). */
  nextStep?: React.ReactNode;
  /** Optional longer tip shown behind a help icon. */
  help?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Show pulsing Live badge next to the title (default on). */
  live?: boolean;
  liveLabel?: string;
}) {
  const showGuide = Boolean(audience || nextStep || help);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
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
        {showGuide ? (
          <div className="text-muted-foreground flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-snug">
            {audience ? (
              <span>
                <span className="text-foreground/70 font-medium">For</span>{" "}
                {audience}
              </span>
            ) : null}
            {audience && nextStep ? (
              <span className="bg-border hidden h-3 w-px sm:block" aria-hidden />
            ) : null}
            {nextStep ? (
              <span className="min-w-0">
                <span className="text-brand font-medium">Next</span> {nextStep}
              </span>
            ) : null}
            {help ? <PageHelp>{help}</PageHelp> : null}
          </div>
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
