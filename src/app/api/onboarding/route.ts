import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { templateById } from "@/lib/requirements/templates";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import { NextResponse } from "next/server";

function parseVendorCsv(raw: string): Array<{
  name: string;
  email?: string;
  trade?: string;
}> {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: Array<{ name: string; email?: string; trade?: string }> = [];
  for (const line of lines) {
    if (/^name\s*,/i.test(line)) continue;
    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    const name = parts[0];
    if (!name) continue;
    out.push({
      name,
      email: parts[1] || undefined,
      trade: parts[2] || undefined,
    });
  }
  return out;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    step?: string;
    companyName?: string;
    templateIds?: string[];
    vendorsCsv?: string;
    vendors?: Array<{ name: string; email?: string; trade?: string }>;
    complete?: boolean;
  };

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "Demo mode: onboarding steps are not persisted.",
      next: body.complete ? "/app" : undefined,
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const step = body.step ?? "unknown";

  if (step === "company" && body.companyName?.trim()) {
    const name = body.companyName.trim();
    const { error } = await supabase
      .from("orgs")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", session.orgId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await insertAuditEvent(supabase, {
      org_id: session.orgId,
      actor_type: "admin",
      actor_id: session.userId,
      actor_email: session.email,
      entity_type: "org",
      entity_id: session.orgId,
      action: "onboarding_company",
      after_state: { name },
    });
    return NextResponse.json({ ok: true, orgName: name });
  }

  if (step === "templates" && Array.isArray(body.templateIds)) {
    const ids = body.templateIds.filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Pick at least one requirements template" },
        { status: 400 },
      );
    }

    // Replace org requirement sets with selected templates.
    await supabase
      .from("requirement_sets")
      .delete()
      .eq("org_id", session.orgId);

    const rows = ids
      .map((id) => templateById(id))
      .filter(Boolean)
      .map((t) => ({
        org_id: session.orgId,
        name: t!.name,
        scope: t!.scope,
        trade: t!.trade,
        rules: t!.rules,
      }));

    if (rows.length === 0) {
      return NextResponse.json({ error: "Unknown templates" }, { status: 400 });
    }

    const { error } = await supabase.from("requirement_sets").insert(rows);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await insertAuditEvent(supabase, {
      org_id: session.orgId,
      actor_type: "admin",
      actor_id: session.userId,
      actor_email: session.email,
      entity_type: "org",
      entity_id: session.orgId,
      action: "onboarding_templates",
      after_state: { templateIds: ids },
    });

    return NextResponse.json({ ok: true, count: rows.length });
  }

  if (step === "vendors") {
    const fromCsv = body.vendorsCsv ? parseVendorCsv(body.vendorsCsv) : [];
    const vendors = [...(body.vendors ?? []), ...fromCsv].filter((v) =>
      v.name?.trim(),
    );
    if (vendors.length === 0) {
      return NextResponse.json(
        { error: "Add at least one vendor (or paste CSV)" },
        { status: 400 },
      );
    }

    const rows = vendors.map((v) => ({
      org_id: session.orgId,
      name: v.name.trim(),
      email: v.email?.trim() || null,
      trade: v.trade?.trim() || null,
      status: "missing_docs" as const,
    }));

    const { data, error } = await supabase
      .from("vendors")
      .insert(rows)
      .select("id, name");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await insertAuditEvent(supabase, {
      org_id: session.orgId,
      actor_type: "admin",
      actor_id: session.userId,
      actor_email: session.email,
      entity_type: "org",
      entity_id: session.orgId,
      action: "onboarding_vendors",
      after_state: { count: data?.length ?? rows.length },
    });

    return NextResponse.json({ ok: true, count: data?.length ?? rows.length });
  }

  if (step === "complete" || body.complete) {
    const { error } = await supabase
      .from("orgs")
      .update({
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.orgId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await insertAuditEvent(supabase, {
      org_id: session.orgId,
      actor_type: "admin",
      actor_id: session.userId,
      actor_email: session.email,
      entity_type: "org",
      entity_id: session.orgId,
      action: "onboarding_completed",
    });
    return NextResponse.json({ ok: true, next: "/app" });
  }

  return NextResponse.json({ error: "Unknown step" }, { status: 400 });
}
