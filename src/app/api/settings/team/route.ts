import { canAdminSensitive } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { sendOutboundEmail } from "@/lib/email/resend";
import { renderTeamInviteEmail } from "@/lib/email/team-invite";
import { createClient } from "@/lib/supabase/server";
import { appBaseUrl } from "@/lib/app-url";
import { insertAuditEvent } from "@/lib/audit/write";
import { NextResponse } from "next/server";

const ORG_SETTINGS_COLS = [
  "name",
  "legal_name",
  "address_line",
  "city",
  "state",
  "postal_code",
  "phone",
  "website",
  "timezone",
  "from_email",
  "reply_to_email",
  "brand_primary_color",
  "logo_url",
  "chase_notify_email",
  "digest_email",
  "digest_enabled",
  "notify_email_enabled",
  "notify_sms_enabled",
].join(", ");

/** Trim to null so an emptied field clears the column instead of storing "". */
function nullableText(value: unknown, maxLength = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

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
        .select(ORG_SETTINGS_COLS)
        .eq("id", session.orgId)
        .single(),
    ]);

  return NextResponse.json({
    members: members ?? [],
    invites: invites ?? [],
    // `branding` is the legacy key the client already reads; it now carries the
    // full org settings row (profile + branding + notification preferences).
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
    action?:
      | "invite"
      | "update_branding"
      | "update_member_role"
      | "update_profile"
      | "update_notifications";
    email?: string;
    role?: "admin" | "member" | "viewer";
    member_id?: string;
    from_email?: string | null;
    reply_to_email?: string | null;
    brand_primary_color?: string | null;
    logo_url?: string | null;
    chase_notify_email?: string | null;
    // Organization profile
    name?: string | null;
    legal_name?: string | null;
    address_line?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    phone?: string | null;
    website?: string | null;
    timezone?: string | null;
    // Notification preferences
    digest_email?: string | null;
    digest_enabled?: boolean;
    notify_email_enabled?: boolean;
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
    // The invite row is what actually grants access (via
    // `claim_pending_invites` on the teammate's first verified sign-in). The
    // email only tells them to go and sign in — so a failed send must never
    // fail the request or roll back the invite. It must, however, be reported
    // honestly: the UI previously said "Invite sent" when nothing was sent.
    const signInUrl = `${appBaseUrl()}/login?next=${encodeURIComponent("/app")}`;
    const invited = data.email as string;
    const email = renderTeamInviteEmail({
      orgName: session.orgName,
      invitedByEmail: session.email,
      invitedEmail: invited,
      role: data.role as string,
      signInUrl,
    });

    const send = await sendOutboundEmail({
      to: invited,
      subject: email.subject,
      text: email.text,
      html: email.html,
      replyTo: session.email ?? undefined,
    });

    await insertAuditEvent(supabase, {
      org_id: session.orgId,
      actor_type: "admin",
      actor_id: session.userId,
      actor_email: session.email,
      entity_type: "org",
      entity_id: session.orgId,
      // Records what happened, not what was attempted — a delivered invite and
      // a failed one must be distinguishable in the audit trail.
      action: send.ok ? "team_invite_sent" : "team_invite_created_not_emailed",
      after_state: {
        email: invited,
        role: data.role,
        emailed: send.ok,
        transport: send.ok ? send.transport : null,
        email_error: send.ok ? null : send.error,
      },
    });

    return NextResponse.json({
      ok: true,
      invite: data,
      emailed: send.ok,
      // `note` renders as a warning toast in the client, which is what a
      // created-but-not-emailed invite deserves.
      note: send.ok
        ? undefined
        : `Invite saved, but the email could not be sent (${send.error}). Tell ${invited} to sign in at ${signInUrl} — they will join automatically.`,
      signInUrl,
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
    const { sanitizeHexColor, sanitizeLogoUrl } = await import(
      "@/lib/portal/tokens"
    );
    const brand = body.brand_primary_color?.trim()
      ? sanitizeHexColor(body.brand_primary_color)
      : null;
    if (body.brand_primary_color?.trim() && !brand) {
      return NextResponse.json(
        { error: "brand_primary_color must be #rgb or #rrggbb" },
        { status: 400 },
      );
    }
    const logo = body.logo_url?.trim()
      ? sanitizeLogoUrl(body.logo_url)
      : null;
    if (body.logo_url?.trim() && !logo) {
      return NextResponse.json(
        { error: "logo_url must be an https URL" },
        { status: 400 },
      );
    }
    const { error } = await supabase
      .from("orgs")
      .update({
        from_email: body.from_email?.trim() || null,
        reply_to_email: body.reply_to_email?.trim() || null,
        brand_primary_color: brand,
        logo_url: logo,
        chase_notify_email: body.chase_notify_email?.trim() || null,
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
      action: "white_label_updated",
      after_state: {
        from_email: body.from_email,
        brand_primary_color: body.brand_primary_color,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update_profile") {
    const name = nullableText(body.name, 120);
    if (!name) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 },
      );
    }
    const website = nullableText(body.website, 200);
    if (website && !/^https?:\/\//i.test(website)) {
      return NextResponse.json(
        { error: "Website must start with http:// or https://" },
        { status: 400 },
      );
    }
    const state = nullableText(body.state, 2);

    const { error } = await supabase
      .from("orgs")
      .update({
        name,
        legal_name: nullableText(body.legal_name, 160),
        address_line: nullableText(body.address_line),
        city: nullableText(body.city, 80),
        state: state ? state.toUpperCase() : null,
        postal_code: nullableText(body.postal_code, 12),
        phone: nullableText(body.phone, 32),
        website,
        timezone: nullableText(body.timezone, 64),
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
      action: "org_profile_updated",
      after_state: { name, city: body.city, state, timezone: body.timezone },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update_notifications") {
    // SMS is deliberately absent: it stays off until Twilio A2P is approved,
    // and the UI shows it as "coming soon" rather than a toggle that lies.
    const { error } = await supabase
      .from("orgs")
      .update({
        notify_email_enabled: body.notify_email_enabled !== false,
        chase_notify_email: nullableText(body.chase_notify_email),
        digest_email: nullableText(body.digest_email),
        digest_enabled: body.digest_enabled !== false,
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
      action: "notification_settings_updated",
      after_state: {
        notify_email_enabled: body.notify_email_enabled !== false,
        digest_enabled: body.digest_enabled !== false,
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
