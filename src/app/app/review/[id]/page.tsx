import { DownloadReportButton } from "@/components/download-report-button";
import { VerdictBadge } from "@/components/status-badges";
import { isSupabaseConfigured } from "@/lib/config";
import { getDocument, listVendors } from "@/lib/data/documents";
import type { Verdict } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  Check,
  Clock,
  Minus,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestAgentConfirmButton } from "./request-agent-confirm";
import { ReviewActions } from "./review-actions";

const VERDICT_ICON: Record<
  Verdict,
  { Icon: typeof Check; className: string }
> = {
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
  if (!doc || !doc.extraction) notFound();

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

  const failCount = doc.check_lines.filter(
    (l) => l.verdict === "FAIL",
  ).length;
  const passCount = doc.check_lines.filter(
    (l) => l.verdict === "PASS",
  ).length;

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
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {vendor?.name ?? "Vendor"}
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
        <section className="bg-muted/40 flex min-h-[420px] items-center justify-center overflow-hidden rounded-xl border lg:sticky lg:top-6">
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
        </section>

        <section className="min-w-0 space-y-4">
          <div className="bg-card rounded-xl border">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Extracted fields</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Anything below 90% confidence is flagged — verify against the
                PDF.
              </p>
            </div>
            <dl className="divide-y px-4">
              <Row
                label="Insured"
                value={ex.insured.name}
                conf={ex.insured.confidence}
              />
              <Row
                label="Producer"
                value={ex.producer.name}
                conf={ex.producer.confidence}
              />
              <Row
                label="GL each-occurrence"
                value={glEachOccurrence?.amount?.toLocaleString() ?? "—"}
                conf={glEachOccurrence?.confidence}
              />
              <Row
                label="Expiration"
                value={ex.policies[0]?.expiration_date ?? "—"}
                conf={ex.policies[0]?.confidence}
              />
              <Row
                label="Endorsements"
                value={
                  ex.endorsement_forms_detected.map((e) => e.form).join(", ") ||
                  "None detected"
                }
                conf={ex.endorsement_forms_detected[0]?.confidence}
              />
            </dl>
          </div>

          <div className="bg-card rounded-xl border">
            <div className="flex items-baseline justify-between gap-2 border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Requirements check</h2>
              <p className="text-muted-foreground text-xs tabular-nums">
                {passCount} pass
                {failCount > 0 ? (
                  <span className="ml-2 font-medium text-red-700">
                    {failCount} fail
                  </span>
                ) : null}
              </p>
            </div>
            <ul className="divide-y">
              {doc.check_lines.map((line) => {
                const { Icon, className } = VERDICT_ICON[line.verdict];
                return (
                  <li
                    key={line.rule_id}
                    className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                  >
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
                    <VerdictBadge verdict={line.verdict} />
                  </li>
                );
              })}
            </ul>
          </div>

          {(doc.fraud_signals?.length ?? 0) > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-amber-950">
                <TriangleAlert className="size-4 text-amber-600" aria-hidden />
                Risk signals (not a guarantee)
              </h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Heuristics only — never proof of fraud.
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {doc.fraud_signals!.map((s) => (
                  <li key={`${s.code}-${s.message.slice(0, 24)}`}>
                    <span className="text-xs font-medium tracking-wide text-amber-900 uppercase">
                      {s.severity}
                    </span>
                    <p className="text-xs leading-relaxed">{s.message}</p>
                  </li>
                ))}
              </ul>
            </div>
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

function Row({
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
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-muted-foreground shrink-0 text-xs">{label}</dt>
      <dd className="min-w-0 text-right text-sm">
        <span className="font-medium tabular-nums">{value ?? "—"}</span>
        {conf != null ? (
          low ? (
            <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 tabular-nums">
              <TriangleAlert className="size-3" aria-hidden />
              {Math.round(conf * 100)}% — verify
            </span>
          ) : (
            <span className="text-muted-foreground ml-2 text-xs tabular-nums">
              {Math.round(conf * 100)}%
            </span>
          )
        ) : null}
      </dd>
    </div>
  );
}
