import { cn } from "@/lib/utils";

/**
 * Shared dense list-table primitives for workspace pages.
 * Full-width panes need aligned columns — not justify-between hollow rows
 * and not HTML tables that stretch five sparse cells across the viewport.
 */

export function ListTableHead({
  columns,
  gridClassName,
  className,
}: {
  columns: Array<string | { label: string; className?: string; srOnly?: boolean }>;
  gridClassName: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground bg-muted/40 hidden items-center gap-x-3 border-b px-4 py-2 text-[11px] font-medium tracking-wide uppercase sm:px-5 lg:grid",
        gridClassName,
        className,
      )}
      aria-hidden
    >
      {columns.map((col, i) => {
        if (typeof col === "string") {
          return <span key={`${col}-${i}`}>{col}</span>;
        }
        return (
          <span
            key={`${col.label}-${i}`}
            className={cn(col.srOnly && "sr-only", col.className)}
          >
            {col.label}
          </span>
        );
      })}
    </div>
  );
}

export function ListTableRow({
  children,
  gridClassName,
  className,
}: {
  children: React.ReactNode;
  gridClassName: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group hover:bg-muted/40 flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3.5 transition-colors sm:px-5 lg:grid",
        gridClassName,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Compact live count pill used in list toolbars. */
export function ListLiveCount({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="text-muted-foreground bg-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums">
      <span className="relative flex size-1.5">
        <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-40" />
        <span className="bg-brand relative inline-flex size-1.5 rounded-full" />
      </span>
      {children}
    </span>
  );
}
