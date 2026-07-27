import { getSessionOrg } from "@/lib/auth/session";
import { canWriteOrgData } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/config";
import {
  demoOwnerReportEmail,
  loadOwnerReport,
} from "@/lib/reports/owner-load";
import { sendOwnerReportEmail } from "@/lib/reports/owner-send";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  propertyId: z.string().min(1),
  to: z.string().email().optional(),
});

/**
 * POST /api/reports/owner/send
 * Manual send of D3 owner report email (PDF summary in body).
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { propertyId } = parsed.data;

  if (!isSupabaseConfigured()) {
    const report = await loadOwnerReport(propertyId);
    if (!report) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    const to = parsed.data.to?.trim() || demoOwnerReportEmail();
    const result = await sendOwnerReportEmail({
      propertyId,
      to,
      report,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          demo: true,
          error: result.reason ?? "Owner report not sent",
          to,
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      demo: result.demo ?? false,
      to,
      compliance_percent: report.compliance_percent,
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWriteOrgData(session.role)) {
    return NextResponse.json(
      { error: "Read-only role cannot send owner reports" },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id, owner_report_email")
    .eq("id", propertyId)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const to =
    parsed.data.to?.trim() ||
    (property.owner_report_email as string | null)?.trim() ||
    "";

  if (!to) {
    return NextResponse.json(
      { error: "Set owner report email on the property first" },
      { status: 400 },
    );
  }

  const report = await loadOwnerReport(propertyId);
  if (!report) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const result = await sendOwnerReportEmail({ propertyId, to, report });
  if (!result.ok) {
    const reason = result.reason ?? "Send failed";
    // Client/config issues (Resend sandbox, blocked fixture domains) → 400
    const clientError =
      /test mode|cannot send to|owner report email|missing or invalid|resend/i.test(
        reason,
      );
    return NextResponse.json(
      { error: reason },
      { status: clientError ? 400 : 500 },
    );
  }

  await insertAuditEvent(supabase, {
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    actor_email: session.email,
    entity_type: "property",
    entity_id: propertyId,
    action: "owner_report_sent",
    after_state: {
      to,
      compliance_percent: report.compliance_percent,
      risks_flagged: report.risks_flagged,
      documents_on_file: report.documents_on_file,
      demo: result.demo,
      manual: true,
    },
  });

  return NextResponse.json({
    ok: true,
    demo: result.demo,
    to,
    compliance_percent: report.compliance_percent,
  });
}
