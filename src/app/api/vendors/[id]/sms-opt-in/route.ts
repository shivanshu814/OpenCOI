import { getSessionOrg } from "@/lib/auth/session";
import { canWriteOrgData } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: vendorId } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, demo: true, message: "Demo mode" },
      { status: 200 },
    );
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWriteOrgData(session.role)) {
    return NextResponse.json(
      { error: "Read-only role cannot change SMS opt-in" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    phone?: string;
    opt_in?: boolean;
  };

  const phone = body.phone?.trim() || null;
  const optIn = Boolean(body.opt_in);

  if (optIn && !phone) {
    return NextResponse.json(
      { error: "Phone required for SMS opt-in" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const patch: Record<string, unknown> = {
    phone,
    updated_at: now,
  };

  if (optIn) {
    patch.sms_opt_in_at = now;
    patch.sms_opt_in_source = "customer_intake_checkbox";
    patch.sms_opt_out_at = null;
  } else {
    patch.sms_opt_in_at = null;
    patch.sms_opt_in_source = null;
  }

  const { data, error } = await supabase
    .from("vendors")
    .update(patch)
    .eq("id", vendorId)
    .eq("org_id", session.orgId)
    .select("id, phone, sms_opt_in_at, sms_opt_out_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await insertAuditEvent(supabase, {
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    actor_email: session.email,
    entity_type: "vendor",
    entity_id: vendorId,
    action: optIn ? "sms_opt_in" : "sms_opt_in_cleared",
    after_state: {
      phone,
      sms_opt_in_at: data.sms_opt_in_at,
      source: optIn ? "customer_intake_checkbox" : null,
    },
  });

  return NextResponse.json({ ok: true, vendor: data });
}
