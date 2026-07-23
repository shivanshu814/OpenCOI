import type { ChaseLocale, ChaseTemplateKey, ChaseTemplateVars } from "./types";

type TemplateBody = {
  subject: (v: ChaseTemplateVars) => string;
  text: (v: ChaseTemplateVars) => string;
};

const FOOTER_EN = (v: ChaseTemplateVars) =>
  [
    "",
    "—",
    `${v.orgName} · via CertShield`,
    v.physicalAddress,
    "",
    "Document review assistance — not legal, insurance, or professional advice.",
    "Reply to this email with your updated COI, or forward to your insurance agent.",
  ].join("\n");

const FOOTER_ES = (v: ChaseTemplateVars) =>
  [
    "",
    "—",
    `${v.orgName} · vía CertShield`,
    v.physicalAddress,
    "",
    "Asistencia de revisión documental — no es asesoría legal, de seguros ni profesional.",
    "Responda a este correo con su COI actualizado, o reenvíelo a su agente de seguros.",
  ].join("\n");

function expiryLineEn(v: ChaseTemplateVars): string {
  if (v.expirationDate && v.daysUntilExpiry !== null) {
    if (v.daysUntilExpiry < 0) {
      return `Your certificate expired on ${v.expirationDate} (${Math.abs(v.daysUntilExpiry)} day(s) ago).`;
    }
    return `Your certificate expires on ${v.expirationDate} (in ${v.daysUntilExpiry} day(s)).`;
  }
  if (v.expirationDate) return `Your certificate expires on ${v.expirationDate}.`;
  return "We do not have a current certificate of insurance on file for you.";
}

function expiryLineEs(v: ChaseTemplateVars): string {
  if (v.expirationDate && v.daysUntilExpiry !== null) {
    if (v.daysUntilExpiry < 0) {
      return `Su certificado venció el ${v.expirationDate} (hace ${Math.abs(v.daysUntilExpiry)} día(s)).`;
    }
    return `Su certificado vence el ${v.expirationDate} (en ${v.daysUntilExpiry} día(s)).`;
  }
  if (v.expirationDate) return `Su certificado vence el ${v.expirationDate}.`;
  return "No tenemos un certificado de seguro vigente registrado para usted.";
}

const EN: Record<ChaseTemplateKey, TemplateBody> = {
  doc_request: {
    subject: (v) =>
      `Action needed: insurance certificate for ${v.orgName}`,
    text: (v) =>
      [
        `Hi ${v.vendorName},`,
        "",
        `${v.orgName} needs a current Certificate of Insurance (ACORD 25) before work can continue.`,
        "",
        "Please reply with a PDF of your COI, or forward this email to your insurance agent.",
        v.intakeEmail
          ? `You can also send the PDF to: ${v.intakeEmail}`
          : null,
        FOOTER_EN(v),
      ]
        .filter(Boolean)
        .join("\n"),
  },
  expiry_30: {
    subject: (v) =>
      `Reminder: COI expires in 30 days — ${v.orgName}`,
    text: (v) =>
      [
        `Hi ${v.vendorName},`,
        "",
        expiryLineEn(v),
        "",
        "Please send a renewed Certificate of Insurance when available so we can keep you on the approved vendor list.",
        v.intakeEmail ? `Reply with the PDF or email it to: ${v.intakeEmail}` : null,
        FOOTER_EN(v),
      ]
        .filter(Boolean)
        .join("\n"),
  },
  expiry_14: {
    subject: (v) =>
      `COI expires in 14 days — ${v.orgName} needs your renewal`,
    text: (v) =>
      [
        `Hi ${v.vendorName},`,
        "",
        expiryLineEn(v),
        "",
        "Two weeks left. Please ask your agent for a renewed COI and send it to us as soon as it is issued.",
        v.intakeEmail ? `Send the PDF to: ${v.intakeEmail}` : null,
        FOOTER_EN(v),
      ]
        .filter(Boolean)
        .join("\n"),
  },
  expiry_7: {
    subject: (v) =>
      `Urgent: COI expires in 7 days — ${v.orgName}`,
    text: (v) =>
      [
        `Hi ${v.vendorName},`,
        "",
        expiryLineEn(v),
        "",
        "One week remaining. Without a renewed certificate on file, we may need to pause work assignments.",
        v.intakeEmail ? `Please send your renewed COI to: ${v.intakeEmail}` : null,
        FOOTER_EN(v),
      ]
        .filter(Boolean)
        .join("\n"),
  },
  expiry_1: {
    subject: (v) =>
      `Final notice: COI expires tomorrow — ${v.orgName}`,
    text: (v) =>
      [
        `Hi ${v.vendorName},`,
        "",
        expiryLineEn(v),
        "",
        "This is a final reminder. Please send a renewed Certificate of Insurance today.",
        v.intakeEmail ? `Email the PDF to: ${v.intakeEmail}` : null,
        FOOTER_EN(v),
      ]
        .filter(Boolean)
        .join("\n"),
  },
  post_expiry_weekly: {
    subject: (v) =>
      `COI expired — renewal needed for ${v.orgName}`,
    text: (v) =>
      [
        `Hi ${v.vendorName},`,
        "",
        expiryLineEn(v),
        "",
        "Your certificate is past expiration. Please send a renewed COI so we can restore your compliant status.",
        v.intakeEmail ? `Send the PDF to: ${v.intakeEmail}` : null,
        FOOTER_EN(v),
      ]
        .filter(Boolean)
        .join("\n"),
  },
  thanks_compliant: {
    subject: (v) =>
      `Thank you — insurance on file for ${v.orgName}`,
    text: (v) =>
      [
        `Hi ${v.vendorName},`,
        "",
        `Thanks — we have received your Certificate of Insurance and updated your status with ${v.orgName}.`,
        "",
        "We will remind you before the next renewal date.",
        FOOTER_EN(v),
      ].join("\n"),
  },
  escalation_customer: {
    subject: (v) =>
      `Chase escalation: ${v.vendorName} has not responded`,
    text: (v) =>
      [
        `Hi,`,
        "",
        `${v.vendorName} has not responded after multiple COI chase emails.`,
        expiryLineEn(v),
        "",
        "You may want to follow up directly or pause work until a renewed certificate is on file.",
        "",
        "—",
        "CertShield",
        v.physicalAddress,
        "",
        "Document review assistance — not legal, insurance, or professional advice.",
      ].join("\n"),
  },
};

const ES: Record<ChaseTemplateKey, TemplateBody> = {
  doc_request: {
    subject: (v) =>
      `Acción requerida: certificado de seguro para ${v.orgName}`,
    text: (v) =>
      [
        `Hola ${v.vendorName},`,
        "",
        `${v.orgName} necesita un Certificado de Seguro vigente (ACORD 25) antes de continuar el trabajo.`,
        "",
        "Por favor responda con el PDF de su COI, o reenvíe este correo a su agente de seguros.",
        v.intakeEmail
          ? `También puede enviar el PDF a: ${v.intakeEmail}`
          : null,
        FOOTER_ES(v),
      ]
        .filter(Boolean)
        .join("\n"),
  },
  expiry_30: {
    subject: (v) =>
      `Recordatorio: el COI vence en 30 días — ${v.orgName}`,
    text: (v) =>
      [
        `Hola ${v.vendorName},`,
        "",
        expiryLineEs(v),
        "",
        "Por favor envíe un Certificado de Seguro renovado cuando esté disponible para mantenerlo en la lista de proveedores aprobados.",
        v.intakeEmail
          ? `Responda con el PDF o envíelo a: ${v.intakeEmail}`
          : null,
        FOOTER_ES(v),
      ]
        .filter(Boolean)
        .join("\n"),
  },
  expiry_14: {
    subject: (v) =>
      `El COI vence en 14 días — ${v.orgName} necesita su renovación`,
    text: (v) =>
      [
        `Hola ${v.vendorName},`,
        "",
        expiryLineEs(v),
        "",
        "Quedan dos semanas. Pida a su agente un COI renovado y envíenoslo tan pronto como se emita.",
        v.intakeEmail ? `Envíe el PDF a: ${v.intakeEmail}` : null,
        FOOTER_ES(v),
      ]
        .filter(Boolean)
        .join("\n"),
  },
  expiry_7: {
    subject: (v) =>
      `Urgente: el COI vence en 7 días — ${v.orgName}`,
    text: (v) =>
      [
        `Hola ${v.vendorName},`,
        "",
        expiryLineEs(v),
        "",
        "Queda una semana. Sin un certificado renovado en archivo, es posible que debamos pausar asignaciones de trabajo.",
        v.intakeEmail
          ? `Por favor envíe su COI renovado a: ${v.intakeEmail}`
          : null,
        FOOTER_ES(v),
      ]
        .filter(Boolean)
        .join("\n"),
  },
  expiry_1: {
    subject: (v) =>
      `Aviso final: el COI vence mañana — ${v.orgName}`,
    text: (v) =>
      [
        `Hola ${v.vendorName},`,
        "",
        expiryLineEs(v),
        "",
        "Este es un recordatorio final. Por favor envíe un Certificado de Seguro renovado hoy.",
        v.intakeEmail ? `Envíe el PDF a: ${v.intakeEmail}` : null,
        FOOTER_ES(v),
      ]
        .filter(Boolean)
        .join("\n"),
  },
  post_expiry_weekly: {
    subject: (v) =>
      `COI vencido — se necesita renovación para ${v.orgName}`,
    text: (v) =>
      [
        `Hola ${v.vendorName},`,
        "",
        expiryLineEs(v),
        "",
        "Su certificado ya venció. Por favor envíe un COI renovado para restaurar su estado de cumplimiento.",
        v.intakeEmail ? `Envíe el PDF a: ${v.intakeEmail}` : null,
        FOOTER_ES(v),
      ]
        .filter(Boolean)
        .join("\n"),
  },
  thanks_compliant: {
    subject: (v) =>
      `Gracias — seguro registrado para ${v.orgName}`,
    text: (v) =>
      [
        `Hola ${v.vendorName},`,
        "",
        `Gracias — hemos recibido su Certificado de Seguro y actualizado su estado con ${v.orgName}.`,
        "",
        "Le recordaremos antes de la próxima fecha de renovación.",
        FOOTER_ES(v),
      ].join("\n"),
  },
  escalation_customer: {
    subject: (v) =>
      `Escalación de seguimiento: ${v.vendorName} no ha respondido`,
    text: (v) =>
      [
        `Hola,`,
        "",
        `${v.vendorName} no ha respondido después de varios correos de seguimiento de COI.`,
        expiryLineEs(v),
        "",
        "Puede contactarlos directamente o pausar el trabajo hasta tener un certificado renovado.",
        "",
        "—",
        "CertShield",
        v.physicalAddress,
        "",
        "Asistencia de revisión documental — no es asesoría legal, de seguros ni profesional.",
      ].join("\n"),
  },
};

const BY_LOCALE: Record<ChaseLocale, Record<ChaseTemplateKey, TemplateBody>> = {
  en: EN,
  es: ES,
};

export const CHASE_TEMPLATE_KEYS = Object.keys(EN) as ChaseTemplateKey[];

export function getChaseTemplate(
  key: ChaseTemplateKey,
  locale: ChaseLocale,
): TemplateBody {
  return BY_LOCALE[locale][key];
}
