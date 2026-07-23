import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import {
  demoOwnerReportEmail,
  loadOwnerReport,
} from "@/lib/reports/owner-load";
import { sendOwnerReportEmail } from "@/lib/reports/owner-send";
import { createClient } from "@/lib/supabase/server";
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
    return NextResponse.json({
      ok: result.ok,
      demo: true,
      to,
      compliance_percent: report.compliance_percent,
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json(
      { error: result.reason ?? "Send failed" },
      { status: 500 },
    );
  }

  await supabase.from("audit_events").insert({
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
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
