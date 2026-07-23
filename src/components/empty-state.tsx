import { LiveDot } from "@/components/live-activity";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  liveHint,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  /** Optional status line under the empty copy */
  liveHint?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed px-6 py-14 text-center">
      <div
        aria-hidden
        className="from-brand/8 pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r via-brand/40 to-transparent"
      />
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
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-5",
          )}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
