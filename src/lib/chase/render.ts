import {
  escapeHtml,
  paragraphHtml,
  renderBrandedEmailHtml,
  type EmailBrand,
} from "@/lib/email/layout";
import { getChaseTemplate } from "./templates";
import type {
  ChaseLocale,
  ChaseTemplateKey,
  ChaseTemplateVars,
  RenderedChaseEmail,
} from "./types";

/** First absolute URL in the plain-text body → CTA button target. */
const FIRST_URL = /https?:\/\/\S+/;

/** Plain-text paragraphs → escaped, styled <p> blocks. Text stays canonical. */
function chaseBodyHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => paragraphHtml(p.split("\n").map(escapeHtml).join("<br />\n")))
    .join("\n");
}

export function renderChaseEmail(input: {
  templateKey: ChaseTemplateKey;
  locale: ChaseLocale;
  vars: ChaseTemplateVars;
  /**
   * F2 white-label — customer org branding for vendor-facing sends.
   * Sanitized by the layout; omit for the default CertShield chrome.
   */
  brand?: EmailBrand;
}): RenderedChaseEmail {
  const tpl = getChaseTemplate(input.templateKey, input.locale);
  const subject = tpl.subject(input.vars);
  // Plain text is the source of truth (stored in messages.body_text and
  // relied on by tests) — the HTML mirrors it inside the branded layout.
  const text = tpl.text(input.vars);
  const es = input.locale === "es";
  const firstUrl = text.match(FIRST_URL)?.[0] ?? null;

  const html = renderBrandedEmailHtml({
    preheader: subject,
    heading: subject,
    bodyHtml: chaseBodyHtml(text),
    cta: firstUrl
      ? {
        label: es
          ? "Abrir mi portal (sin contraseña)"
          : "Open your portal (no login)",
        url: firstUrl,
      }
      : undefined,
    footerNote: es
      ? `Enviado en nombre de ${escapeHtml(input.vars.orgName)} vía CertShield.`
      : `Sent on behalf of ${escapeHtml(input.vars.orgName)} via CertShield.`,
    brand: input.brand,
  });

  return {
    templateKey: input.templateKey,
    locale: input.locale,
    subject,
    text,
    html,
  };
}

export const DEFAULT_PHYSICAL_ADDRESS =
  process.env.CHASE_PHYSICAL_ADDRESS?.trim() ||
  "CertShield · US operations · shivanshu814pathak@gmail.com";
