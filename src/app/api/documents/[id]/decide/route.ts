import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { demoCustomerDecide, getDemoDocument } from "@/lib/demo/store";
import type { Verdict } from "@/lib/requirements/engine";
import {
  isOverrideReasonCode,
  resolveCustomerDecision,
  type OverrideReasonCode,
} from "@/lib/verdicts/customer-decision";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

type Body =
  | { action: "accept" }
  | {
      action: "override";
      reason_code: OverrideReasonCode;
      reason_text?: string;
    };

/**
 * Customer disposition after publish (Appendix B).
 * POST body: { action: "accept" } | { action: "override", reason_code, reason_text? }
 */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "accept" && body.action !== "override") {
    return NextResponse.json(
      { error: "action must be accept or override" },
      { status: 400 },
    );
  }

  if (body.action === "override") {
    if (!isOverrideReasonCode(body.reason_code)) {
      return NextResponse.json(
        { error: "Invalid reason_code" },
        { status: 400 },
      );
    }
  }

  if (!isSupabaseConfigured()) {
    const demo = getDemoDocument(id);
    if (!demo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    try {
      const result = demoCustomerDecide(id, body);
      return NextResponse.json({
        ok: true,
        demo: true,
        ...result,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Decide failed" },
        { status: 400 },
      );
    }
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Customer disposition: any active org member (not viewer-only).
  if (
    session.role !== "owner" &&
    session.role !== "admin" &&
    session.role !== "member"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, vendor_id, status, version")
    .eq("id", id)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (doc.status !== "published") {
    return NextResponse.json(
      { error: `Cannot decide from status ${doc.status}` },
      { status: 400 },
    );
  }

  const { data: check } = await supabase
    .from("compliance_checks")
    .select("id, overall_verdict, customer_decision")
    .eq("document_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!check) {
    return NextResponse.json(
      { error: "No compliance check to decide on" },
      { status: 400 },
    );
  }

  if (check.customer_decision) {
    return NextResponse.json(
      { error: "Customer decision already recorded" },
      { status: 400 },
    );
  }

  let resolved;
  try {
    resolved = resolveCustomerDecision(
      body.action === "accept"
        ? { action: "accept" }
        : {
            action: "override",
            reason_code: body.reason_code,
            reason_text: body.reason_text,
          },
      check.overall_verdict as Verdict,
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid decision" },
      { status: 400 },
    );
  }

  const before = {
    status: doc.status,
    version: doc.version,
    customer_decision: null as string | null,
  };

  // Atomic claim: only one decision wins when customer_decision is still null.
  const { data: decidedRows, error: decideClaimErr } = await supabase
    .from("compliance_checks")
    .update({
      customer_decision: resolved.customer_decision,
      customer_decision_reason: resolved.reason,
    })
    .eq("id", check.id)
    .is("customer_decision", null)
    .select("id");

  if (decideClaimErr) {
    return NextResponse.json({ error: decideClaimErr.message }, { status: 500 });
  }
  if (!decidedRows?.length) {
    return NextResponse.json(
      { error: "Customer decision already recorded" },
      { status: 409 },
    );
  }

  // Dispute: audit published → disputed, then land on in_internal_review.
  if (resolved.intermediate_status === "disputed") {
    const { data: disputedRows, error: disputeErr } = await supabase
      .from("documents")
      .update({
        status: "disputed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("org_id", session.orgId)
      .eq("status", "published")
      .select("id");

    if (disputeErr) {
      return NextResponse.json({ error: disputeErr.message }, { status: 500 });
    }
    if (!disputedRows?.length) {
      return NextResponse.json(
        { error: "Document left published state concurrently" },
        { status: 409 },
      );
    }

    await insertAuditEvent(supabase, {
      org_id: session.orgId,
      actor_type: "customer",
      actor_id: session.userId,
    actor_email: session.email,
      entity_type: "document",
      entity_id: id,
      action: "disputed",
      before_state: before,
      after_state: {
        status: "disputed",
        version: doc.version,
        customer_decision: "disputed",
      },
      reason: resolved.reason,
    });
  }

  const { data: statusRows, error: statusErr } = await supabase
    .from("documents")
    .update({
      status: resolved.document_status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", session.orgId)
    .in(
      "status",
      resolved.intermediate_status === "disputed"
        ? ["disputed"]
        : ["published"],
    )
    .select("id");

  if (statusErr) {
    return NextResponse.json({ error: statusErr.message }, { status: 500 });
  }
  if (!statusRows?.length) {
    return NextResponse.json(
      { error: "Document status changed concurrently" },
      { status: 409 },
    );
  }

  await supabase
    .from("vendors")
    .update({
      status: resolved.vendor_status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", doc.vendor_id);

  const auditAction =
    resolved.customer_decision === "accepted"
      ? "accepted"
      : resolved.customer_decision === "disputed"
        ? "routed_to_internal_review"
        : "overridden";

  await insertAuditEvent(supabase, {
    org_id: session.orgId,
    actor_type: "customer",
    actor_id: session.userId,
    actor_email: session.email,
    entity_type: "document",
    entity_id: id,
    action: auditAction,
    before_state: resolved.intermediate_status
      ? { status: "disputed", version: doc.version }
      : before,
    after_state: {
      status: resolved.document_status,
      version: doc.version,
      customer_decision: resolved.customer_decision,
      vendor_status: resolved.vendor_status,
    },
    reason: resolved.reason,
  });

  return NextResponse.json({
    ok: true,
    status: resolved.document_status,
    customer_decision: resolved.customer_decision,
    reason: resolved.reason,
    vendor_status: resolved.vendor_status,
    routes_to_internal_review: resolved.routes_to_internal_review,
    note: resolved.routes_to_internal_review
      ? "Dispute routed to internal review."
      : undefined,
  });
}
