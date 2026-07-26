import { ingestPdfDocument } from "@/lib/documents/ingest";
import {
  parseIntakeTokenFromRecipients,
} from "@/lib/email/intake-address";
import {
  isPdfAttachment,
  type PostmarkInboundPayload,
} from "@/lib/email/postmark-inbound";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditEvent } from "@/lib/audit/write";
import {
  extractNameHints,
  matchVendorByNames,
} from "@/lib/vendors/fuzzy-match";

const MAX_PDFS = 5;
const MAX_BYTES = 20 * 1024 * 1024;

export type EmailInResult = {
  ok: boolean;
  ignored?: boolean;
  reason?: string;
  orgId?: string;
  documents?: Array<{
    documentId: string;
    vendorId: string;
    fileName: string;
    vendorMatched: boolean;
    matchScore?: number;
  }>;
};

/** Resolve token → org, fuzzy-match vendor, ingest each PDF attachment. */
export async function processInboundEmail(
  payload: PostmarkInboundPayload,
): Promise<EmailInResult> {
  const recipientEmails = [
    payload.OriginalRecipient,
    payload.To,
    ...(payload.ToFull?.map((r) => r.Email) ?? []),
    ...(payload.CcFull?.map((r) => r.Email) ?? []),
  ];

  const token = parseIntakeTokenFromRecipients(recipientEmails);
  if (!token) {
    return {
      ok: true,
      ignored: true,
      reason: "No intake token in recipient address",
    };
  }

  const admin = createAdminClient();
  const { data: org, error: orgErr } = await admin
    .from("orgs")
    .select("id, name")
    .eq("intake_token", token)
    .maybeSingle();

  if (orgErr || !org) {
    return {
      ok: true,
      ignored: true,
      reason: orgErr?.message ?? "Unknown intake token",
    };
  }

  const pdfs = (payload.Attachments ?? [])
    .filter(isPdfAttachment)
    .slice(0, MAX_PDFS);

  if (pdfs.length === 0) {
    await insertAuditEvent(admin, {
      org_id: org.id,
      actor_type: "system",
      actor_id: "postmark:inbound",
      entity_type: "org",
      entity_id: org.id,
      action: "email_in_no_pdf",
      after_state: {
        message_id: payload.MessageID,
        subject: payload.Subject,
        from: payload.From,
      },
    }, { captureRequest: false });
    return {
      ok: true,
      ignored: true,
      reason: "No PDF attachments",
      orgId: org.id,
    };
  }

  const { data: vendors } = await admin
    .from("vendors")
    .select("id, name, legal_name")
    .eq("org_id", org.id);

  const hints = extractNameHints({
    subject: payload.Subject,
    fromName: payload.FromName,
    textBody: payload.TextBody,
  });

  const match = matchVendorByNames(hints, vendors ?? []);
  let vendorId: string;
  let vendorMatched = false;
  let matchScore: number | undefined;

  if (match) {
    vendorId = match.vendorId;
    vendorMatched = true;
    matchScore = match.score;
  } else {
    const autoName =
      hints.find((h) => h.length >= 3 && h.length <= 80) ??
      payload.FromName?.trim() ??
      `Email intake ${new Date().toISOString().slice(0, 10)}`;

    const { data: created, error: createErr } = await admin
      .from("vendors")
      .insert({
        org_id: org.id,
        name: autoName.slice(0, 120),
        email: payload.From ?? null,
        status: "in_review",
      })
      .select("id")
      .single();

    if (createErr || !created) {
      return {
        ok: false,
        reason: createErr?.message ?? "Failed to create vendor",
        orgId: org.id,
      };
    }

    vendorId = created.id;
    await insertAuditEvent(admin, {
      org_id: org.id,
      actor_type: "system",
      actor_id: "postmark:inbound",
      entity_type: "vendor",
      entity_id: vendorId,
      action: "email_in_vendor_auto_created",
      after_state: {
        name: autoName,
        hints,
        message_id: payload.MessageID,
      },
    }, { captureRequest: false });
  }

  const documents: EmailInResult["documents"] = [];

  for (const att of pdfs) {
    const bytes = Buffer.from(att.Content, "base64");
    if (bytes.length === 0 || bytes.length > MAX_BYTES) continue;

    const result = await ingestPdfDocument({
      orgId: org.id,
      vendorId,
      fileName: att.Name || "email-in.pdf",
      mimeType: att.ContentType || "application/pdf",
      pdfBytes: bytes,
      supabase: admin,
      actor: { type: "system", id: "postmark:inbound" },
      auditExtra: {
        source: "email_in",
        message_id: payload.MessageID,
        from: payload.From,
        subject: payload.Subject,
        vendor_matched: vendorMatched,
        match_score: matchScore,
      },
    });

    documents.push({
      documentId: result.documentId,
      vendorId,
      fileName: att.Name,
      vendorMatched,
      matchScore,
    });
  }

  if (documents.length === 0) {
    return {
      ok: true,
      ignored: true,
      reason: "PDF attachments empty or over size limit",
      orgId: org.id,
    };
  }

  // C2: reply / new cert pauses active chase for this vendor.
  await admin
    .from("chase_sequences")
    .update({
      status: "paused",
      paused_reason: "vendor_reply_or_new_doc",
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", org.id)
    .eq("vendor_id", vendorId)
    .eq("status", "active");

  await admin.from("messages").insert({
    org_id: org.id,
    vendor_id: vendorId,
    channel: "email",
    direction: "inbound",
    to_email: payload.OriginalRecipient ?? payload.To ?? null,
    subject: payload.Subject ?? null,
    body_text: payload.TextBody ?? null,
    provider: "postmark",
    provider_message_id: payload.MessageID ?? null,
    status: "received",
    metadata: { from: payload.From, document_count: documents.length },
  });

  return { ok: true, orgId: org.id, documents };
}
