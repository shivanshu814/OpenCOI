import { canWriteOrgData } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import {
  FREE_AUDIT_SLA_NOTE,
  FREE_DAILY_AUDIT_CAP,
  checkDailyCap,
  isPaidPlan,
  startOfUtcDay,
} from "@/lib/billing/limits";
import {
  isSupabaseConfigured,
} from "@/lib/config";
import { ingestPdfDocument } from "@/lib/documents/ingest";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        demo: true,
        message:
          "Demo mode: upload not persisted. Open /app/review/doc_demo_1 for the review UX. Connect Supabase to queue live extraction.",
        reviewPath: "/app/review/doc_demo_1",
      },
      { status: 200 },
    );
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWriteOrgData(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const vendorId = String(form.get("vendorId") ?? "");
  const file = form.get("file");

  if (!vendorId || !(file instanceof File)) {
    return NextResponse.json(
      { error: "vendorId and file required" },
      { status: 400 },
    );
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("id", vendorId)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // Free-tier daily intake cap. Paid orgs are uncapped and reviewed first.
  if (!isPaidPlan(session.plan, session.subscriptionStatus)) {
    const { count: usedToday } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("org_id", session.orgId)
      .gte("created_at", startOfUtcDay(new Date()));
    const cap = checkDailyCap(usedToday ?? 0);
    if (!cap.allowed) {
      return NextResponse.json(
        {
          error: `Free daily audit limit reached (${FREE_DAILY_AUDIT_CAP}/day). Upgrade for uncapped, priority review.`,
          code: "daily_cap_reached",
          used: cap.used,
          cap: cap.cap,
          sla: FREE_AUDIT_SLA_NOTE,
          upgradePath: "/app/settings/billing",
        },
        { status: 429 },
      );
    }
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await ingestPdfDocument({
      orgId: session.orgId,
      vendorId,
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      pdfBytes: bytes,
      supabase,
      actor: { type: "admin", id: session.userId },
      auditExtra: { source: "web_upload" },
    });

    return NextResponse.json({
      ok: true,
      documentId: result.documentId,
      reviewPath: `/app/review/${result.documentId}`,
      queued: result.queued,
      // Upload stored; inline AI extraction failed — honest signal for the UI
      // (doc is extraction_failed with a Run-extraction-now retry).
      extractionError: result.extractionError,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
