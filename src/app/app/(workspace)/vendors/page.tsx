import { DownloadReportButton } from "@/components/download-report-button";
import { EmptyState } from "@/components/empty-state";
import {
  ContentSurface,
  PageFrame,
  PageHeader,
  PageSecondary,
  StatStrip,
} from "@/components/page-frame";
import { VendorStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { listVendors } from "@/lib/data/documents";
import { dashboardCounts, type VendorStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { ChevronRight, Search, Upload, Users } from "lucide-react";
import Link from "next/link";
import { AddVendorForm } from "./add-vendor-form";

const STATUS_FILTERS: { value: VendorStatus; label: string }[] = [
  { value: "non_compliant", label: "Non-compliant" },
  { value: "expiring", label: "Expiring" },
  { value: "missing_docs", label: "Missing docs" },
  { value: "in_review", label: "In review" },
  { value: "compliant", label: "Compliant" },
];

/** Aligned columns — middle “Next” fills width so Status/Actions stay readable. */
const ROW_GRID =
  "lg:grid-cols-[minmax(14rem,1.2fr)_minmax(7rem,0.55fr)_minmax(10rem,1fr)_10.5rem_auto]";

const NEXT_BY_STATUS: Record<VendorStatus, string> = {
  missing_docs: "Upload their first COI",
  in_review: "Finish internal review",
  expiring: "Chase renewal before expiry",
  non_compliant: "Fix gaps, then re-check",
  compliant: "On track — keep chasing renewals",
};

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [{ q: rawQuery, status: rawStatus }, vendors] = await Promise.all([
    searchParams,
    listVendors(),
  ]);
  const counts = dashboardCounts(vendors);
  const hasData = vendors.length > 0;

  const query = (rawQuery ?? "").trim();
  const statusFilter = STATUS_FILTERS.some((f) => f.value === rawStatus)
    ? (rawStatus as VendorStatus)
    : null;

  const needle = query.toLowerCase();
  const filtered = vendors.filter((v) => {
    if (statusFilter && v.status !== statusFilter) return false;
    if (!needle) return true;
    return [v.name, v.trade, v.email]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(needle));
  });
  const isFiltered = Boolean(statusFilter || needle);

  const filterHref = (status: VendorStatus | null) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    const qs = params.toString();
    return qs ? `/app/vendors?${qs}` : "/app/vendors";
  };

  return (
    <PageFrame>
      <PageHeader
        title="Vendors"
        description="Your contractor roster — insurance status, docs, and renewal chase in one place."
        audience="Property managers tracking vendor compliance"
        nextStep={
          !hasData ? (
            "Add your first vendor below, then upload their COI."
          ) : (
            <>
              Open a vendor to chase renewals, or{" "}
              <Link
                href="/app/upload"
                className="text-foreground underline-offset-2 hover:underline"
              >
                upload a COI
              </Link>
              .
            </>
          )
        }
        help="Statuses are traffic-light signals from reviewed COIs — you remain the final approver. Chase reminders go out by email (and SMS when Twilio is configured)."
        live
      />

      {hasData ? (
        <StatStrip
          items={[
            {
              label: "Total",
              value: vendors.length,
              tone: "brand",
            },
            {
              label: "Compliant",
              value: counts.compliant,
              tone: "ok",
            },
            {
              label: "Expiring / gaps",
              value:
                counts.expiring + counts.non_compliant + counts.missing_docs,
              tone:
                counts.expiring +
                  counts.non_compliant +
                  counts.missing_docs >
                0
                  ? "warn"
                  : "ok",
            },
            {
              label: "In review",
              value: counts.in_review,
              tone: counts.in_review > 0 ? "default" : "ok",
            },
          ]}
        />
      ) : null}

      <AddVendorForm />

      <ContentSurface>
        {/* Toolbar: title + count | search + filters */}
        <div className="flex flex-col gap-3 border-b px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-tight">
              All vendors
            </h2>
            <span className="text-muted-foreground bg-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums">
              <span className="relative flex size-1.5">
                <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-40" />
                <span className="bg-brand relative inline-flex size-1.5 rounded-full" />
              </span>
              {isFiltered
                ? `${filtered.length} of ${vendors.length}`
                : vendors.length}
            </span>
          </div>

          {hasData ? (
            <div className="flex flex-wrap items-center gap-2">
              <form
                action="/app/vendors"
                method="get"
                className="relative min-w-[12rem] flex-1 sm:max-w-[16rem] sm:flex-none"
                role="search"
              >
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
                  aria-hidden
                />
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search name, trade, email"
                  aria-label="Search vendors"
                  className="border-input bg-background h-8 w-full rounded-md border pr-3 pl-8 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                {statusFilter ? (
                  <input type="hidden" name="status" value={statusFilter} />
                ) : null}
              </form>
              <nav
                aria-label="Filter vendors by status"
                className="flex flex-wrap items-center gap-1.5"
              >
                <Link
                  href={filterHref(null)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    statusFilter === null
                      ? "border-ink bg-ink text-ink-foreground"
                      : "text-muted-foreground hover:text-foreground bg-card",
                  )}
                  aria-current={statusFilter === null ? "page" : undefined}
                >
                  All
                  <span className="tabular-nums opacity-70">
                    {vendors.length}
                  </span>
                </Link>
                {STATUS_FILTERS.map((f) => {
                  const count = counts[f.value];
                  if (count === 0 && statusFilter !== f.value) return null;
                  return (
                    <Link
                      key={f.value}
                      href={filterHref(f.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        statusFilter === f.value
                          ? "border-ink bg-ink text-ink-foreground"
                          : "text-muted-foreground hover:text-foreground bg-card",
                      )}
                      aria-current={
                        statusFilter === f.value ? "page" : undefined
                      }
                    >
                      {f.label}
                      <span className="tabular-nums opacity-70">{count}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : null}
        </div>

        {!hasData ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              title="No vendors yet"
              description="Add your first vendor above, then upload their COI — we'll extract limits and expirations and start the review pipeline."
              actionHref="/app/upload"
              actionLabel="Go to upload"
              liveHint="No sample vendors — your list stays empty until you add one."
              icon={<Users className="size-5" aria-hidden />}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm font-medium">No vendors match</p>
            <p className="text-muted-foreground text-xs">
              {query ? (
                <>
                  Nothing found for “{query}”
                  {statusFilter ? " with that status" : ""}.
                </>
              ) : (
                "No vendors with that status right now."
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/app/vendors" />}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "text-muted-foreground bg-muted/40 hidden items-center gap-x-3 border-b px-4 py-2 text-[11px] font-medium tracking-wide uppercase sm:px-5 lg:grid",
                ROW_GRID,
              )}
              aria-hidden
            >
              <span>Vendor</span>
              <span>Trade</span>
              <span>Next</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y">
              {filtered.map((v) => (
                <div
                  key={v.id}
                  className={cn(
                    "group hover:bg-muted/40 flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3.5 transition-colors sm:px-5 lg:grid",
                    ROW_GRID,
                  )}
                >
                  {/* Vendor identity — primary click target */}
                  <Link
                    href={`/app/vendors/${v.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:flex-none"
                  >
                    <span className="bg-muted text-muted-foreground group-hover:bg-brand-muted group-hover:text-brand flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tracking-wide uppercase transition-colors">
                      {v.name.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium underline-offset-4 group-hover:underline">
                        {v.name}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {v.email || "No email on file"}
                        {v.trade ? (
                          <span className="lg:hidden"> · {v.trade}</span>
                        ) : null}
                      </p>
                    </div>
                  </Link>

                  {/* Trade */}
                  <div className="text-muted-foreground hidden min-w-0 truncate text-sm lg:block">
                    {v.trade || "—"}
                  </div>

                  {/* Next action — fills the wide middle */}
                  <div className="text-muted-foreground hidden min-w-0 truncate text-xs leading-snug lg:block">
                    {NEXT_BY_STATUS[v.status]}
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    <VendorStatusBadge status={v.status} />
                  </div>

                  {/* Actions */}
                  <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5 lg:ml-0">
                    <DownloadReportButton vendorId={v.id} label="Report" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      render={<Link href={`/app/upload?vendor=${v.id}`} />}
                    >
                      <Upload className="size-3.5" aria-hidden />
                      Upload
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="group-hover:border-ink/30 gap-1"
                      render={
                        <Link
                          href={`/app/vendors/${v.id}`}
                          aria-label={`Open ${v.name}`}
                        />
                      }
                    >
                      Open
                      <ChevronRight
                        className="size-3.5 opacity-60"
                        aria-hidden
                      />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </ContentSurface>

      <PageSecondary>
        Document review assistance — not legal, insurance, or professional
        advice. You remain the final approver.
      </PageSecondary>
    </PageFrame>
  );
}
