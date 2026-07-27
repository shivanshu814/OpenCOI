import { canWriteOrgData } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { DEFAULT_GLOBAL_RULES } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import {
  projectCreateSchema,
  validationErrorBody,
} from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      projects: [
        {
          id: "proj_demo_1",
          name: "Roof Replace — Building A",
          start_date: "2026-07-01",
          end_date: "2026-09-30",
          status: "active",
          property_id: "prop_demo_1",
        },
      ],
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, property_id, start_date, end_date, status, certificate_holder_name, created_at",
    )
    .eq("org_id", session.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, projects: data ?? [] });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      project: { id: "proj_demo_new", name: "Demo project" },
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWriteOrgData(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = projectCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      validationErrorBody(parsed.error, "Invalid project"),
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const row = parsed.data;

  if (row.property_id) {
    const { data: prop } = await supabase
      .from("properties")
      .select("id")
      .eq("id", row.property_id)
      .eq("org_id", session.orgId)
      .maybeSingle();
    if (!prop) {
      return NextResponse.json({ error: "Property not found" }, { status: 400 });
    }
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      org_id: session.orgId,
      name: row.name.trim(),
      property_id: row.property_id || null,
      start_date: row.start_date?.trim() || null,
      end_date: row.end_date?.trim() || null,
      certificate_holder_name: row.certificate_holder_name?.trim() || null,
      additional_insured_wording:
        row.additional_insured_wording?.trim() || null,
      notes: row.notes?.trim() || null,
      status: "active",
    })
    .select("id, name")
    .single();

  if (error || !project) {
    return NextResponse.json(
      { error: error?.message ?? "Create failed" },
      { status: 500 },
    );
  }

  await supabase.from("requirement_sets").insert({
    org_id: session.orgId,
    name: `${project.name} project requirements`,
    scope: "project",
    project_id: project.id,
    rules: DEFAULT_GLOBAL_RULES,
  });

  await insertAuditEvent(supabase, {
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    actor_email: session.email,
    entity_type: "project",
    entity_id: project.id,
    action: "created",
    after_state: { name: project.name },
  });

  return NextResponse.json({ ok: true, project });
}
