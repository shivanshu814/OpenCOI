import { canWriteOrgData } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        demo: true,
        message:
          "Demo mode: vendor not persisted. Connect Supabase (.env.local) to create vendors.",
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

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    trade?: string;
  };

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      org_id: session.orgId,
      name,
      email: body.email?.trim() || null,
      trade: body.trade?.trim() || null,
      status: "missing_docs",
    })
    .select("id, name, email, trade, status")
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
    entity_id: data.id,
    action: "created",
    after_state: data,
  });

  return NextResponse.json({ ok: true, vendor: data });
}
