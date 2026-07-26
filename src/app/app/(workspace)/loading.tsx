import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared workspace route-transition skeleton.
 * Mirrors PageFrame rhythm: PageHeader → StatStrip → ContentSurface (list/table).
 * No fake labels or numbers — shape only.
 */
export default function WorkspaceLoading() {
  return (
    <div
      className="w-full space-y-6"
      role="status"
      aria-busy="true"
      aria-label="Loading page"
    >
      {/* PageHeader */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Skeleton className="h-7 w-48 sm:w-56" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-3.5 w-64 max-w-full" />
        </div>
        <Skeleton className="hidden h-9 w-28 shrink-0 rounded-md sm:block" />
      </div>

      {/* StatStrip — shape only, no invented KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card relative overflow-hidden rounded-xl border px-4 py-3.5 shadow-xs"
          >
            <div
              className="bg-border absolute inset-x-0 top-0 h-0.5"
              aria-hidden
            />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-10" />
          </div>
        ))}
      </div>

      {/* ContentSurface + list rows */}
      <div className="bg-card relative min-w-0 overflow-hidden rounded-xl border shadow-xs">
        <div
          className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r"
          aria-hidden
        />
        <div className="border-b px-4 py-3.5">
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 sm:py-3.5"
            >
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40 max-w-[55%]" />
                <Skeleton className="h-3 w-56 max-w-[80%]" />
              </div>
              <Skeleton className="hidden h-7 w-16 shrink-0 rounded-md sm:block" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
