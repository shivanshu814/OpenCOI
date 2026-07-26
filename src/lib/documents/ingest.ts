import { inngest } from "@/inngest/client";
import {
  describeExtractionError,
  extractCoiWithRetry,
  MODEL_VERSION,
} from "@/lib/ai/extract";
import {
  isClaudeConfigured,
  shouldQueueViaInngest,
} from "@/lib/config";
import { PROMPT_VERSION } from "@/lib/extraction/schema";
import { runRequirementsEngine } from "@/lib/requirements/engine";
import {
  loadMergedRulesForDocument,
  loadPropertyValidation,
} from "@/lib/requirements/merge";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditEvent } from "@/lib/audit/write";
import type { SupabaseClient } from "@supabase/supabase-js";

export type IngestPdfArgs = {
  orgId: string;
  vendorId: string;
  propertyId?: string | null;
  projectId?: string | null;
  fileName: string;
  mimeType?: string;
  pdfBytes: Buffer;
  /** User id when human upload; omit for system/email-in / vendor portal. */
  actor?: { type: "admin" | "system" | "vendor"; id: string };
  /** Extra audit payload (e.g. Postmark MessageID). */
  auditExtra?: Record<string, unknown>;
  /** DB client — user-scoped for web upload, admin for webhooks/portal. */
  supabase: SupabaseClient;
};

export type IngestPdfResult = {
  documentId: string;
  storagePath: string;
  queued: boolean;
  /**
   * Set when the upload stored fine but inline AI extraction failed. The
   * document is already marked extraction_failed with an audit event; the
   * caller should surface this honestly (never a success toast) and point at
   * "Run extraction now" — the upload itself did NOT fail.
   */
  extractionError?: string;
};

/** Persist PDF → Storage → documents row → queue extraction (Inngest or sync). */
export async function ingestPdfDocument(
  args: IngestPdfArgs,
): Promise<IngestPdfResult> {
  const db = args.supabase;
  const mime = args.mimeType || "application/pdf";

  const { data: doc, error: docErr } = await db
    .from("documents")
    .insert({
      org_id: args.orgId,
      vendor_id: args.vendorId,
      property_id: args.propertyId ?? null,
      project_id: args.projectId ?? null,
      storage_path: "pending",
      file_name: args.fileName,
      mime_type: mime,
      status: "uploaded",
    })
    .select("id")
    .single();

  if (docErr || !doc) {
    throw new Error(docErr?.message ?? "Failed to create document");
  }

  const storagePath = `${args.orgId}/${args.vendorId}/${doc.id}.pdf`;

  const { error: upErr } = await db.storage
    .from("cois")
    .upload(storagePath, args.pdfBytes, {
      contentType: mime,
      upsert: false,
    });

  if (upErr) {
    await db.from("documents").delete().eq("id", doc.id);
    throw new Error(upErr.message);
  }

  await db
    .from("documents")
    .update({ storage_path: storagePath })
    .eq("id", doc.id);

  await insertAuditEvent(db, {
    org_id: args.orgId,
    actor_type: args.actor?.type ?? "system",
    actor_id: args.actor?.id ?? "ingest",
    entity_type: "document",
    entity_id: doc.id,
    action: "uploaded",
    after_state: {
      storage_path: storagePath,
      file_name: args.fileName,
      ...args.auditExtra,
    },
  });

  let queued = false;

  // Pass storage path only — never embed PDF base64 in Inngest (payload limits
  // + data residency). Worker downloads from Supabase Storage.
  if (shouldQueueViaInngest()) {
    try {
      await inngest.send({
        name: "document/uploaded",
        data: {
          documentId: doc.id,
          orgId: args.orgId,
          storagePath,
        },
      });
      queued = true;
    } catch (err) {
      console.error("[ingest] inngest send failed, falling back to inline", err);
    }
  }

  let extractionError: string | undefined;

  if (!queued && isClaudeConfigured()) {
    try {
      await runExtractInline({
        documentId: doc.id,
        orgId: args.orgId,
        pdfBase64: args.pdfBytes.toString("base64"),
      });
      queued = true;
    } catch (err) {
      // The upload itself succeeded — the doc is stored and already marked
      // extraction_failed (+ audit) by runExtractInline. Fail soft so the
      // caller can land the user on the review page with a retry, instead of
      // a dishonest "Upload failed" 500.
      extractionError = describeExtractionError(err);
      console.error("[ingest] inline extraction failed:", extractionError);
    }
  }

  return { documentId: doc.id, storagePath, queued, extractionError };
}

export type ExtractRetryResult =
  /** Extraction ran now and the document moved forward in the pipeline. */
  | { outcome: "extracted"; status: string }
  /** Already past extraction — nothing to retry, just show the review. */
  | { outcome: "already_extracted"; status: string };

/**
 * Re-run extraction for a stuck `uploaded` / `extraction_failed` doc.
 *
 * A document that is already `extracted`/`checked`/`in_internal_review` (or
 * further) is NOT an error: the usual cause is a double-click or a stale tab
 * where extraction finished between render and click. Reporting "Cannot
 * extract from status in_internal_review. Retry extraction." was both wrong
 * (retrying can never help) and alarming, so those statuses return
 * `already_extracted` and the caller sends the user to the review instead.
 */
export async function extractDocumentFromStorage(args: {
  documentId: string;
  orgId: string;
}): Promise<ExtractRetryResult> {
  if (!isClaudeConfigured()) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const admin = createAdminClient();
  const { data: doc, error } = await admin
    .from("documents")
    .select("id, org_id, storage_path, status")
    .eq("id", args.documentId)
    .eq("org_id", args.orgId)
    .maybeSingle();

  if (error || !doc) throw new Error(error?.message ?? "Document not found");
  if (doc.status !== "uploaded" && doc.status !== "extraction_failed") {
    return { outcome: "already_extracted", status: doc.status };
  }
  if (!doc.storage_path || doc.storage_path === "pending") {
    throw new Error("PDF not in storage yet");
  }

  const { data: file, error: dlErr } = await admin.storage
    .from("cois")
    .download(doc.storage_path);
  if (dlErr || !file) {
    throw new Error(dlErr?.message ?? "Failed to download PDF");
  }

  // Reset to uploaded so a prior extraction_failed can re-enter the pipeline.
  if (doc.status === "extraction_failed") {
    await admin
      .from("documents")
      .update({ status: "uploaded", updated_at: new Date().toISOString() })
      .eq("id", doc.id);
  }

  const pdfBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  await runExtractInline({
    documentId: doc.id,
    orgId: args.orgId,
    pdfBase64,
  });
  return { outcome: "extracted", status: "in_internal_review" };
}

export async function downloadPdfBase64FromStorage(
  storagePath: string,
): Promise<string> {
  const admin = createAdminClient();
  const { data: file, error } = await admin.storage
    .from("cois")
    .download(storagePath);
  if (error || !file) {
    throw new Error(error?.message ?? "Failed to download PDF");
  }
  return Buffer.from(await file.arrayBuffer()).toString("base64");
}

/** Mark a document as extraction_failed + audit (Inngest onFailure / catch). */
export async function markExtractionFailed(input: {
  documentId: string;
  orgId: string;
  error: string;
  actorId?: string;
}) {
  const admin = createAdminClient();
  await admin
    .from("documents")
    .update({
      status: "extraction_failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.documentId)
    .eq("org_id", input.orgId)
    .in("status", ["uploaded", "extracted", "checked"]);

  await insertAuditEvent(admin, {
    org_id: input.orgId,
    actor_type: "system",
    actor_id: input.actorId ?? "extract-document",
    entity_type: "document",
    entity_id: input.documentId,
    action: "extraction_failed",
    after_state: { error: input.error },
  }, { captureRequest: false });
}

export async function runExtractInline(args: {
  documentId: string;
  orgId: string;
  pdfBase64: string;
}) {
  try {
    const extraction = await extractCoiWithRetry({
      pdfBase64: args.pdfBase64,
    });
    const admin = createAdminClient();

    const { data: doc } = await admin
      .from("documents")
      .select("vendor_id, property_id, project_id")
      .eq("id", args.documentId)
      .single();

    if (!doc) throw new Error("document not found");

    const rules = await loadMergedRulesForDocument({
      orgId: args.orgId,
      vendorId: doc.vendor_id,
      propertyId: doc.property_id,
      projectId: doc.project_id,
      supabase: admin,
    });
    const propertyValidation = await loadPropertyValidation({
      orgId: args.orgId,
      propertyId: doc.property_id,
      supabase: admin,
    });
    const checks = runRequirementsEngine(extraction, rules, propertyValidation);

    // Throw on persist errors (matches the Inngest path) — otherwise the doc
    // would advance to in_internal_review with no extraction row and strand
    // with neither data nor a retry button.
    const { error: extErr } = await admin.from("extractions").insert({
      org_id: args.orgId,
      document_id: args.documentId,
      payload: extraction,
      model_version: MODEL_VERSION,
      prompt_version: PROMPT_VERSION,
      overall_confidence: extraction.extraction_meta.overall_confidence,
      cost_usd: extraction.extraction_meta.cost_usd,
      latency_ms: extraction.extraction_meta.latency_ms,
    });
    if (extErr) throw new Error(extErr.message);

    const { error: checkErr } = await admin.from("compliance_checks").insert({
      org_id: args.orgId,
      document_id: args.documentId,
      vendor_id: doc.vendor_id,
      lines: checks.lines,
      overall_verdict: checks.overall,
    });
    if (checkErr) throw new Error(checkErr.message);

    await admin
      .from("documents")
      .update({ status: "in_internal_review" })
      .eq("id", args.documentId);

    await admin
      .from("vendors")
      .update({ status: "in_review" })
      .eq("id", doc.vendor_id);

    await insertAuditEvent(admin, {
      org_id: args.orgId,
      actor_type: "system",
      actor_id: "sync:extract-document",
      entity_type: "document",
      entity_id: args.documentId,
      action: "checked_queued_internal_review",
      after_state: {
        overall: checks.overall,
        model_version: MODEL_VERSION,
        prompt_version: PROMPT_VERSION,
      },
    }, { captureRequest: false });
  } catch (err) {
    await markExtractionFailed({
      documentId: args.documentId,
      orgId: args.orgId,
      error: err instanceof Error ? err.message : "extraction failed",
      actorId: "sync:extract-document",
    });
    throw err;
  }
}
