import { DownloadOwnerReportButton } from "@/components/download-owner-report-button";
import {
  CardLiveAccent,
  LiveBadge,
  PageLiveStrip,
} from "@/components/live-activity";
import {
  ListLiveCount,
  ListTableHead,
  ListTableRow,
} from "@/components/list-table";
import {
  ContentSurface,
  PageFrame,
  PageHeader,
  PageSecondary,
  StatStrip,
} from "@/components/page-frame";
import { ScoreRing } from "@/components/product-preview";
import { ReportsEmptyState } from "@/components/reports-empty-state";
import { SendOwnerReportButton } from "@/components/send-owner-report-button";
import { Button } from "@/components/ui/button";
import { listOwnerReportRows } from "@/lib/reports/owner-load";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";

const ROW_GRID =
  "lg:grid-cols-[minmax(14rem,1.3fr)_minmax(7rem,0.55fr)_minmax(5rem,0.4fr)_minmax(5rem,0.4fr)_minmax(5rem,0.4fr)_auto]";

export default async function ReportsPage() {
  const properties = await listOwnerReportRows();
  const readyToSend = properties.filter((p) => p.owner_report_email).length;
  const withRisks = properties.filter((p) => p.risks_flagged > 0).length;

  return (
    <PageFrame>
      <div className="space-y-2">
        <PageHeader
          title="Owner reports"
          description="Branded monthly PDF/email for building owners — compliance %, documents on file, and risks flagged."
          audience="Property managers reporting to owners"
          nextStep={
            properties.length === 0
              ? "Add a property first — reports need a real building."
              : readyToSend === 0
                ? "Set an owner email on a property, then send or download."
                : "Download or email a report — you stay the final approver."
          }
          help="Risks flagged counts vendors that are non-compliant, missing docs, or in review — not claim outcomes. Mid-term cancellations are mitigated via agent confirmation, not automatic detection."
          live
          liveLabel="D3"
          actions={
            <Button
              className="bg-ink text-ink-foreground hover:bg-ink/90 gap-1.5"
              render={<Link href="/app/properties" />}
            >
              <Plus className="size-3.5" strokeWidth={2.25} aria-hidden />
              Add property
            </Button>
          }
        />
        <PageLiveStrip
          items={[
            { text: "Owner-ready PDF + email", tone: "brand" },
            { text: "Compliance % · docs · risks", tone: "info" },
            {
              text:
                properties.length === 0
                  ? "Add a property to unlock reports"
                  : `${properties.length} propert${properties.length === 1 ? "y" : "ies"} · ${readyToSend} with owner email`,
              tone: properties.length === 0 ? "warn" : "ok",
            },
            { text: "Not legal or insurance advice", tone: "info" },
          ]}
        />
      </div>

      {properties.length > 0 ? (
        <StatStrip
          items={[
            {
              label: "Properties",
              value: properties.length,
              tone: "brand",
            },
            {
              label: "Ready to email",
              value: readyToSend,
              tone: readyToSend > 0 ? "ok" : "warn",
              hint:
                readyToSend === 0
                  ? "Set owner email on the property"
                  : undefined,
            },
            {
              label: "With risks flagged",
              value: withRisks,
              tone: withRisks > 0 ? "warn" : "ok",
            },
          ]}
        />
      ) : null}

      {properties.length === 0 ? (
        <ReportsEmptyState />
      ) : (
        <ContentSurface className="shadow-xs" rail={false}>
          <CardLiveAccent />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3.5 sm:px-5">
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight">
                  By property
                </h2>
                <LiveBadge label="Live" tone="ok" />
                <ListLiveCount>{properties.length}</ListLiveCount>
              </div>
              <p className="text-muted-foreground text-xs">
                One report per property — download anytime, or email the owner
                on file.
              </p>
            </div>
          </div>

          <ListTableHead
            gridClassName={ROW_GRID}
            columns={[
              "Property",
              "Covered",
              "Docs",
              "Risks",
              "Vendors",
              { label: "Actions", className: "text-right" },
            ]}
          />

          <div className="divide-y">
            {properties.map((p) => {
              const location = [p.city, p.state].filter(Boolean).join(", ");
              return (
                <ListTableRow key={p.id} gridClassName={ROW_GRID}>
                  <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
                    <ScoreRing
                      score={p.compliance_percent}
                      size="sm"
                      animate={false}
                      pulse={p.vendor_count > 0 && p.risks_flagged === 0}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/app/properties/${p.id}`}
                          className="truncate text-sm font-semibold underline-offset-4 hover:underline"
                        >
                          {p.name}
                        </Link>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset ${
                            p.owner_report_enabled
                              ? "status-surface status-ok"
                              : "bg-muted text-muted-foreground ring-border"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              p.owner_report_enabled
                                ? "bg-[var(--status-ok)]"
                                : "bg-[var(--status-neutral)]"
                            }`}
                          />
                          {p.owner_report_enabled ? "Monthly on" : "Off"}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Building2
                            className="size-3 opacity-70"
                            strokeWidth={2.25}
                            aria-hidden
                          />
                          {location || "Location not set"}
                        </span>
                        <span aria-hidden className="hidden sm:inline">
                          ·
                        </span>
                        <span className="truncate">
                          {p.owner_report_email || "No owner email"}
                        </span>
                      </p>
                      <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs lg:hidden">
                        <div className="flex gap-1">
                          <dt className="text-muted-foreground">Covered</dt>
                          <dd className="text-brand font-semibold tabular-nums">
                            {p.compliance_percent}%
                          </dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="text-muted-foreground">Docs</dt>
                          <dd className="font-medium tabular-nums">
                            {p.documents_on_file}
                          </dd>
                        </div>
                        <div className="flex gap-1">
                          <dt className="text-muted-foreground">Risks</dt>
                          <dd
                            className={`font-medium tabular-nums ${
                              p.risks_flagged > 0
                                ? "text-[var(--status-warn)]"
                                : "text-foreground"
                            }`}
                          >
                            {p.risks_flagged}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="text-brand hidden text-sm font-semibold tabular-nums lg:block">
                    {p.compliance_percent}%
                  </div>
                  <div className="hidden text-sm font-medium tabular-nums lg:block">
                    {p.documents_on_file}
                  </div>
                  <div
                    className={`hidden text-sm font-medium tabular-nums lg:block ${
                      p.risks_flagged > 0
                        ? "text-[var(--status-warn)]"
                        : "text-foreground"
                    }`}
                  >
                    {p.risks_flagged}
                  </div>
                  <div className="hidden text-sm font-medium tabular-nums lg:block">
                    {p.vendor_count}
                  </div>

                  <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2 lg:ml-0">
                    <DownloadOwnerReportButton
                      propertyId={p.id}
                      label="PDF"
                    />
                    <SendOwnerReportButton
                      propertyId={p.id}
                      toHint={p.owner_report_email}
                      variant="primary"
                    />
                  </div>
                </ListTableRow>
              );
            })}
          </div>
        </ContentSurface>
      )}

      <PageSecondary>
        Risks flagged counts vendors that are non-compliant, missing documents,
        or in review — not insurance claim outcomes. Mid-term cancellations are
        mitigated via agent confirmation, not automatic detection. Document
        review assistance — not legal, insurance, or professional advice.
      </PageSecondary>
    </PageFrame>
  );
}
