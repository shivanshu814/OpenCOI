import { mintApiKey } from "@/lib/api/keys";
import { canAdminSensitive } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import {
  integrationsSchema,
  validationErrorBody,
} from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ demo: true, keys: [], webhooks: [] });
  }
  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAdminSensitive(session.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const supabase = await createClient();
  const [{ data: keys }, { data: webhooks }] = await Promise.all([
    supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
      .eq("org_id", session.orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("outbound_webhooks")
      .select("id, url, events, active, created_at")
      .eq("org_id", session.orgId)
      .order("created_at", { ascending: false }),
  ]);
  return NextResponse.json({ keys: keys ?? [], webhooks: webhooks ?? [] });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      raw_key: "cs_live_demo_key_not_persisted",
    });
  }
  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAdminSensitive(session.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const parsed = integrationsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      validationErrorBody(parsed.error, "Unknown action"),
      { status: 400 },
    );
  }
  const body = parsed.data;

  const supabase = await createClient();

  if (body.action === "create_key") {
    const minted = mintApiKey();
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        org_id: session.orgId,
        name: body.name?.trim() || "API key",
        key_prefix: minted.prefix,
        key_hash: minted.hash,
        created_by: session.userId,
      })
      .select("id, name, key_prefix, created_at")
      .single();
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
      action: "api_key_created",
      after_state: { key_id: data.id, prefix: minted.prefix },
    });
    return NextResponse.json({
      ok: true,
      key: data,
      raw_key: minted.raw,
      warning: "Copy now — plaintext shown once.",
    });
  }

  if (body.action === "revoke_key") {
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", body.key_id)
      .eq("org_id", session.orgId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "create_webhook") {
    const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
    const { data, error } = await supabase
      .from("outbound_webhooks")
      .insert({
        org_id: session.orgId,
        url: body.url.trim(),
        secret,
        events: body.events?.length
          ? body.events
          : ["vendor.status_changed", "document.published"],
        active: true,
      })
      .select("id, url, events, active, created_at")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      webhook: data,
      secret,
      warning: "Store the signing secret — shown once.",
    });
  }

  if (body.action === "toggle_webhook") {
    const { error } = await supabase
      .from("outbound_webhooks")
      .update({
        active: Boolean(body.active),
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.webhook_id)
      .eq("org_id", session.orgId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
