/** SMS chase templates — EN/ES. Short; include portal URL + STOP (TCPA). */

export type SmsLocale = "en" | "es";

export type SmsTemplateKey =
  | "doc_request"
  | "expiry_30"
  | "expiry_14"
  | "expiry_7"
  | "expiry_1"
  | "post_expiry_weekly"
  | "thanks_compliant";

export type SmsVars = {
  vendorName: string;
  orgName: string;
  portalUrl: string;
  expirationDate: string | null;
  daysUntilExpiry: number | null;
};

function trunc(url: string): string {
  return url.trim();
}

export function renderChaseSms(input: {
  templateKey: SmsTemplateKey;
  locale: SmsLocale;
  vars: SmsVars;
}): string {
  const v = input.vars;
  const link = trunc(v.portalUrl);
  const stop =
    input.locale === "es"
      ? "Responda STOP para cancelar."
      : "Reply STOP to opt out.";

  if (input.locale === "es") {
    switch (input.templateKey) {
      case "doc_request":
        return `${v.orgName}: falta su certificado de seguro. Suba aquí (sin contraseña): ${link} ${stop}`;
      case "expiry_30":
        return `${v.orgName}: su COI vence en ~30 días (${v.expirationDate ?? "pronto"}). Renueve: ${link} ${stop}`;
      case "expiry_14":
        return `${v.orgName}: COI vence en ~14 días. Suba renovación: ${link} ${stop}`;
      case "expiry_7":
        return `${v.orgName}: COI vence en 7 días. Urgente: ${link} ${stop}`;
      case "expiry_1":
        return `${v.orgName}: COI vence mañana. Suba ahora: ${link} ${stop}`;
      case "post_expiry_weekly":
        return `${v.orgName}: COI vencido — aún necesitamos renovación: ${link} ${stop}`;
      case "thanks_compliant":
        return `${v.orgName}: gracias — su certificado está al día. ${stop}`;
    }
  }

  switch (input.templateKey) {
    case "doc_request":
      return `${v.orgName}: we still need your certificate of insurance. Upload (no login): ${link} ${stop}`;
    case "expiry_30":
      return `${v.orgName}: your COI expires in ~30 days (${v.expirationDate ?? "soon"}). Renew: ${link} ${stop}`;
    case "expiry_14":
      return `${v.orgName}: COI expires in ~14 days. Upload renewal: ${link} ${stop}`;
    case "expiry_7":
      return `${v.orgName}: COI expires in 7 days. Urgent: ${link} ${stop}`;
    case "expiry_1":
      return `${v.orgName}: COI expires tomorrow. Upload now: ${link} ${stop}`;
    case "post_expiry_weekly":
      return `${v.orgName}: COI expired — we still need a renewal: ${link} ${stop}`;
    case "thanks_compliant":
      return `${v.orgName}: thanks — your certificate looks current. ${stop}`;
  }
}

/** Map email chase template → SMS (escalation is email-only). */
export function smsKeyFromChaseTemplate(
  key: string,
): SmsTemplateKey | null {
  const allowed: SmsTemplateKey[] = [
    "doc_request",
    "expiry_30",
    "expiry_14",
    "expiry_7",
    "expiry_1",
    "post_expiry_weekly",
    "thanks_compliant",
  ];
  return (allowed as string[]).includes(key)
    ? (key as SmsTemplateKey)
    : null;
}
