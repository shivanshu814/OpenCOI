import { inngest } from "@/inngest/client";
import { extractCoiFromPdfBase64, MODEL_VERSION } from "@/lib/ai/extract";
import { PROMPT_VERSION } from "@/lib/extraction/schema";
import { runRequirementsEngine } from "@/lib/requirements/engine";
import { createAdminClient } from "@/lib/supabase/admin";

export const extractDocument = inngest.createFunction(
  {
    id: "extract-document",
    triggers: [{ event: "document/uploaded" }],
  },
  async ({ event, step }) => {
    const { documentId, orgId, pdfBase64 } = event.data as {
      documentId: string;
      orgId: string;
      pdfBase64: string;
    };

    const extraction = await step.run("claude-extract", async () => {
      return extractCoiFromPdfBase64({ pdfBase64 });
    });

    const checks = await step.run("requirements-engine", async () => {
      return runRequirementsEngine(extraction);
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
        },
      });
    });

    return { documentId, overall: checks.overall };
  },
);
