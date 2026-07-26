import { Skeleton } from "@/components/ui/skeleton";

/**
 * Review-detail route skeleton — DetailHeader + pipeline + KPIs + PDF | fields.
 * Shared workspace list skeleton looks wrong on this 2-col page.
 */
export default function ReviewDetailLoading() {
  return (
    <div
      className="w-full space-y-6"
      role="status"
      aria-busy="true"
      aria-label="Loading review"
    >
      {/* DetailHeader */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Skeleton className="h-3.5 w-24" />
          <div className="flex flex-wrap items-center gap-2.5">
            <Skeleton className="h-7 w-44 sm:w-52" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="hidden h-9 w-36 rounded-md sm:block" />
        </div>
      </div>

      {/* Pipeline tracker placeholder */}
      <div className="bg-card overflow-hidden rounded-xl border px-3 py-3 shadow-xs sm:px-4">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-8 min-w-0 flex-1 rounded-lg first:ml-0"
            />
          ))}
        </div>
      </div>

      {/* Verdict StatStrip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card relative overflow-hidden rounded-xl border px-4 py-3.5 shadow-xs"
          >
            <div
              className="bg-border absolute inset-x-0 top-0 h-0.5"
              aria-hidden
            />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="mt-2 h-7 w-8" />
          </div>
        ))}
      </div>

      {/* PDF preview | extracted fields */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="bg-muted/40 min-h-[280px] overflow-hidden rounded-xl border shadow-xs sm:min-h-[360px] lg:min-h-[420px]">
          <Skeleton className="h-full min-h-[280px] w-full rounded-none sm:min-h-[360px] lg:min-h-[420px]" />
        </div>

        <div className="min-w-0 space-y-4">
          <div className="bg-card relative overflow-hidden rounded-xl border shadow-xs">
            <div
              className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r"
              aria-hidden
            />
            <div className="space-y-1 border-b px-4 py-3.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <Skeleton className="h-3.5 w-28 max-w-[40%]" />
                  <Skeleton className="h-3.5 w-24 max-w-[35%]" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card relative overflow-hidden rounded-xl border shadow-xs">
            <div
              className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r"
              aria-hidden
            />
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <span className="sr-only">Loading review…</span>
    </div>
  );
}
