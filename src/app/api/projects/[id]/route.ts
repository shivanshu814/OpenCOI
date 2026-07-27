import { canWriteOrgData } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import type { RequirementRule } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import {
  projectUpdateSchema,
  validationErrorBody,
} from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      project: {
        id,
        name: "Roof Replace — Building A",
        start_date: "2026-07-01",
        end_date: "2026-09-30",
        status: "active",
      },
      rules: [],
      vendorIds: [],
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (error || !project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: reqSet }, { data: links }] = await Promise.all([
    supabase
      .from("requirement_sets")
      .select("id, rules")
      .eq("org_id", session.orgId)
      .eq("scope", "project")
      .eq("project_id", id)
      .maybeSingle(),
    supabase
      .from("project_vendors")
      .select("vendor_id")
      .eq("project_id", id)
      .eq("org_id", session.orgId),
  ]);

  return NextResponse.json({
    ok: true,
    project,
    requirementSetId: reqSet?.id ?? null,
    rules: (reqSet?.rules as RequirementRule[]) ?? [],
    vendorIds: (links ?? []).map((l) => l.vendor_id),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWriteOrgData(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = projectUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      validationErrorBody(parsed.error, "Invalid patch"),
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const p = parsed.data;
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (p.name !== undefined) updates.name = p.name.trim();
  if (p.property_id !== undefined) updates.property_id = p.property_id || null;
  if (p.start_date !== undefined)
    updates.start_date = p.start_date?.trim() || null;
  if (p.end_date !== undefined) updates.end_date = p.end_date?.trim() || null;
  if (p.status !== undefined) updates.status = p.status;
  if (p.certificate_holder_name !== undefined)
    updates.certificate_holder_name =
      p.certificate_holder_name?.trim() || null;
  if (p.additional_insured_wording !== undefined)
    updates.additional_insured_wording =
      p.additional_insured_wording?.trim() || null;
  if (p.notes !== undefined) updates.notes = p.notes?.trim() || null;

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .eq("org_id", session.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (p.rules) {
    const { data: reqSet } = await supabase
      .from("requirement_sets")
      .select("id")
      .eq("org_id", session.orgId)
      .eq("scope", "project")
      .eq("project_id", id)
      .maybeSingle();

    if (reqSet) {
      await supabase
        .from("requirement_sets")
        .update({ rules: p.rules })
        .eq("id", reqSet.id);
    } else {
      await supabase.from("requirement_sets").insert({
        org_id: session.orgId,
        name: "Project requirements",
        scope: "project",
        project_id: id,
        rules: p.rules,
      });
    }
  }

  if (p.vendorIds) {
    await supabase
      .from("project_vendors")
      .delete()
      .eq("project_id", id)
      .eq("org_id", session.orgId);

    if (p.vendorIds.length) {
      await supabase.from("project_vendors").insert(
        p.vendorIds.map((vendorId) => ({
          project_id: id,
          vendor_id: vendorId,
          org_id: session.orgId,
        })),
      );
    }
  }

  await insertAuditEvent(supabase, {
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    actor_email: session.email,
    entity_type: "project",
    entity_id: id,
    action: "updated",
    after_state: {
      fields: Object.keys(updates),
      rules_updated: Boolean(p.rules),
      vendors_updated: Boolean(p.vendorIds),
    },
  });

  return NextResponse.json({ ok: true });
}
