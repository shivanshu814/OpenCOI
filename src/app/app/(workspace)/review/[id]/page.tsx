import { DocumentPipelineTracker } from "@/components/document-pipeline-tracker";
import { DownloadReportButton } from "@/components/download-report-button";
import { CardLiveAccent, LiveBadge } from "@/components/live-activity";
import {
  DetailHeader,
  PageFrame,
  PageSecondary,
  StatStrip,
} from "@/components/page-frame";
import { VerdictBadge } from "@/components/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/config";
import { getDocument, listVendors } from "@/lib/data/documents";
import type { Verdict } from "@/lib/requirements/engine";
import { formatUsd } from "@/lib/ui/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { Check, Clock, Minus, TriangleAlert, X } from "lucide-react";
import { notFound } from "next/navigation";
import { RequestAgentConfirmButton } from "./request-agent-confirm";
import { ReviewActions } from "./review-actions";
import { RunExtractionButton } from "./run-extraction-button";

const VERDICT_ICON: Record<Verdict, { Icon: typeof Check; className: string }> =
  {
    PASS: { Icon: Check, className: "bg-emerald-100 text-emerald-700" },
    FAIL: { Icon: X, className: "bg-red-100 text-red-700" },
    EXPIRING: { Icon: Clock, className: "bg-amber-100 text-amber-700" },
    MISSING: { Icon: Minus, className: "bg-slate-100 text-slate-600" },
  };

const FIELD_GRID = "grid-cols-[minmax(6rem,0.7fr)_minmax(0,1.4fr)_auto]";
const CHECK_GRID = "grid-cols-[minmax(0,1fr)_auto]";

export default async function ReviewDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [doc, vendors] = await Promise.all([getDocument(id), listVendors()]);
  if (!doc) notFound();

  // Uploaded but extraction hasn't landed yet — show why, don't 404.
  if (!doc.extraction) {
    const extractionFailed = doc.status === "extraction_failed";
    return (
      <PageFrame>
        <DetailHeader
          backHref="/app/review"
          backLabel="Review queue"
          title={
            extractionFailed
              ? "Extraction needs a retry"
              : "Preparing your COI review"
          }
          meta={doc.file_name}
          badge={
            <LiveBadge
              label={extractionFailed ? "Failed" : "Waiting"}
              tone={extractionFailed ? "bad" : "warn"}
            />
          }
        />

        <DocumentPipelineTracker status={doc.status} />

        <Card className="gap-0 overflow-hidden py-0">
          <CardLiveAccent />
          <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center lg:p-10">
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
                    extractionFailed
                      ? "bg-red-100 text-red-700"
                      : "bg-brand-muted text-brand"
                  }`}
                >
                  {extractionFailed ? (
                    <TriangleAlert className="size-5" />
                  ) : (
                    <Clock className="size-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                    {extractionFailed
                      ? "AI extraction failed"
                      : "AI extraction pending"}
                    <LiveBadge
                      label={extractionFailed ? "Failed" : "Waiting"}
                      tone={extractionFailed ? "bad" : "warn"}
                    />
                  </CardTitle>
                  <CardDescription className="mt-1 max-w-xl leading-relaxed">
                    {extractionFailed
                      ? "The upload is safe — nothing was lost. The AI read of this certificate did not complete, so no verdict exists yet. Retry below; if it keeps failing, upload a clearer PDF."
                      : "The upload is safe. CertShield is reading policy dates, limits, insured details, and endorsements before creating the review."}
                  </CardDescription>
                </div>
              </div>

              <Alert className="px-4 py-3">
                <TriangleAlert />
                <AlertTitle>
                  {extractionFailed
                    ? "No verdict was produced"
                    : "Taking longer than expected"}
                </AlertTitle>
                <AlertDescription>
                  {extractionFailed
                    ? "The failure is recorded in the audit trail. Retrying is safe — nothing will be published automatically; every result still goes through review."
                    : "You can retry extraction now. Nothing will be published automatically—every result still goes through review."}
                </AlertDescription>
              </Alert>
            </div>

            <div className="border-border bg-muted/30 space-y-3 rounded-xl border p-5">
              <p className="text-sm font-semibold">Next step</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Run extraction, then verify the fields and compliance checks
                against the original certificate.
              </p>
              {doc.status === "uploaded" ||
              doc.status === "extraction_failed" ? (
                <RunExtractionButton documentId={doc.id} />
              ) : (
                <p className="text-muted-foreground text-xs">
                  Processing is already underway — this page refreshes itself.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <PageSecondary>
          Nothing auto-publishes. Document review assistance — not legal,
          insurance, or professional advice.
        </PageSecondary>
      </PageFrame>
    );
  }

  const vendor = vendors.find((v) => v.id === doc.vendor_id);
  const ex = doc.extraction;
  const pdfUrl = await signedPdfUrl(doc.storage_path);

  const phaseLabel =
    doc.status === "published"
      ? "Awaiting your accept / override"
      : doc.status === "accepted" || doc.status === "overridden"
        ? `Customer decision: ${doc.status}`
        : doc.status === "in_internal_review"
          ? "Internal review"
          : doc.status;

  const verdictCount = (v: Verdict) =>
    doc.check_lines.filter((l) => l.verdict === v).length;
  const passCount = verdictCount("PASS");
  const failCount = verdictCount("FAIL");
  const missingCount = verdictCount("MISSING");
  const expiringCount = verdictCount("EXPIRING");

  const glEachOccurrence = ex.policies[0]?.limits.find(
    (l) => l.name === "each_occurrence",
  );

  return (
    <PageFrame>
      <DetailHeader
        backHref="/app/review"
        backLabel="Review queue"
        title={vendor?.name ?? "Vendor"}
        meta={`${doc.file_name} · ${phaseLabel}`}
        badge={<LiveBadge label="In review" tone="info" />}
        actions={
          <>
            {doc.overall_verdict ? (
              <VerdictBadge verdict={doc.overall_verdict} />
            ) : null}
            <DownloadReportButton
              vendorId={doc.vendor_id}
              documentId={doc.id}
              label="Compliance report PDF"
            />
          </>
        }
      />

      <DocumentPipelineTracker status={doc.status} />

      {doc.check_lines.length > 0 ? (
        <StatStrip
          items={[
            { label: "Pass", value: passCount, tone: "ok" },
            {
              label: "Fail",
              value: failCount,
              tone: failCount > 0 ? "danger" : "ok",
            },
            {
              label: "Missing",
              value: missingCount,
              tone: missingCount > 0 ? "warn" : "default",
            },
            {
              label: "Expiring",
              value: expiringCount,
              tone: expiringCount > 0 ? "warn" : "default",
            },
          ]}
        />
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="bg-muted/40 min-h-[420px] items-center justify-center py-0 lg:sticky lg:top-6">
          {pdfUrl ? (
            <iframe
              title="COI PDF"
              src={pdfUrl}
              className="h-[560px] w-full border-0"
            />
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm font-medium">PDF preview</p>
              <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">
                {isSupabaseConfigured()
                  ? "No storage path yet — upload a COI to render side-by-side."
                  : "Demo mode uses extraction JSON only. Connect Supabase Storage for PDF preview."}
              </p>
            </div>
          )}
        </Card>

        <section className="min-w-0 space-y-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Extracted fields</CardTitle>
              <CardDescription className="text-xs">
                Anything below 90% confidence is flagged — verify against the
                PDF.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div
                className={cn(
                  "text-muted-foreground bg-muted/40 grid items-center gap-x-3 border-b px-4 py-2 text-[11px] font-medium tracking-wide uppercase",
                  FIELD_GRID,
                )}
                aria-hidden
              >
                <span>Field</span>
                <span>Value</span>
                <span className="text-right">Conf.</span>
              </div>
              <div className="divide-y">
                <FieldRow
                  label="Insured"
                  value={ex.insured.name}
                  conf={ex.insured.confidence}
                />
                <FieldRow
                  label="Producer"
                  value={ex.producer.name}
                  conf={ex.producer.confidence}
                />
                <FieldRow
                  label="GL each-occurrence"
                  value={formatUsd(glEachOccurrence?.amount)}
                  conf={glEachOccurrence?.confidence}
                />
                <FieldRow
                  label="Expiration"
                  value={ex.policies[0]?.expiration_date ?? "—"}
                  conf={ex.policies[0]?.confidence}
                />
                <FieldRow
                  label="Endorsements"
                  value={
                    ex.endorsement_forms_detected
                      .map((e) => e.form)
                      .join(", ") || "None detected"
                  }
                  conf={ex.endorsement_forms_detected[0]?.confidence}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Requirements check</CardTitle>
              <CardAction>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {passCount} pass
                  {failCount > 0 ? (
                    <span className="ml-2 font-medium text-red-700">
                      {failCount} fail
                    </span>
                  ) : null}
                  {missingCount > 0 ? (
                    <span className="ml-2 font-medium text-slate-600">
                      {missingCount} missing
                    </span>
                  ) : null}
                  {expiringCount > 0 ? (
                    <span className="ml-2 font-medium text-amber-700">
                      {expiringCount} expiring
                    </span>
                  ) : null}
                </p>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div
                className={cn(
                  "text-muted-foreground bg-muted/40 grid items-center gap-x-3 border-b px-4 py-2 text-[11px] font-medium tracking-wide uppercase",
                  CHECK_GRID,
                )}
                aria-hidden
              >
                <span>Requirement</span>
                <span className="text-right">Status</span>
              </div>
              <div className="divide-y">
                {doc.check_lines.map((line) => {
                  const { Icon, className } = VERDICT_ICON[line.verdict];
                  return (
                    <div
                      key={line.rule_id}
                      className={cn(
                        "grid items-start gap-x-3 px-4 py-3",
                        CHECK_GRID,
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${className}`}
                          aria-hidden
                        >
                          <Icon className="size-3" strokeWidth={3} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{line.label}</p>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {line.reason}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-0.5">
                        <VerdictBadge verdict={line.verdict} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {(doc.fraud_signals?.length ?? 0) > 0 ? (
            <Alert className="border-amber-200 bg-amber-50/50 text-amber-950">
              <TriangleAlert className="size-4 text-amber-600" aria-hidden />
              <AlertTitle>Risk signals (not a guarantee)</AlertTitle>
              <AlertDescription>
                <p className="text-muted-foreground text-xs">
                  Heuristics only — never proof of fraud.
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {doc.fraud_signals!.map((s) => (
                    <li key={`${s.code}-${s.message.slice(0, 24)}`}>
                      <span className="text-xs font-medium tracking-wide text-amber-900 uppercase">
                        {s.severity}
                      </span>
                      <p className="text-foreground text-xs leading-relaxed">
                        {s.message}
                      </p>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          <RequestAgentConfirmButton documentId={doc.id} />

          <ReviewActions
            documentId={doc.id}
            status={doc.status}
            overallVerdict={doc.overall_verdict}
            customerDecision={doc.customer_decision}
            customerDecisionReason={doc.customer_decision_reason}
          />
        </section>
      </div>

      <PageSecondary>
        You remain the final approver. Document review assistance — not legal,
        insurance, or professional advice.
      </PageSecondary>
    </PageFrame>
  );
}

async function signedPdfUrl(storagePath: string | null | undefined) {
  if (!storagePath || storagePath === "pending" || !isSupabaseConfigured()) {
    return null;
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase.storage
      .from("cois")
      .createSignedUrl(storagePath, 60 * 10);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

function FieldRow({
  label,
  value,
  conf,
}: {
  label: string;
  value: string | null | undefined;
  conf?: number;
}) {
  const low = conf != null && conf < 0.9;
  return (
    <div className={cn("grid items-center gap-x-3 px-4 py-2.5", FIELD_GRID)}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="min-w-0 text-sm font-medium break-words tabular-nums">
        {value ?? "—"}
      </span>
      <span className="justify-self-end">
        {conf != null ? (
          low ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 tabular-nums">
              <TriangleAlert className="size-3" aria-hidden />
              {Math.round(conf * 100)}%
            </span>
          ) : (
            <span className="text-muted-foreground text-xs tabular-nums">
              {Math.round(conf * 100)}%
            </span>
          )
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </span>
    </div>
  );
}
