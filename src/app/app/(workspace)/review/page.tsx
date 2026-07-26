import { EmptyState } from "@/components/empty-state";
import {
  ContentSurface,
  PageFrame,
  PageHeader,
  PageSecondary,
} from "@/components/page-frame";
import { VerdictBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { listReviewQueue, listVendors } from "@/lib/data/documents";
import type { Verdict } from "@/lib/requirements/engine";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Clock3, FileText } from "lucide-react";
import Link from "next/link";

const VERDICT_FILTERS: { value: Verdict | "pending"; label: string }[] = [
  { value: "FAIL", label: "Fail" },
  { value: "MISSING", label: "Missing" },
  { value: "EXPIRING", label: "Expiring" },
  { value: "PASS", label: "Pass" },
  { value: "pending", label: "No verdict yet" },
];

const VERDICT_DOT: Record<Verdict, string> = {
  PASS: "bg-[var(--status-ok)]",
  FAIL: "bg-[var(--status-bad)]",
  MISSING: "bg-[var(--status-neutral)]",
  EXPIRING: "bg-[var(--status-warn)]",
};

/** Shared column template so the header strip and rows stay aligned. */
const ROW_GRID =
  "lg:grid-cols-[minmax(16rem,1.6fr)_minmax(10rem,1fr)_9.5rem_8rem_4.5rem]";

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ verdict?: string }>;
}) {
  const [{ verdict: rawVerdict }, queue, vendors] = await Promise.all([
    searchParams,
    listReviewQueue(),
    listVendors(),
  ]);
  const vendorById = new Map(vendors.map((v) => [v.id, v]));

  const activeFilter = VERDICT_FILTERS.some((f) => f.value === rawVerdict)
    ? (rawVerdict as Verdict | "pending")
    : null;

  const countFor = (value: Verdict | "pending") =>
    queue.filter((doc) =>
      value === "pending"
        ? doc.overall_verdict === null
        : doc.overall_verdict === value,
    ).length;

  const filtered = activeFilter
    ? queue.filter((doc) =>
        activeFilter === "pending"
          ? doc.overall_verdict === null
          : doc.overall_verdict === activeFilter,
      )
    : queue;

  return (
    <PageFrame>
      <PageHeader
        title="Internal review queue"
        description="Check AI-extracted fields against the PDF before a verdict reaches the customer."
        audience="Internal reviewers — you approve every verdict"
        nextStep={
          queue.length === 0
            ? "Queue is clear — upload a COI when the next certificate arrives."
            : "Open the oldest item, confirm or correct fields, then publish for customer decision."
        }
        help="Until the Month 3 accuracy gate, every verdict still passes internal review before publish. Corrections become golden-set regression cases. You remain the final approver."
        live
        actions={
          <Button variant="outline" render={<Link href="/app/upload" />}>
            Upload COI
          </Button>
        }
      />

      <ContentSurface>
        {/* Toolbar: title + live count on the left, verdict filters on the right */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-tight">
              Documents awaiting review
            </h2>
            <span className="text-muted-foreground bg-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums">
              <span className="relative flex size-1.5">
                <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-40" />
                <span className="bg-brand relative inline-flex size-1.5 rounded-full" />
              </span>
              {activeFilter
                ? `${filtered.length} of ${queue.length}`
                : queue.length}
            </span>
          </div>

          {queue.length > 0 ? (
            <nav
              aria-label="Filter queue by verdict"
              className="flex flex-wrap items-center gap-1.5"
            >
              <Link
                href="/app/review"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  activeFilter === null
                    ? "border-ink bg-ink text-ink-foreground"
                    : "text-muted-foreground hover:text-foreground bg-card",
                )}
                aria-current={activeFilter === null ? "page" : undefined}
              >
                All
                <span className="tabular-nums opacity-70">{queue.length}</span>
              </Link>
              {VERDICT_FILTERS.map((f) => {
                const count = countFor(f.value);
                if (count === 0 && activeFilter !== f.value) return null;
                return (
                  <Link
                    key={f.value}
                    href={`/app/review?verdict=${f.value}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      activeFilter === f.value
                        ? "border-ink bg-ink text-ink-foreground"
                        : "text-muted-foreground hover:text-foreground bg-card",
                    )}
                    aria-current={activeFilter === f.value ? "page" : undefined}
                  >
                    {f.label}
                    <span className="tabular-nums opacity-70">{count}</span>
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>

        {queue.length === 0 ? (
          <EmptyState
            title="Queue empty"
            description="Upload a COI and it lands here once extraction finishes — every verdict passes review before publish."
            actionHref="/app/upload"
            actionLabel="Upload COI"
            liveHint="Listening for extractions"
            icon={<FileText className="size-5" aria-hidden />}
          />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm font-medium">Nothing matches this filter</p>
            <p className="text-muted-foreground text-xs">
              {queue.length} document{queue.length === 1 ? "" : "s"} in the
              queue under other verdicts.
            </p>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/app/review" />}
            >
              Show all
            </Button>
          </div>
        ) : (
          <>
            {/* Column labels — desktop only, aligned to the row grid */}
            <div
              className={cn(
                "text-muted-foreground bg-muted/40 hidden items-center gap-x-3 border-b px-4 py-2 text-[11px] font-medium tracking-wide uppercase sm:px-5 lg:grid",
                ROW_GRID,
              )}
              aria-hidden
            >
              <span>Document</span>
              <span>Checks</span>
              <span>Uploaded</span>
              <span>Verdict</span>
              <span />
            </div>

            <div className="divide-y">
              {filtered.map((doc, index) => {
                const vendor = vendorById.get(doc.vendor_id);
                const isOldest = activeFilter === null && index === 0;
                const summary = (
                  ["FAIL", "MISSING", "EXPIRING", "PASS"] as Verdict[]
                )
                  .map((v) => ({
                    verdict: v,
                    count: doc.check_lines.filter((l) => l.verdict === v)
                      .length,
                  }))
                  .filter((s) => s.count > 0);

                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "group hover:bg-muted/40 relative flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 transition-colors sm:px-5 lg:grid",
                      ROW_GRID,
                    )}
                  >
                    {/* Document */}
                    <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
                      <span className="bg-muted text-muted-foreground group-hover:bg-brand-muted group-hover:text-brand flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors">
                        <FileText className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {vendor?.name ?? "Vendor"}
                          </p>
                          {isOldest && queue.length > 1 ? (
                            <span className="bg-brand-muted text-brand rounded-full px-2 py-px text-[10px] font-semibold tracking-wide uppercase">
                              Start here
                            </span>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground truncate text-xs">
                          {doc.file_name}
                        </p>
                      </div>
                    </div>

                    {/* Check summary */}
                    <div className="text-muted-foreground hidden min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs lg:flex">
                      {summary.length === 0 ? (
                        <span>No checks yet</span>
                      ) : (
                        summary.map((s) => (
                          <span
                            key={s.verdict}
                            className="inline-flex items-center gap-1.5 tabular-nums"
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                VERDICT_DOT[s.verdict],
                              )}
                              aria-hidden
                            />
                            {s.count} {s.verdict.toLowerCase()}
                          </span>
                        ))
                      )}
                    </div>

                    {/* Uploaded */}
                    <div className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
                      <Clock3 className="size-3.5 shrink-0" aria-hidden />
                      {doc.created_at
                        ? formatDistanceToNow(new Date(doc.created_at), {
                            addSuffix: true,
                          })
                        : "—"}
                    </div>

                    {/* Verdict */}
                    <div className="flex items-center">
                      {doc.overall_verdict ? (
                        <VerdictBadge verdict={doc.overall_verdict} />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Open — stretched link makes the whole row clickable */}
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="group-hover:border-ink/30"
                        render={
                          <Link
                            href={`/app/review/${doc.id}`}
                            aria-label={`Open review for ${vendor?.name ?? doc.file_name}`}
                            className="after:absolute after:inset-0"
                          />
                        }
                      >
                        Open
                      </Button>
                      <ChevronRight
                        className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </ContentSurface>

      <PageSecondary>
        Document review assistance — not legal, insurance, or professional
        advice. Customer remains the final approver after publish.
      </PageSecondary>
    </PageFrame>
  );
}
