import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type FrameWidth = "narrow" | "default" | "wide" | "full";

const WIDTH: Record<FrameWidth, string> = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

/**
 * Shared CertShield app page frame.
 * Title/purpose → optional KPI strip → primary content → secondary/help.
 * Caps width so tables and forms don’t stretch endlessly on ultrawide.
 */
export function PageFrame({
  children,
  width = "default",
  className,
}: {
  children: React.ReactNode;
  width?: FrameWidth;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full space-y-6", WIDTH[width], className)}>
      {children}
    </div>
  );
}

/** Re-export so pages can import frame + header from one place. */
export { PageHeader };

/**
 * Compact KPI / summary strip — only render when you have real counts.
 * Do not invent zeros for empty orgs; omit the strip instead.
 */
export function StatStrip({
  items,
  className,
}: {
  items: {
    label: string;
    value: React.ReactNode;
    hint?: React.ReactNode;
    tone?: "default" | "ok" | "warn" | "danger" | "brand";
  }[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <dl
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
        items.length === 2 && "lg:grid-cols-2",
        items.length === 3 && "lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-card relative overflow-hidden rounded-xl border px-4 py-3.5 shadow-xs"
        >
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-0.5",
              item.tone === "ok" && "bg-emerald-500",
              item.tone === "warn" && "bg-amber-400",
              item.tone === "danger" && "bg-red-500",
              item.tone === "brand" && "bg-brand",
              (!item.tone || item.tone === "default") && "bg-border",
            )}
            aria-hidden
          />
          <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            {item.label}
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {item.value}
          </dd>
          {item.hint ? (
            <p className="text-muted-foreground mt-1 text-xs leading-snug">
              {item.hint}
            </p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/**
 * Primary content surface with mint rail — used for tables, timelines, forms.
 */
export function ContentSurface({
  children,
  className,
  rail = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** Mint top accent (default on). */
  rail?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-card relative min-w-0 overflow-hidden rounded-xl border shadow-xs",
        className,
      )}
    >
      {rail ? (
        <div
          className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r"
          aria-hidden
        />
      ) : null}
      {children}
    </div>
  );
}

/**
 * De-emphasized secondary / help zone under primary content.
 */
export function PageSecondary({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground max-w-3xl text-xs leading-relaxed",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Detail-page identity block: back link + title + live status + actions.
 */
export function DetailHeader({
  backHref,
  backLabel,
  title,
  meta,
  badge,
  actions,
  className,
}: {
  backHref: string;
  backLabel: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight text-balance">
            {title}
          </h1>
          {badge}
        </div>
        {meta ? (
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            {meta}
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
