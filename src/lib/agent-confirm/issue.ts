import { appBaseUrl } from "@/lib/app-url";
import { sendOutboundEmail } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditEvent } from "@/lib/audit/write";
import { createHash, randomBytes } from "crypto";

const TOKEN_TTL_DAYS = 14;

export function hashConfirmToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function confirmUrl(raw: string, action: "confirm" | "deny"): string {
  return `${appBaseUrl()}/confirm/${raw}?a=${action}`;
}

export type AgentConfirmIssueResult = {
  ok: boolean;
  reason?: string;
  demo?: boolean;
  confirmationId?: string;
  urlConfirm?: string;
  urlDeny?: string;
};

/** B8 — email producer Confirm/Deny links for a document. */
export async function issueAgentConfirmation(input: {
  orgId: string;
  vendorId: string;
  documentId: string;
  actorId?: string;
}): Promise<AgentConfirmIssueResult> {
  const admin = createAdminClient();

  const [{ data: doc }, { data: vendor }, { data: org }] = await Promise.all([
    admin
      .from("documents")
      .select("id, file_name, vendor_id, org_id")
      .eq("id", input.documentId)
      .eq("org_id", input.orgId)
      .maybeSingle(),
    admin
      .from("vendors")
      .select("id, name, agent_email")
      .eq("id", input.vendorId)
      .eq("org_id", input.orgId)
      .maybeSingle(),
    admin.from("orgs").select("id, name").eq("id", input.orgId).maybeSingle(),
  ]);

  if (!doc || !vendor || !org) {
    return { ok: false, reason: "Document, vendor, or org not found" };
  }
  if (doc.vendor_id !== vendor.id) {
    return { ok: false, reason: "Document does not belong to vendor" };
  }

  const { data: ext } = await admin
    .from("extractions")
    .select("payload")
    .eq("document_id", doc.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = ext?.payload as
    | {
      producer?: {
        name?: string | null;
        email?: string | null;
      };
    }
    | undefined;

  const producerEmail =
    payload?.producer?.email?.trim() ||
    vendor.agent_email?.trim() ||
    null;
  if (!producerEmail) {
    return {
      ok: false,
      reason: "No producer or agent email on file for this certificate",
    };
  }

  const producerName = payload?.producer?.name ?? null;

  await admin
    .from("agent_confirmations")
    .update({ status: "revoked" })
    .eq("document_id", doc.id)
    .eq("status", "pending");

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashConfirmToken(rawToken);
  const expiresAt = new Date(
    Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: row, error } = await admin
    .from("agent_confirmations")
    .insert({
      org_id: input.orgId,
      vendor_id: input.vendorId,
      document_id: input.documentId,
      token_hash: tokenHash,
      producer_email: producerEmail,
      producer_name: producerName,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, reason: error?.message ?? "Failed to create confirmation" };
  }

  const urlConfirm = confirmUrl(rawToken, "confirm");
  const urlDeny = confirmUrl(rawToken, "deny");

  const subject = `Please confirm certificate — ${vendor.name} / ${org.name}`;
  const text = [
    `Hello${producerName ? ` ${producerName}` : ""},`,
    "",
    `${org.name} is verifying a certificate of insurance for ${vendor.name} (${doc.file_name}).`,
    "",
    "Please confirm this certificate is valid and current:",
    `CONFIRM: ${urlConfirm}`,
    `DENY (not valid / cancelled / superseded): ${urlDeny}`,
    "",
    `This link expires in ${TOKEN_TTL_DAYS} days.`,
    "",
    "Document review assistance — not legal, insurance, or professional advice.",
    "CertShield does not detect mid-term cancellations automatically; agent confirmation is our mitigation.",
  ].join("\n");

  const html = `<p>Hello${producerName ? ` ${escapeHtml(producerName)}` : ""},</p>
<p><strong>${escapeHtml(org.name)}</strong> is verifying a certificate for <strong>${escapeHtml(vendor.name)}</strong> (${escapeHtml(doc.file_name)}).</p>
<p>Please confirm this certificate is valid and current:</p>
<p><a href="${urlConfirm}">Confirm — valid &amp; current</a></p>
<p><a href="${urlDeny}">Deny — not valid / cancelled / superseded</a></p>
<p style="color:#666;font-size:12px">Link expires in ${TOKEN_TTL_DAYS} days. Document review assistance — not legal, insurance, or professional advice. Mid-term cancellations are mitigated via agent confirmation — no tool can guarantee catching a silent cancellation.</p>`;

  const send = await sendOutboundEmail({
    to: producerEmail,
    subject,
    text,
    html,
    tags: [
      { name: "template", value: "agent_confirmation" },
      { name: "org", value: input.orgId.slice(0, 36) },
    ],
  });

  if (!send.ok) {
    return { ok: false, reason: send.error };
  }

  await insertAuditEvent(admin, {
    org_id: input.orgId,
    actor_type: input.actorId ? "admin" : "system",
    actor_id: input.actorId ?? "agent-confirm:issue",
    entity_type: "document",
    entity_id: input.documentId,
    action: "agent_confirmation_requested",
    after_state: {
      confirmation_id: row.id,
      producer_email: producerEmail,
      transport: send.transport,
    },
  });

  await admin.from("messages").insert({
    org_id: input.orgId,
    vendor_id: input.vendorId,
    channel: "email",
    direction: "outbound",
    template_key: "agent_confirmation",
    locale: "en",
    to_email: producerEmail,
    subject,
    body_text: text,
    provider: send.transport,
    provider_message_id: send.id,
    status: "sent",
  });

  return {
    ok: true,
    demo: false,
    confirmationId: row.id,
    urlConfirm,
    urlDeny,
  };
}

export type ConfirmResolveResult = {
  ok: boolean;
  status?: "confirmed" | "denied";
  already?: boolean;
  reason?: string;
  orgName?: string;
  vendorName?: string;
};

export async function resolveAgentConfirmation(input: {
  rawToken: string;
  action: "confirm" | "deny";
}): Promise<ConfirmResolveResult> {
  if (!input.rawToken || input.rawToken.length < 16) {
    return { ok: false, reason: "Invalid link" };
  }

  const admin = createAdminClient();
  const tokenHash = hashConfirmToken(input.rawToken);

  const { data: row } = await admin
    .from("agent_confirmations")
    .select(
      "id, org_id, vendor_id, document_id, status, expires_at, producer_email",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!row) return { ok: false, reason: "Link not found" };
  if (row.status === "revoked") return { ok: false, reason: "Link revoked" };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await admin
      .from("agent_confirmations")
      .update({ status: "expired" })
      .eq("id", row.id)
      .eq("status", "pending");
    return { ok: false, reason: "Link expired" };
  }

  const [{ data: org }, { data: vendor }] = await Promise.all([
    admin.from("orgs").select("name").eq("id", row.org_id).maybeSingle(),
    admin.from("vendors").select("name").eq("id", row.vendor_id).maybeSingle(),
  ]);

  if (row.status === "confirmed" || row.status === "denied") {
    return {
      ok: true,
      already: true,
      status: row.status,
      orgName: org?.name,
      vendorName: vendor?.name,
    };
  }

  const next = input.action === "confirm" ? "confirmed" : "denied";
  const { error } = await admin
    .from("agent_confirmations")
    .update({
      status: next,
      responded_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "pending");

  if (error) return { ok: false, reason: error.message };

  await insertAuditEvent(admin, {
    org_id: row.org_id,
    actor_type: "vendor",
    actor_id: row.producer_email,
    entity_type: "document",
    entity_id: row.document_id,
    action:
      next === "confirmed"
        ? "agent_confirmation_confirmed"
        : "agent_confirmation_denied",
    after_state: { confirmation_id: row.id, status: next },
  });

  return {
    ok: true,
    status: next,
    orgName: org?.name,
    vendorName: vendor?.name,
  };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
