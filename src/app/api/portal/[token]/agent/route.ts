import { DEFAULT_PHYSICAL_ADDRESS } from "@/lib/chase/render";
import { isSupabaseConfigured } from "@/lib/config";
import { sendOutboundEmail } from "@/lib/email/resend";
import { resolvePortalToken } from "@/lib/portal/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditEvent } from "@/lib/audit/write";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  agentEmail: z.string().email(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Portal unavailable in demo mode" },
      { status: 503 },
    );
  }

  const { token } = await context.params;
  const ctx = await resolvePortalToken(token);
  if (!ctx) {
    return NextResponse.json(
      { error: "Invalid or expired portal link" },
      { status: 401 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid agent email required" }, { status: 400 });
  }

  const agentEmail = parsed.data.agentEmail.trim().toLowerCase();
  const admin = createAdminClient();

  await admin
    .from("vendors")
    .update({
      agent_email: agentEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.vendorId)
    .eq("org_id", ctx.orgId);

  const subject = `COI request for ${ctx.vendorName} — ${ctx.orgName}`;
  const text = [
    `Hello,`,
    "",
    `${ctx.vendorName} asked CertShield to request a current Certificate of Insurance (ACORD 25) for ${ctx.orgName}.`,
    "",
    `Please reply to this email with the PDF, or have the vendor upload via their portal link.`,
    "",
    "—",
    `${ctx.orgName} · via CertShield`,
    DEFAULT_PHYSICAL_ADDRESS,
    "",
    "Document review assistance — not legal, insurance, or professional advice.",
  ].join("\n");

  const send = await sendOutboundEmail({
    to: agentEmail,
    cc: ctx.vendorEmail ? [ctx.vendorEmail] : undefined,
    subject,
    text,
    html: text.replaceAll("\n", "<br/>"),
    tags: [{ name: "template", value: "portal_agent_handoff" }],
  });

  if (!send.ok) {
    return NextResponse.json(
      { error: send.error ?? "Failed to email agent" },
      { status: 502 },
    );
  }

  await admin.from("messages").insert({
    org_id: ctx.orgId,
    vendor_id: ctx.vendorId,
    channel: "email",
    direction: "outbound",
    template_key: "portal_agent_handoff",
    locale: ctx.preferredLocale,
    to_email: agentEmail,
    cc_emails: ctx.vendorEmail ? [ctx.vendorEmail] : [],
    subject,
    body_text: text,
    provider: send.transport,
    provider_message_id: send.id,
    status: "sent",
  });

  await insertAuditEvent(admin, {
    org_id: ctx.orgId,
    actor_type: "vendor",
    actor_id: ctx.vendorId,
    entity_type: "vendor",
    entity_id: ctx.vendorId,
    action: "portal_agent_handoff",
    after_state: {
      agent_email: agentEmail,
      provider_message_id: send.id,
      transport: send.transport,
    },
  });

  return NextResponse.json({ ok: true, demo: false, transport: send.transport });
}
