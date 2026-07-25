import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { vendorStatusFromVerdict } from "@/lib/data/types";
import { demoAcceptPublish, getDemoDocument } from "@/lib/demo/store";
import type { Verdict } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  if (!isSupabaseConfigured()) {
    try {
      const demo = getDemoDocument(id);
      if (!demo) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const result = demoAcceptPublish(id);
      return NextResponse.json({
        ok: true,
        demo: true,
        status: result.status,
        message:
          "Demo: published after founder review. Customer accept/override next (Appendix B).",
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Publish failed" },
        { status: 400 },
      );
    }
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Until M3: only founder/admin roles publish (owner|admin).
  if (session.role !== "owner" && session.role !== "admin") {
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

  if (doc.status !== "in_internal_review") {
    return NextResponse.json(
      { error: `Cannot publish from status ${doc.status}` },
      { status: 400 },
    );
  }

  const { data: check } = await supabase
    .from("compliance_checks")
    .select("id, overall_verdict")
    .eq("document_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const before = { status: doc.status, version: doc.version };

  const { data: publishedRows, error: statusErr } = await supabase
    .from("documents")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", session.orgId)
    .eq("status", "in_internal_review")
    .select("id");

  if (statusErr) {
    return NextResponse.json({ error: statusErr.message }, { status: 500 });
  }
  if (!publishedRows?.length) {
    return NextResponse.json(
      { error: "Document was already published or left review" },
      { status: 409 },
    );
  }

  if (check) {
    await supabase
      .from("compliance_checks")
      .update({ published_at: new Date().toISOString() })
      .eq("id", check.id);

    const vendorStatus = vendorStatusFromVerdict(
      check.overall_verdict as Verdict,
    );
    await supabase
      .from("vendors")
      .update({
        status: vendorStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.vendor_id);
  }

  await supabase.from("audit_events").insert({
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    entity_type: "document",
    entity_id: id,
    action: "published",
    before_state: before,
    after_state: { status: "published", version: doc.version },
    reason: "Internal review approved",
  });

  try {
    const { dispatchOrgWebhooks } = await import("@/lib/api/keys");
    await dispatchOrgWebhooks({
      orgId: session.orgId,
      event: "document.published",
      payload: {
        document_id: id,
        vendor_id: doc.vendor_id,
        overall_verdict: check?.overall_verdict ?? null,
      },
    });
    if (check) {
      await dispatchOrgWebhooks({
        orgId: session.orgId,
        event: "vendor.status_changed",
        payload: {
          vendor_id: doc.vendor_id,
          status: vendorStatusFromVerdict(check.overall_verdict as Verdict),
        },
      });
    }
  } catch (e) {
    console.error("webhook dispatch", e);
  }

  return NextResponse.json({
    ok: true,
    status: "published",
  });
}
