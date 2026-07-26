import { canWriteOrgData } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import type { RequirementRule } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address_line: z.string().max(300).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  certificate_holder_name: z.string().max(300).optional().nullable(),
  additional_insured_wording: z.string().max(1000).optional().nullable(),
  owner_llc_names: z.array(z.string()).optional(),
  lender_names: z.array(z.string()).optional(),
  owner_report_email: z
    .union([z.string().email(), z.literal(""), z.null()])
    .optional(),
  owner_report_enabled: z.boolean().optional(),
  rules: z.array(z.record(z.string(), z.unknown())).optional(),
  vendorIds: z.array(z.string().uuid()).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      property: { id, name: "Oak Street Apartments" },
      rules: [],
      vendorIds: [],
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (error || !property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: reqSet }, { data: links }] = await Promise.all([
    supabase
      .from("requirement_sets")
      .select("id, rules")
      .eq("org_id", session.orgId)
      .eq("scope", "property")
      .eq("property_id", id)
      .maybeSingle(),
    supabase
      .from("property_vendors")
      .select("vendor_id")
      .eq("property_id", id)
      .eq("org_id", session.orgId),
  ]);

  return NextResponse.json({
    ok: true,
    property,
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

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid patch" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("properties")
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
  if (p.address_line !== undefined)
    updates.address_line = p.address_line?.trim() || null;
  if (p.city !== undefined) updates.city = p.city?.trim() || null;
  if (p.state !== undefined)
    updates.state = p.state?.trim()?.toUpperCase() || null;
  if (p.postal_code !== undefined)
    updates.postal_code = p.postal_code?.trim() || null;
  if (p.certificate_holder_name !== undefined)
    updates.certificate_holder_name =
      p.certificate_holder_name?.trim() || null;
  if (p.additional_insured_wording !== undefined)
    updates.additional_insured_wording =
      p.additional_insured_wording?.trim() || null;
  if (p.owner_llc_names !== undefined)
    updates.owner_llc_names = p.owner_llc_names;
  if (p.lender_names !== undefined) updates.lender_names = p.lender_names;
  if (p.owner_report_email !== undefined)
    updates.owner_report_email = p.owner_report_email?.trim() || null;
  if (p.owner_report_enabled !== undefined)
    updates.owner_report_enabled = p.owner_report_enabled;

  const { error } = await supabase
    .from("properties")
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
      .eq("scope", "property")
      .eq("property_id", id)
      .maybeSingle();

    if (reqSet) {
      await supabase
        .from("requirement_sets")
        .update({ rules: p.rules })
        .eq("id", reqSet.id);
    } else {
      await supabase.from("requirement_sets").insert({
        org_id: session.orgId,
        name: "Property overrides",
        scope: "property",
        property_id: id,
        rules: p.rules,
      });
    }
  }

  if (p.vendorIds) {
    await supabase
      .from("property_vendors")
      .delete()
      .eq("property_id", id)
      .eq("org_id", session.orgId);

    if (p.vendorIds.length) {
      await supabase.from("property_vendors").insert(
        p.vendorIds.map((vendorId) => ({
          property_id: id,
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
    entity_type: "property",
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
