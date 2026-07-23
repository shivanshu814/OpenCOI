/** Module C2/C4 — chase email types (docs/01 §6). */

export type ChaseLocale = "en" | "es";

export type ChaseTemplateKey =
  | "doc_request"
  | "expiry_30"
  | "expiry_14"
  | "expiry_7"
  | "expiry_1"
  | "post_expiry_weekly"
  | "thanks_compliant"
  | "escalation_customer";

export type ChaseTemplateVars = {
  vendorName: string;
  orgName: string;
  expirationDate: string | null;
  daysUntilExpiry: number | null;
  intakeEmail: string;
  agentName: string | null;
  physicalAddress: string;
};

export type RenderedChaseEmail = {
  templateKey: ChaseTemplateKey;
  locale: ChaseLocale;
  subject: string;
  text: string;
  html: string;
};
