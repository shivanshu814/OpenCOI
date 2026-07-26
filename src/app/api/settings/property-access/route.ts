import { insertAuditEvent } from "@/lib/audit/write";
import { canAdminSensitive } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * G1 — manage which properties a teammate can see.
 *
 * Enforcement lives in RLS (migration 021), not here: this route only edits the
 * grant rows. That ordering matters — if the check lived in application code,
 * any query path that forgot to call it would leak, whereas a Postgres policy
 * cannot be bypassed by a missed call site.
 *
 * Semantics are opt-in *restriction*: no rows means org-wide access, so
 * clearing a member's list restores their full view rather than locking them
 * out. Owners and admins are never restricted, since someone must always be
 * able to repair a misconfigured scope.
 */

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ demo: true, grants: [], properties: [] });
  }
  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAdminSensitive(session.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const supabase = await createClient();
  const [{ data: grants }, { data: properties }] = await Promise.all([
    supabase
      .from("property_access")
      .select("id, user_id, property_id")
      .eq("org_id", session.orgId),
    supabase
      .from("properties")
      .select("id, name")
      .eq("org_id", session.orgId)
      .order("name"),
  ]);

  return NextResponse.json({
    grants: grants ?? [],
    properties: properties ?? [],
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }
  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAdminSensitive(session.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = (await request.json()) as {
    user_id?: string;
    /** Full replacement set. Empty array = restore org-wide access. */
    property_ids?: string[];
  };

  const userId = body.user_id?.trim();
  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }
  const propertyIds = Array.isArray(body.property_ids)
    ? [...new Set(body.property_ids.filter((id) => typeof id === "string"))]
    : [];

  const supabase = await createClient();

  // Never trust ids from the client to belong to this org — a scope built from
  // another tenant's property id would be a cross-org reference.
  if (propertyIds.length > 0) {
    const { data: owned } = await supabase
      .from("properties")
      .select("id")
      .eq("org_id", session.orgId)
      .in("id", propertyIds);
    const ownedIds = new Set((owned ?? []).map((p) => p.id as string));
    if (ownedIds.size !== propertyIds.length) {
      return NextResponse.json(
        { error: "One or more properties do not belong to this organization." },
        { status: 400 },
      );
    }
  }

  // The member must actually be in this org.
  const { data: member } = await supabase
    .from("org_members")
    .select("user_id, role")
    .eq("org_id", session.orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) {
    return NextResponse.json(
      { error: "That user is not a member of this organization." },
      { status: 404 },
    );
  }
  if (member.role === "owner" || member.role === "admin") {
    return NextResponse.json(
      {
        error:
          "Owners and admins always see every property — scope a Manager or Read-only member instead.",
      },
      { status: 400 },
    );
  }

  // Replace the set: delete then insert, so removing a property actually
  // removes access rather than leaving a stale grant behind.
  const { error: delErr } = await supabase
    .from("property_access")
    .delete()
    .eq("org_id", session.orgId)
    .eq("user_id", userId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  if (propertyIds.length > 0) {
    const { error: insErr } = await supabase.from("property_access").insert(
      propertyIds.map((property_id) => ({
        org_id: session.orgId,
        property_id,
        user_id: userId,
      })),
    );
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  await insertAuditEvent(supabase, {
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    actor_email: session.email,
    entity_type: "org",
    entity_id: session.orgId,
    action: "property_access_updated",
    after_state: {
      target_user_id: userId,
      property_count: propertyIds.length,
      scoped: propertyIds.length > 0,
    },
  });

  return NextResponse.json({
    ok: true,
    scoped: propertyIds.length > 0,
    property_count: propertyIds.length,
  });
}
