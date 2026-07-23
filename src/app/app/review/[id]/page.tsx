import { DownloadReportButton } from "@/components/download-report-button";
import { CardLiveAccent, LiveBadge } from "@/components/live-activity";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isSupabaseConfigured } from "@/lib/config";
import { getDocument, listVendors } from "@/lib/data/documents";
import type { Verdict } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Check, Clock, Minus, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
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
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href="/app/review"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" /> Review queue
        </Link>
        <Card className="gap-0 overflow-hidden py-0">
          <CardLiveAccent />
          <CardHeader className="pt-4">
            <CardTitle className="flex flex-wrap items-center gap-2">
              <Clock className="size-4" /> Extraction pending
              <LiveBadge label="Waiting" tone="warn" />
            </CardTitle>
            <CardDescription>
              {doc.file_name} uploaded successfully, but AI extraction hasn’t
              completed yet. This page will show the verdict once it lands.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <TriangleAlert />
              <AlertTitle>Extraction hasn’t finished</AlertTitle>
              <AlertDescription>
                Document status is <code>{doc.status}</code>. Locally,
                extraction runs inline via OpenRouter (no Inngest worker
                needed). On production, Inngest handles it in the background.
              </AlertDescription>
            </Alert>
            {doc.status === "uploaded" ? (
              <RunExtractionButton documentId={doc.id} />
            ) : null}
          </CardContent>
        </Card>
      </div>
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

  const failCount = doc.check_lines.filter((l) => l.verdict === "FAIL").length;
  const passCount = doc.check_lines.filter((l) => l.verdict === "PASS").length;

  const glEachOccurrence = ex.policies[0]?.limits.find(
    (l) => l.name === "each_occurrence",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/app/review"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="size-3" aria-hidden />
            Review queue
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight">
            {vendor?.name ?? "Vendor"}
            <LiveBadge label="In review" tone="info" />
          </h1>
          <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
            <span className="truncate">{doc.file_name}</span>
            <span className="text-muted-foreground/60" aria-hidden>
              ·
            </span>
            <span className="text-xs">{phaseLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {doc.overall_verdict ? (
            <VerdictBadge verdict={doc.overall_verdict} />
          ) : null}
          <DownloadReportButton
            vendorId={doc.vendor_id}
            documentId={doc.id}
            label="Compliance report PDF"
          />
        </div>
      </div>

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
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs font-medium">
                      Field
                    </TableHead>
                    <TableHead className="text-muted-foreground text-right text-xs font-medium">
                      Value
                    </TableHead>
                    <TableHead className="text-muted-foreground text-right text-xs font-medium">
                      Confidence
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                    value={glEachOccurrence?.amount?.toLocaleString() ?? "—"}
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
                </TableBody>
              </Table>
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
                </p>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs font-medium">
                      Requirement
                    </TableHead>
                    <TableHead className="text-muted-foreground text-right text-xs font-medium">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doc.check_lines.map((line) => {
                    const { Icon, className } = VERDICT_ICON[line.verdict];
                    return (
                      <TableRow key={line.rule_id}>
                        <TableCell className="whitespace-normal py-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${className}`}
                              aria-hidden
                            >
                              <Icon className="size-3" strokeWidth={3} />
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium">{line.label}</p>
                              <p className="text-muted-foreground text-xs leading-relaxed">
                                {line.reason}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-right align-top">
                          <VerdictBadge verdict={line.verdict} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
            customerDecision={doc.customer_decision}
            customerDecisionReason={doc.customer_decision_reason}
          />
        </section>
      </div>
    </div>
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
    <TableRow>
      <TableCell className="text-muted-foreground text-xs">{label}</TableCell>
      <TableCell className="whitespace-normal text-right text-sm font-medium tabular-nums">
        {value ?? "—"}
      </TableCell>
      <TableCell className="text-right">
        {conf != null ? (
          low ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 tabular-nums">
              <TriangleAlert className="size-3" aria-hidden />
              {Math.round(conf * 100)}% — verify
            </span>
          ) : (
            <span className="text-muted-foreground text-xs tabular-nums">
              {Math.round(conf * 100)}%
            </span>
          )
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
