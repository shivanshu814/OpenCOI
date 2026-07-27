import { canWriteOrgData } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { normalizeStateCode } from "@/lib/geo/us-states";
import type { RequirementRule } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import {
  propertyUpdateSchema,
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

  const parsed = propertyUpdateSchema.safeParse(
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
  if (p.state !== undefined) {
    // Empty clears the field; a non-empty state must normalize to a real
    // code, or it later fails the D1 cert-holder state match silently.
    const state = normalizeStateCode(p.state);
    if (p.state?.trim() && !state) {
      return NextResponse.json(
        { error: "Invalid state — use a two-letter code like PA." },
        { status: 400 },
      );
    }
    updates.state = state;
  }
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
