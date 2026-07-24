import { canAdminSensitive } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      demo: true,
      members: [],
      invites: [],
      branding: {},
    });
  }
  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const [{ data: members }, { data: invites }, { data: org }] =
    await Promise.all([
      supabase
        .from("org_members")
        .select("id, user_id, role, created_at")
        .eq("org_id", session.orgId),
      supabase
        .from("org_invites")
        .select("id, email, role, accepted_at, created_at")
        .eq("org_id", session.orgId)
        .order("created_at", { ascending: false }),
      supabase
        .from("orgs")
        .select(
          "name, from_email, reply_to_email, brand_primary_color, logo_url, chase_notify_email, digest_email",
        )
        .eq("id", session.orgId)
        .single(),
    ]);

  return NextResponse.json({
    members: members ?? [],
    invites: invites ?? [],
    branding: org ?? {},
    your_role: session.role,
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
    action?: "invite" | "update_branding" | "update_member_role";
    email?: string;
    role?: "admin" | "member" | "viewer";
    member_id?: string;
    from_email?: string | null;
    reply_to_email?: string | null;
    brand_primary_color?: string | null;
    logo_url?: string | null;
    chase_notify_email?: string | null;
  };

  const supabase = await createClient();

  if (body.action === "invite" && body.email) {
    const role = body.role ?? "member";
    const { data, error } = await supabase
      .from("org_invites")
      .upsert(
        {
          org_id: session.orgId,
          email: body.email.trim().toLowerCase(),
          role,
          invited_by: session.userId,
        },
        { onConflict: "org_id,email" },
      )
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await supabase.from("audit_events").insert({
      org_id: session.orgId,
      actor_type: "admin",
      actor_id: session.userId,
      entity_type: "org",
      entity_id: session.orgId,
      action: "team_invite_created",
      after_state: { email: data.email, role: data.role },
    });
    return NextResponse.json({
      ok: true,
      invite: data,
      note: "Invite sent. When the teammate signs in with this email, they auto-join this org with the assigned role.",
    });
  }

  if (body.action === "update_member_role" && body.member_id && body.role) {
    const { error } = await supabase
      .from("org_members")
      .update({ role: body.role })
      .eq("id", body.member_id)
      .eq("org_id", session.orgId)
      .neq("role", "owner");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update_branding") {
    const { error } = await supabase
      .from("orgs")
      .update({
        from_email: body.from_email?.trim() || null,
        reply_to_email: body.reply_to_email?.trim() || null,
        brand_primary_color: body.brand_primary_color?.trim() || null,
        logo_url: body.logo_url?.trim() || null,
        chase_notify_email: body.chase_notify_email?.trim() || null,
      })
      .eq("id", session.orgId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await supabase.from("audit_events").insert({
      org_id: session.orgId,
      actor_type: "admin",
      actor_id: session.userId,
      entity_type: "org",
      entity_id: session.orgId,
      action: "white_label_updated",
      after_state: {
        from_email: body.from_email,
        brand_primary_color: body.brand_primary_color,
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
