import { canWriteOrgData } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { normalizeStateCode } from "@/lib/geo/us-states";
import { DEFAULT_GLOBAL_RULES } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import {
  propertyCreateSchema,
  validationErrorBody,
} from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      properties: [
        {
          id: "prop_demo_1",
          name: "Oak Street Apartments",
          certificate_holder_name: "Oak Street LLC",
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
    .from("properties")
    .select(
      "id, name, address_line, city, state, postal_code, certificate_holder_name, additional_insured_wording, owner_llc_names, lender_names, created_at",
    )
    .eq("org_id", session.orgId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, properties: data ?? [] });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      property: { id: "prop_demo_new", name: "Demo property" },
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWriteOrgData(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = propertyCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      validationErrorBody(parsed.error, "Invalid property"),
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const row = parsed.data;

  // Empty state stays optional; a non-empty one must normalize to a real code,
  // or it later fails the D1 cert-holder state match silently.
  const state = normalizeStateCode(row.state);
  if (row.state?.trim() && !state) {
    return NextResponse.json(
      { error: "Invalid state — use a two-letter code like PA." },
      { status: 400 },
    );
  }

  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      org_id: session.orgId,
      name: row.name.trim(),
      address_line: row.address_line?.trim() || null,
      city: row.city?.trim() || null,
      state,
      postal_code: row.postal_code?.trim() || null,
      certificate_holder_name: row.certificate_holder_name?.trim() || null,
      additional_insured_wording:
        row.additional_insured_wording?.trim() || null,
      owner_llc_names: row.owner_llc_names ?? [],
      lender_names: row.lender_names ?? [],
    })
    .select("id, name")
    .single();

  if (error || !property) {
    return NextResponse.json(
      { error: error?.message ?? "Create failed" },
      { status: 500 },
    );
  }

  // Seed property-scoped requirement set (starts as copy of global defaults).
  await supabase.from("requirement_sets").insert({
    org_id: session.orgId,
    name: `${property.name} overrides`,
    scope: "property",
    property_id: property.id,
    rules: DEFAULT_GLOBAL_RULES,
  });

  await insertAuditEvent(supabase, {
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    actor_email: session.email,
    entity_type: "property",
    entity_id: property.id,
    action: "created",
    after_state: { name: property.name },
  });

  return NextResponse.json({ ok: true, property });
}
