import { inngest } from "@/inngest/client";
import { extractCoiFromPdfBase64, MODEL_VERSION } from "@/lib/ai/extract";
import {
  isClaudeConfigured,
  isInngestConfigured,
} from "@/lib/config";
import { PROMPT_VERSION } from "@/lib/extraction/schema";
import { runRequirementsEngine } from "@/lib/requirements/engine";
import { loadMergedRulesForDocument } from "@/lib/requirements/merge";
import { createAdminClient } from "@/lib/supabase/admin";
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

  await db.from("audit_events").insert({
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

  const pdfBase64 = args.pdfBytes.toString("base64");
  let queued = false;

  if (isInngestConfigured()) {
    await inngest.send({
      name: "document/uploaded",
      data: {
        documentId: doc.id,
        orgId: args.orgId,
        pdfBase64,
      },
    });
    queued = true;
  } else if (isClaudeConfigured()) {
    await runExtractInline({
      documentId: doc.id,
      orgId: args.orgId,
      pdfBase64,
    });
    queued = true;
  }

  return { documentId: doc.id, storagePath, queued };
}

export async function runExtractInline(args: {
  documentId: string;
  orgId: string;
  pdfBase64: string;
}) {
  const extraction = await extractCoiFromPdfBase64({
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
  const checks = runRequirementsEngine(extraction, rules);

  await admin.from("extractions").insert({
    org_id: args.orgId,
    document_id: args.documentId,
    payload: extraction,
    model_version: MODEL_VERSION,
    prompt_version: PROMPT_VERSION,
    overall_confidence: extraction.extraction_meta.overall_confidence,
    cost_usd: extraction.extraction_meta.cost_usd,
    latency_ms: extraction.extraction_meta.latency_ms,
  });

  await admin.from("compliance_checks").insert({
    org_id: args.orgId,
    document_id: args.documentId,
    vendor_id: doc.vendor_id,
    lines: checks.lines,
    overall_verdict: checks.overall,
  });

  await admin
    .from("documents")
    .update({ status: "in_internal_review" })
    .eq("id", args.documentId);

  await admin
    .from("vendors")
    .update({ status: "in_review" })
    .eq("id", doc.vendor_id);

  await admin.from("audit_events").insert({
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
  });
}
