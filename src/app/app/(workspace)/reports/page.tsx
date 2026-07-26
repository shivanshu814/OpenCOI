import { DownloadOwnerReportButton } from "@/components/download-owner-report-button";
import {
  CardLiveAccent,
  LiveBadge,
  LiveDot,
  PageLiveStrip,
} from "@/components/live-activity";
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
import {
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listOwnerReportRows } from "@/lib/reports/owner-load";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";

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
        <ContentSurface className="gap-0 py-0 shadow-xs" rail={false}>
          <CardLiveAccent />
          <CardHeader className="gap-0.5 border-b px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-semibold">
                By property
              </CardTitle>
              <LiveBadge label="Live" tone="ok" />
            </div>
            <CardDescription className="text-xs">
              One report per property — download anytime, or email the owner on
              file. Enable monthly auto-send on the property detail.
            </CardDescription>
            <CardAction className="text-muted-foreground flex items-center gap-1.5 text-xs tabular-nums">
              <LiveDot tone="ok" />
              {properties.length}
            </CardAction>
          </CardHeader>
          <CardContent className="divide-y px-0">
            {properties.map((p) => {
              const location = [p.city, p.state].filter(Boolean).join(", ");
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-5"
                >
                  <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
                    <ScoreRing
                      score={p.compliance_percent}
                      size="sm"
                      animate={false}
                      pulse={p.vendor_count > 0 && p.risks_flagged === 0}
                    />
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/app/properties/${p.id}`}
                          className="truncate text-sm font-semibold hover:underline"
                        >
                          {p.name}
                        </Link>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset ${
                            p.owner_report_enabled
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
                              : "bg-muted text-muted-foreground ring-border"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              p.owner_report_enabled
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {p.owner_report_enabled
                            ? "Monthly on"
                            : "Monthly off"}
                        </span>
                      </div>
                      <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Building2
                            className="size-3 opacity-70"
                            strokeWidth={2.25}
                            aria-hidden
                          />
                          {location || "Location not set"}
                        </span>
                        <span aria-hidden>·</span>
                        <span>
                          {p.owner_report_email
                            ? p.owner_report_email
                            : "No owner email — set on property"}
                        </span>
                      </p>
                      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <dt className="text-muted-foreground">Covered</dt>
                          <dd className="font-semibold tabular-nums text-brand">
                            {p.compliance_percent}%
                          </dd>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <dt className="text-muted-foreground">Docs</dt>
                          <dd className="font-medium tabular-nums">
                            {p.documents_on_file}
                          </dd>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <dt className="text-muted-foreground">Risks</dt>
                          <dd
                            className={`font-medium tabular-nums ${
                              p.risks_flagged > 0
                                ? "text-amber-700"
                                : "text-foreground"
                            }`}
                          >
                            {p.risks_flagged}
                          </dd>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <dt className="text-muted-foreground">Vendors</dt>
                          <dd className="font-medium tabular-nums">
                            {p.vendor_count}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <DownloadOwnerReportButton
                      propertyId={p.id}
                      label="Download PDF"
                    />
                    <SendOwnerReportButton
                      propertyId={p.id}
                      toHint={p.owner_report_email}
                      variant="primary"
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
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
