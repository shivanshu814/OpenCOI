import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared route-transition skeleton for every workspace page.
 * Mirrors the PageFrame rhythm: header → stat strip → content surface.
 */
export default function WorkspaceLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6"
      role="status"
      aria-label="Loading page"
    >
      <div className="space-y-2.5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-3.5 w-72" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-card space-y-2 rounded-xl border px-4 py-3.5 shadow-xs"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
        <div className="border-b px-4 py-4">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
