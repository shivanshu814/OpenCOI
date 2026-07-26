/** Presentation helpers for audit_events — does not change stored action names. */

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  uploaded: "Document uploaded",
  published: "Verdict published",
  accepted: "Verdict accepted",
  overridden: "Verdict overridden",
  disputed: "Verdict disputed",
  routed_to_internal_review: "Routed to internal review",
  checked_queued_internal_review: "Queued for internal review",
  extraction_failed: "Extraction failed",
  correction_saved: "Field correction saved",
  chase_email_sent: "Chase email sent",
  chase_sms_sent: "Chase SMS sent",
  agent_confirmation_requested: "Agent confirmation requested",
  agent_confirmation_confirmed: "Agent confirmed coverage",
  agent_confirmation_denied: "Agent denied coverage",
  portal_link_issued: "Portal link issued",
  portal_agent_handoff: "Portal agent handoff",
  owner_report_sent: "Owner report sent",
  weekly_digest_sent: "Weekly digest sent",
  audit_pack_exported: "Audit pack exported",
  litigation_pack_exported: "Litigation pack exported",
  closeout_pack_exported: "Closeout pack exported",
  team_invite_created: "Team invite created",
  team_invite_sent: "Team invite emailed",
  // Distinct label so a delivery failure is visible in the trail rather than
  // reading like a successful invite.
  team_invite_created_not_emailed: "Team invite created — email not sent",
  white_label_updated: "White-label branding updated",
  api_key_created: "API key created",
  license_added: "License added",
  agreement_esign_sent: "E-sign agreement sent",
  w9_tax_profile_upserted: "W-9 / tax profile updated",
  sms_opt_out_stop: "SMS opt-out (STOP)",
  email_in_no_pdf: "Inbound email — no PDF",
  email_in_vendor_auto_created: "Vendor auto-created from email",
  onboarding_company: "Onboarding — company saved",
  onboarding_templates: "Onboarding — templates saved",
  onboarding_vendors: "Onboarding — vendors imported",
  onboarding_completed: "Onboarding completed",
  subscription_active: "Subscription activated",
  subscription_activated: "Subscription activated",
  subscription_canceled: "Subscription canceled",
  subscription_cancelled: "Subscription canceled",
  subscription_past_due: "Subscription past due",
  subscription_paused: "Subscription paused",
  subscription_trialing: "Subscription trialing",
};

const ACTOR_LABELS: Record<string, string> = {
  system: "System",
  admin: "Team",
  customer: "Customer",
  vendor: "Vendor",
  user: "User",
};

const ENTITY_LABELS: Record<string, string> = {
  document: "Document",
  vendor: "Vendor",
  property: "Property",
  project: "Project",
  org: "Organization",
  subscription: "Subscription",
};

const ACTOR_ID_LABELS: Record<string, string> = {
  "sync:extract-document": "Document extraction",
  "inngest:extract-document": "Document extraction",
  "extract-document": "Document extraction",
  ingest: "Document ingest",
  "postmark:inbound": "Inbound email",
  "chase:send": "Chase email",
  "chase:sms": "Chase SMS",
  "paddle:webhook": "Paddle billing",
  "digest:weekly": "Weekly digest",
  "owner_report:monthly": "Owner report",
  "agent-confirm:issue": "Agent confirmation",
  demo: "Demo",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function humanizeAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.startsWith("subscription_")) {
    const status = action.slice("subscription_".length).replaceAll("_", " ");
    return `Subscription ${status}`;
  }
  return action
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function humanizeActorType(actorType: string): string {
  return ACTOR_LABELS[actorType] ?? titleCase(actorType);
}

export function humanizeEntityType(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? titleCase(entityType);
}

export function truncateId(id: string, head = 8): string {
  if (!id) return "";
  if (UUID_RE.test(id)) return `${id.slice(0, head)}…`;
  if (id.includes("@") && id.length > 28) {
    const [local, domain] = id.split("@");
    const shortLocal =
      local.length > 12 ? `${local.slice(0, 10)}…` : local;
    return `${shortLocal}@${domain}`;
  }
  if (id.length > 36) return `${id.slice(0, head)}…`;
  return id;
}

export function humanizeActorId(actorId: string | null): string | null {
  if (!actorId) return null;
  if (ACTOR_ID_LABELS[actorId]) return ACTOR_ID_LABELS[actorId];
  if (actorId.includes(":")) {
    const [ns, ...rest] = actorId.split(":");
    const detail = rest.join(":").replaceAll(/[-_]/g, " ");
    return `${titleCase(ns)} · ${titleCase(detail)}`;
  }
  return truncateId(actorId);
}

export function formatActorLine(
  actorType: string,
  actorId: string | null,
): string {
  const type = humanizeActorType(actorType);
  const id = humanizeActorId(actorId);
  return id ? `${type} · ${id}` : type;
}

export function formatEntityRef(entityType: string, entityId: string): string {
  return `${humanizeEntityType(entityType)} · ${truncateId(entityId)}`;
}

function titleCase(value: string): string {
  return value
    .replaceAll(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
