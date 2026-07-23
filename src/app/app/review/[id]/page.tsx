import { DownloadReportButton } from "@/components/download-report-button";
import { VerdictBadge } from "@/components/status-badges";
import { isSupabaseConfigured } from "@/lib/config";
import { getDocument, listVendors } from "@/lib/data/documents";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestAgentConfirmButton } from "./request-agent-confirm";
import { ReviewActions } from "./review-actions";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs">
            <Link href="/app/review" className="hover:text-foreground">
              ← Review queue
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {vendor?.name ?? "Vendor"}
          </h1>
          <p className="text-muted-foreground text-sm">{doc.file_name}</p>
          <p className="text-muted-foreground mt-1 text-xs">{phaseLabel}</p>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-muted/40 flex min-h-[420px] items-center justify-center overflow-hidden rounded-lg border border-dashed">
          {pdfUrl ? (
            <iframe
              title="COI PDF"
              src={pdfUrl}
              className="h-[520px] w-full border-0"
            />
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm font-medium">PDF preview</p>
              <p className="text-muted-foreground mt-1 max-w-xs text-xs">
                {isSupabaseConfigured()
                  ? "No storage path yet — upload a COI to render side-by-side."
                  : "Demo mode uses extraction JSON only. Connect Supabase Storage for PDF preview."}
              </p>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border p-4 text-sm">
            <h2 className="mb-3 text-xs font-medium tracking-wide uppercase">
              Extracted fields
            </h2>
            <dl className="grid gap-2">
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
                value={
                  ex.policies[0]?.limits
                    .find((l) => l.name === "each_occurrence")
                    ?.amount?.toLocaleString() ?? "—"
                }
                conf={
                  ex.policies[0]?.limits.find(
                    (l) => l.name === "each_occurrence",
                  )?.confidence
                }
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

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 text-xs font-medium tracking-wide uppercase">
              Requirements check
            </h2>
            <ul className="space-y-3">
              {doc.check_lines.map((line) => (
                <li
                  key={line.rule_id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{line.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {line.reason}
                    </p>
                  </div>
                  <VerdictBadge verdict={line.verdict} />
                </li>
              ))}
            </ul>
          </div>

          {(doc.fraud_signals?.length ?? 0) > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <h2 className="mb-2 text-xs font-medium tracking-wide uppercase">
                Risk signals (not a guarantee)
              </h2>
              <p className="text-muted-foreground mb-3 text-xs">
                Heuristics only — never proof of fraud.
              </p>
              <ul className="space-y-2 text-sm">
                {doc.fraud_signals!.map((s) => (
                  <li key={`${s.code}-${s.message.slice(0, 24)}`}>
                    <span className="text-xs font-medium uppercase tracking-wide text-amber-900">
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
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed py-1.5 last:border-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-right text-sm">
        {value ?? "—"}
        {conf != null ? (
          <span
            className={`ml-2 text-xs ${low ? "text-amber-700" : "text-muted-foreground"}`}
          >
            {Math.round(conf * 100)}%
          </span>
        ) : null}
      </dd>
    </div>
  );
}
