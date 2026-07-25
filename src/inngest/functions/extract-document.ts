import { inngest } from "@/inngest/client";
import { extractCoiWithRetry, MODEL_VERSION } from "@/lib/ai/extract";
import type { Extraction } from "@/lib/extraction/schema";
import { PROMPT_VERSION } from "@/lib/extraction/schema";
import {
  downloadPdfBase64FromStorage,
  markExtractionFailed,
} from "@/lib/documents/ingest";
import {
  analyzePdfMetadata,
  insuredNameMismatchSignal,
  policyReuseSignals,
  type FraudSignal,
} from "@/lib/fraud/signals";
import { runRequirementsEngine } from "@/lib/requirements/engine";
import {
  loadMergedRulesForDocument,
  loadPropertyValidation,
} from "@/lib/requirements/merge";
import { createAdminClient } from "@/lib/supabase/admin";
import { nameSimilarity } from "@/lib/vendors/fuzzy-match";

export const extractDocument = inngest.createFunction(
  {
    id: "extract-document",
    triggers: [{ event: "document/uploaded" }],
    onFailure: async ({ event, error }) => {
      const data = event.data as {
        event?: {
          data?: {
            documentId?: string;
            orgId?: string;
          };
        };
      };
      const documentId = data.event?.data?.documentId;
      const orgId = data.event?.data?.orgId;
      if (!documentId || !orgId) return;
      await markExtractionFailed({
        documentId,
        orgId,
        error: error.message,
        actorId: "inngest:extract-document:onFailure",
      });
    },
  },
  async ({ event, step }) => {
    const payload = event.data as {
      documentId: string;
      orgId: string;
      /** Preferred: Storage path (no PDF in event body). */
      storagePath?: string;
      /** Legacy in-flight events may still carry base64. */
      pdfBase64?: string;
    };
    const { documentId, orgId } = payload;

    const pdfBase64 = await step.run("load-pdf", async () => {
      if (payload.storagePath) {
        return downloadPdfBase64FromStorage(payload.storagePath);
      }
      if (payload.pdfBase64) {
        return payload.pdfBase64;
      }
      // Resolve path from documents row when only ids were sent.
      const supabase = createAdminClient();
      const { data: doc } = await supabase
        .from("documents")
        .select("storage_path")
        .eq("id", documentId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!doc?.storage_path || doc.storage_path === "pending") {
        throw new Error("PDF storage path missing");
      }
      return downloadPdfBase64FromStorage(doc.storage_path);
    });

    const extraction = await step.run("claude-extract", async () => {
      return extractCoiWithRetry({ pdfBase64 });
    });

    const fraudSignals = await step.run("fraud-signals", async () => {
      return collectFraudSignals({
        orgId,
        documentId,
        pdfBase64,
        extraction,
      });
    });

    const checks = await step.run("requirements-engine", async () => {
      const supabase = createAdminClient();
      const { data: doc } = await supabase
        .from("documents")
        .select("vendor_id, property_id, project_id")
        .eq("id", documentId)
        .single();
      if (!doc) throw new Error("document not found");
      const rules = await loadMergedRulesForDocument({
        orgId,
        vendorId: doc.vendor_id,
        propertyId: doc.property_id,
        projectId: doc.project_id,
        supabase,
      });
      const propertyValidation = await loadPropertyValidation({
        orgId,
        propertyId: doc.property_id,
        supabase,
      });
      return runRequirementsEngine(extraction, rules, propertyValidation);
    });

    await step.run("persist-and-queue-review", async () => {
      const supabase = createAdminClient();

      const { error: extErr } = await supabase.from("extractions").insert({
        org_id: orgId,
        document_id: documentId,
        payload: extraction,
        model_version: MODEL_VERSION,
        prompt_version: PROMPT_VERSION,
        overall_confidence: extraction.extraction_meta.overall_confidence,
        cost_usd: extraction.extraction_meta.cost_usd,
        latency_ms: extraction.extraction_meta.latency_ms,
      });
      if (extErr) throw extErr;

      const { data: doc } = await supabase
        .from("documents")
        .select("vendor_id")
        .eq("id", documentId)
        .single();

      if (!doc) throw new Error("document not found");

      const { error: checkErr } = await supabase.from("compliance_checks").insert({
        org_id: orgId,
        document_id: documentId,
        vendor_id: doc.vendor_id,
        lines: checks.lines,
        overall_verdict: checks.overall,
      });
      if (checkErr) throw checkErr;

      // Until M3 gate: every verdict → internal review (Appendix B).
      const { error: statusErr } = await supabase
        .from("documents")
        .update({
          status: "in_internal_review",
          fraud_signals: fraudSignals,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);
      if (statusErr) throw statusErr;

      await supabase
        .from("vendors")
        .update({
          status: "in_review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", doc.vendor_id);

      await supabase.from("audit_events").insert({
        org_id: orgId,
        actor_type: "system",
        actor_id: "inngest:extract-document",
        entity_type: "document",
        entity_id: documentId,
        action: "checked_queued_internal_review",
        after_state: {
          overall: checks.overall,
          model_version: MODEL_VERSION,
          prompt_version: PROMPT_VERSION,
          fraud_signal_count: fraudSignals.length,
        },
      });
    });

    return { documentId, overall: checks.overall };
  },
);

async function collectFraudSignals(input: {
  orgId: string;
  documentId: string;
  pdfBase64: string;
  extraction: Extraction;
}): Promise<FraudSignal[]> {
  const supabase = createAdminClient();
  const bytes = Buffer.from(input.pdfBase64, "base64");
  const signals = await analyzePdfMetadata(bytes);

  const { data: doc } = await supabase
    .from("documents")
    .select("vendor_id")
    .eq("id", input.documentId)
    .maybeSingle();

  if (doc?.vendor_id) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("name")
      .eq("id", doc.vendor_id)
      .maybeSingle();

    if (vendor?.name && input.extraction.insured?.name) {
      const sim = nameSimilarity(input.extraction.insured.name, vendor.name);
      const mismatch = insuredNameMismatchSignal({
        insuredName: input.extraction.insured.name,
        vendorName: vendor.name,
        similarity: sim,
      });
      if (mismatch) signals.push(mismatch);
    }

    const policyNumbers = input.extraction.policies
      .map((p) => p.policy_number?.trim())
      .filter((p): p is string => Boolean(p));

    if (policyNumbers.length) {
      const { data: otherDocs } = await supabase
        .from("documents")
        .select("id, vendor_id")
        .eq("org_id", input.orgId)
        .neq("vendor_id", doc.vendor_id)
        .limit(200);

      const otherIds = (otherDocs ?? []).map((d) => d.id);
      if (otherIds.length) {
        const { data: exts } = await supabase
          .from("extractions")
          .select("document_id, payload")
          .in("document_id", otherIds)
          .limit(400);

        const vendorIds = new Set(
          (otherDocs ?? []).map((d) => d.vendor_id as string),
        );
        const { data: otherVendors } = await supabase
          .from("vendors")
          .select("id, name")
          .in("id", Array.from(vendorIds));

        const nameById = new Map(
          (otherVendors ?? []).map((v) => [v.id as string, v.name as string]),
        );
        const vendorByDoc = new Map(
          (otherDocs ?? []).map((d) => [
            d.id as string,
            d.vendor_id as string,
          ]),
        );

        const hits: { vendorName: string; policyNumber: string }[] = [];
        for (const ext of exts ?? []) {
          const payload = ext.payload as Extraction;
          for (const p of payload.policies ?? []) {
            const pn = p.policy_number?.trim();
            if (!pn || !policyNumbers.includes(pn)) continue;
            const vid = vendorByDoc.get(ext.document_id as string);
            const vname = vid ? nameById.get(vid) : undefined;
            if (vname) hits.push({ vendorName: vname, policyNumber: pn });
          }
        }
        signals.push(
          ...policyReuseSignals({
            policyNumbers,
            otherVendorPolicyHits: hits,
          }),
        );
      }
    }
  }

  return signals;
}
