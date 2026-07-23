import {
  daysUntil,
  earliestExpirationFromPolicies,
  pickChaseTemplate,
  shouldEscalate,
} from "@/lib/chase/cadence";
import { DEFAULT_PHYSICAL_ADDRESS, renderChaseEmail } from "@/lib/chase/render";
import type {
  ChaseLocale,
  ChaseTemplateKey,
  ChaseTemplateVars,
  RenderedChaseEmail,
} from "@/lib/chase/types";
import { intakeEmailForToken } from "@/lib/email/intake-address";
import { sendOutboundEmail } from "@/lib/email/resend";
import type { Extraction } from "@/lib/extraction/schema";
import { issuePortalToken } from "@/lib/portal/tokens";
import {
  renderChaseSms,
  smsKeyFromChaseTemplate,
} from "@/lib/sms/templates";
import { sendOutboundSms } from "@/lib/sms/twilio";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChaseSendRequest = {
  orgId: string;
  vendorId: string;
  /** Force a specific template (manual send / thanks). */
  templateKey?: ChaseTemplateKey;
  locale?: ChaseLocale;
  /** Dry-run: render only, do not call Resend or persist. */
  previewOnly?: boolean;
};

export type ChaseSendResult = {
  ok: boolean;
  demo?: boolean;
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  escalationMessageId?: string;
  rendered?: RenderedChaseEmail;
  escalation?: RenderedChaseEmail;
};

type VendorRow = {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  agent_email: string | null;
  preferred_locale: string;
  status: string;
  sms_opt_in_at: string | null;
  sms_opt_out_at: string | null;
};

type OrgRow = {
  id: string;
  name: string;
  intake_token: string | null;
  chase_notify_email: string | null;
};

export async function sendChaseForVendor(
  req: ChaseSendRequest,
): Promise<ChaseSendResult> {
  const supabase = createAdminClient();

  const { data: vendor, error: vendorErr } = await supabase
    .from("vendors")
    .select(
      "id, org_id, name, email, phone, agent_email, preferred_locale, status, sms_opt_in_at, sms_opt_out_at",
    )
    .eq("id", req.vendorId)
    .eq("org_id", req.orgId)
    .maybeSingle();

  if (vendorErr || !vendor) {
    return { ok: false, reason: vendorErr?.message ?? "Vendor not found" };
  }

  const v = vendor as VendorRow;
  if (!v.email && !req.previewOnly) {
    return { ok: false, reason: "Vendor has no email" };
  }

  const { data: org } = await supabase
    .from("orgs")
    .select("id, name, intake_token, chase_notify_email")
    .eq("id", req.orgId)
    .single();

  if (!org) return { ok: false, reason: "Org not found" };
  const o = org as OrgRow;

  const extraction = await latestPublishedExtraction(
    supabase,
    req.orgId,
    req.vendorId,
  );
  const earliest = earliestExpirationFromPolicies(extraction?.policies);
  const locale: ChaseLocale =
    req.locale ?? (v.preferred_locale === "es" ? "es" : "en");

  let sequence = await getOrCreateSequence(supabase, {
    orgId: req.orgId,
    vendorId: req.vendorId,
    reason: v.status === "missing_docs" ? "missing_docs" : "expiry",
    earliest,
  });

  if (sequence.status === "paused" && !req.templateKey) {
    return {
      ok: true,
      skipped: true,
      reason: sequence.paused_reason ?? "sequence paused",
    };
  }

  const templateKey =
    req.templateKey ??
    pickChaseTemplate({
      reason: sequence.reason as "expiry" | "missing_docs",
      earliestExpirationDate: earliest,
      lastTemplateKey: sequence.last_template_key as ChaseTemplateKey | null,
      lastSentAt: sequence.last_sent_at,
      attempts: sequence.attempts,
      maxAttempts: sequence.max_attempts,
    });

  if (!templateKey) {
    return { ok: true, skipped: true, reason: "No chase due" };
  }

  const days = earliest != null ? daysUntil(earliest) : null;

  let portalUrl = "";
  try {
    const issued = await issuePortalToken({
      orgId: req.orgId,
      vendorId: req.vendorId,
    });
    portalUrl = issued.url;
  } catch (err) {
    console.error("issuePortalToken", err);
  }

  const vars: ChaseTemplateVars = {
    vendorName: v.name,
    orgName: o.name,
    expirationDate: earliest,
    daysUntilExpiry: days,
    intakeEmail: o.intake_token
      ? intakeEmailForToken(o.intake_token)
      : "",
    portalUrl,
    agentName: extraction?.producer?.name ?? null,
    physicalAddress: DEFAULT_PHYSICAL_ADDRESS,
  };

  const rendered = renderChaseEmail({ templateKey, locale, vars });

  if (req.previewOnly) {
    return { ok: true, demo: true, rendered };
  }

  const cc = [v.agent_email, extraction?.producer?.email]
    .filter((e): e is string => Boolean(e))
    .filter((e, i, arr) => arr.indexOf(e) === i && e !== v.email);

  const sendResult = await sendOutboundEmail({
    to: v.email!,
    cc: cc.length ? cc : undefined,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    replyTo: o.chase_notify_email ?? undefined,
    tags: [
      { name: "template", value: templateKey },
      { name: "org", value: req.orgId.slice(0, 36) },
    ],
  });

  if (!sendResult.ok) {
    return { ok: false, reason: sendResult.error, rendered };
  }

  const { data: msg } = await supabase
    .from("messages")
    .insert({
      org_id: req.orgId,
      vendor_id: req.vendorId,
      chase_sequence_id: sequence.id,
      channel: "email",
      direction: "outbound",
      template_key: templateKey,
      locale,
      to_email: v.email,
      cc_emails: cc,
      subject: rendered.subject,
      body_text: rendered.text,
      provider: sendResult.demo ? "demo" : "resend",
      provider_message_id: sendResult.id,
      status: sendResult.demo ? "demo" : "sent",
    })
    .select("id")
    .single();

  const nextAttempts = sequence.attempts + 1;
  await supabase
    .from("chase_sequences")
    .update({
      attempts: nextAttempts,
      last_template_key: templateKey,
      last_sent_at: new Date().toISOString(),
      earliest_expiration_date: earliest,
      updated_at: new Date().toISOString(),
      status: templateKey === "thanks_compliant" ? "completed" : "active",
    })
    .eq("id", sequence.id);

  await supabase.from("audit_events").insert({
    org_id: req.orgId,
    actor_type: "system",
    actor_id: "chase:send",
    entity_type: "vendor",
    entity_id: req.vendorId,
    action: "chase_email_sent",
    after_state: {
      template_key: templateKey,
      locale,
      provider_message_id: sendResult.id,
      demo: sendResult.demo,
      message_id: msg?.id,
    },
  });

  // C3 SMS — TCPA: only when logged opt-in and not opted out (docs/08 §4).
  const smsKey = smsKeyFromChaseTemplate(templateKey);
  const canSms =
    Boolean(v.phone) &&
    Boolean(v.sms_opt_in_at) &&
    !v.sms_opt_out_at &&
    smsKey != null;

  if (canSms && smsKey) {
    const smsBody = renderChaseSms({
      templateKey: smsKey,
      locale,
      vars: {
        vendorName: v.name,
        orgName: o.name,
        portalUrl,
        expirationDate: earliest,
        daysUntilExpiry: days,
      },
    });
    const smsResult = await sendOutboundSms({
      to: v.phone!,
      body: smsBody,
    });
    if (smsResult.ok) {
      await supabase.from("messages").insert({
        org_id: req.orgId,
        vendor_id: req.vendorId,
        chase_sequence_id: sequence.id,
        channel: "sms",
        direction: "outbound",
        template_key: smsKey,
        locale,
        to_phone: v.phone,
        body_text: smsBody,
        provider: smsResult.demo ? "demo" : "twilio",
        provider_message_id: smsResult.id,
        status: smsResult.demo ? "demo" : "sent",
      });
      await supabase.from("audit_events").insert({
        org_id: req.orgId,
        actor_type: "system",
        actor_id: "chase:sms",
        entity_type: "vendor",
        entity_id: req.vendorId,
        action: "chase_sms_sent",
        after_state: {
          template_key: smsKey,
          locale,
          provider_message_id: smsResult.id,
          demo: smsResult.demo,
        },
      });
    }
  }

  let escalation: RenderedChaseEmail | undefined;
  let escalationMessageId: string | undefined;

  if (shouldEscalate(nextAttempts) && o.chase_notify_email) {
    const esc = renderChaseEmail({
      templateKey: "escalation_customer",
      locale: "en",
      vars,
    });
    const escSend = await sendOutboundEmail({
      to: o.chase_notify_email,
      subject: esc.subject,
      text: esc.text,
      html: esc.html,
      tags: [{ name: "template", value: "escalation_customer" }],
    });
    if (escSend.ok) {
      escalation = esc;
      escalationMessageId = escSend.id;
      await supabase.from("messages").insert({
        org_id: req.orgId,
        vendor_id: req.vendorId,
        chase_sequence_id: sequence.id,
        channel: "email",
        direction: "outbound",
        template_key: "escalation_customer",
        locale: "en",
        to_email: o.chase_notify_email,
        cc_emails: [],
        subject: esc.subject,
        body_text: esc.text,
        provider: escSend.demo ? "demo" : "resend",
        provider_message_id: escSend.id,
        status: escSend.demo ? "demo" : "sent",
      });
    }
  }

  return {
    ok: true,
    demo: sendResult.demo,
    messageId: sendResult.id,
    escalationMessageId,
    rendered,
    escalation,
  };
}

async function latestPublishedExtraction(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  vendorId: string,
): Promise<Extraction | null> {
  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("org_id", orgId)
    .eq("vendor_id", vendorId)
    .in("status", ["published", "accepted", "overridden"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!doc) {
    // Fall back to any latest extraction (pre-publish chase still useful).
    const { data: anyDoc } = await supabase
      .from("documents")
      .select("id")
      .eq("org_id", orgId)
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!anyDoc) return null;
    const { data: ext } = await supabase
      .from("extractions")
      .select("payload")
      .eq("document_id", anyDoc.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (ext?.payload as Extraction) ?? null;
  }

  const { data: ext } = await supabase
    .from("extractions")
    .select("payload")
    .eq("document_id", doc.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (ext?.payload as Extraction) ?? null;
}

type SequenceRow = {
  id: string;
  reason: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_template_key: string | null;
  last_sent_at: string | null;
  paused_reason: string | null;
};

async function getOrCreateSequence(
  supabase: ReturnType<typeof createAdminClient>,
  input: {
    orgId: string;
    vendorId: string;
    reason: "expiry" | "missing_docs";
    earliest: string | null;
  },
): Promise<SequenceRow> {
  const { data: existing } = await supabase
    .from("chase_sequences")
    .select(
      "id, reason, status, attempts, max_attempts, last_template_key, last_sent_at, paused_reason",
    )
    .eq("org_id", input.orgId)
    .eq("vendor_id", input.vendorId)
    .in("status", ["active", "paused"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as SequenceRow;

  const { data: created, error } = await supabase
    .from("chase_sequences")
    .insert({
      org_id: input.orgId,
      vendor_id: input.vendorId,
      reason: input.reason,
      status: "active",
      earliest_expiration_date: input.earliest,
    })
    .select(
      "id, reason, status, attempts, max_attempts, last_template_key, last_sent_at, paused_reason",
    )
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create chase sequence");
  }
  return created as SequenceRow;
}

/** Demo-mode chase: render only, no DB. */
export function renderDemoChase(input: {
  templateKey: ChaseTemplateKey;
  locale: ChaseLocale;
  vendorName: string;
  orgName?: string;
  expirationDate?: string | null;
  daysUntilExpiry?: number | null;
  intakeEmail?: string;
  portalUrl?: string;
}): ChaseSendResult {
  const rendered = renderChaseEmail({
    templateKey: input.templateKey,
    locale: input.locale,
    vars: {
      vendorName: input.vendorName,
      orgName: input.orgName ?? "Demo Property Management",
      expirationDate: input.expirationDate ?? "2026-08-15",
      daysUntilExpiry: input.daysUntilExpiry ?? 23,
      intakeEmail: input.intakeEmail ?? "demo@in.certshield.com",
      portalUrl:
        input.portalUrl ??
        "https://getcertshield.vercel.app/portal/demo-token",
      agentName: null,
      physicalAddress: DEFAULT_PHYSICAL_ADDRESS,
    },
  });
  return { ok: true, demo: true, rendered };
}
