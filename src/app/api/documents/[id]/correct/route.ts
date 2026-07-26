import { MODEL_VERSION } from "@/lib/ai/extract";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import {
  extractionSchema,
  PROMPT_VERSION,
  type Extraction,
} from "@/lib/extraction/schema";
import { runRequirementsEngine } from "@/lib/requirements/engine";
import {
  loadMergedRulesForDocument,
  loadPropertyValidation,
} from "@/lib/requirements/merge";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

/** Save a field correction → re-check → golden_set_cases + audit_events. */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const body = (await request.json()) as {
    field_path?: string;
    after_value?: unknown;
    corrected_extraction?: Extraction;
  };

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      message: `Demo: correction on ${id} (${body.field_path ?? "fields"}) would append to golden set + audit_events.`,
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, vendor_id, property_id, project_id, status")
    .eq("id", id)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Corrections only during internal review (or after dispute re-entry).
  // Published/accepted docs must not silently rewrite the published verdict.
  if (
    doc.status !== "in_internal_review" &&
    doc.status !== "disputed"
  ) {
    return NextResponse.json(
      {
        error: `Cannot correct from status ${doc.status}. Re-open via dispute or keep corrections in internal review.`,
      },
      { status: 400 },
    );
  }

  const { data: extRow } = await supabase
    .from("extractions")
    .select("id, payload")
    .eq("document_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!extRow) {
    return NextResponse.json({ error: "No extraction yet" }, { status: 400 });
  }

  const before = extRow.payload as Extraction;
  let after: Extraction;

  if (body.corrected_extraction) {
    const parsed = extractionSchema.safeParse(body.corrected_extraction);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid extraction payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    after = parsed.data;
  } else if (body.field_path) {
    after = structuredClone(before);
    setByPath(after as unknown as Record<string, unknown>, body.field_path, body.after_value);
    const parsed = extractionSchema.safeParse(after);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Correction failed schema validation", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    after = parsed.data;
  } else {
    return NextResponse.json(
      { error: "Provide field_path or corrected_extraction" },
      { status: 400 },
    );
  }

  // Re-check with the SAME merged rules + per-property (D1) validation the
  // primary verdict path uses — a correction must not silently fall back to
  // default global rules only.
  const rules = await loadMergedRulesForDocument({
    orgId: session.orgId,
    vendorId: doc.vendor_id,
    propertyId: doc.property_id,
    projectId: doc.project_id,
    supabase,
  });
  const propertyValidation = await loadPropertyValidation({
    orgId: session.orgId,
    propertyId: doc.property_id,
    supabase,
  });
  const checks = runRequirementsEngine(after, rules, propertyValidation);

  // New extraction row (preserve original for audit/golden-set history).
  const { error: insertExtErr } = await supabase.from("extractions").insert({
    org_id: session.orgId,
    document_id: id,
    payload: after,
    model_version: MODEL_VERSION,
    prompt_version: `${PROMPT_VERSION}+human`,
    overall_confidence: after.extraction_meta.overall_confidence,
    cost_usd: 0,
    latency_ms: 0,
  });
  if (insertExtErr) {
    return NextResponse.json({ error: insertExtErr.message }, { status: 500 });
  }

  await supabase.from("compliance_checks").insert({
    org_id: session.orgId,
    document_id: id,
    vendor_id: doc.vendor_id,
    lines: checks.lines,
    overall_verdict: checks.overall,
  });

  const fieldPath = body.field_path ?? "extraction";
  const beforeVal = body.field_path
    ? getByPath(before as unknown as Record<string, unknown>, body.field_path)
    : before;
  const afterVal = body.field_path
    ? getByPath(after as unknown as Record<string, unknown>, body.field_path)
    : after;

  await supabase.from("golden_set_cases").insert({
    org_id: session.orgId,
    document_id: id,
    field_path: fieldPath,
    before_value: beforeVal as object,
    after_value: afterVal as object,
    created_by: session.userId,
  });

  await insertAuditEvent(supabase, {
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
      actor_email: session.email,
    entity_type: "document",
    entity_id: id,
    action: "correction_saved",
    before_state: { field_path: fieldPath, value: beforeVal },
    after_state: {
      field_path: fieldPath,
      value: afterVal,
      overall: checks.overall,
    },
    reason: "Human correction in internal review",
  });

  // Ensure disputed corrections land back in internal review.
  if (doc.status === "disputed") {
    await supabase
      .from("documents")
      .update({
        status: "in_internal_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("org_id", session.orgId)
      .eq("status", "disputed");
  }

  return NextResponse.json({
    ok: true,
    overall: checks.overall,
    lines: checks.lines,
  });
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (isDangerousPathSegment(p)) return undefined;
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function isDangerousPathSegment(p: string): boolean {
  return p === "__proto__" || p === "constructor" || p === "prototype";
}

function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  if (parts.some(isDangerousPathSegment)) {
    throw new Error("Invalid field_path");
  }
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    const next = cur[p];
    if (next == null || typeof next !== "object") {
      cur[p] = /^\d+$/.test(parts[i + 1]!) ? [] : {};
    }
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}
