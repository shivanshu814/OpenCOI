import { getChaseTemplate } from "./templates";
import type {
  ChaseLocale,
  ChaseTemplateKey,
  ChaseTemplateVars,
  RenderedChaseEmail,
} from "./types";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/).map((p) => {
    const lines = p.split("\n").map(escapeHtml).join("<br />\n");
    return `<p style="margin:0 0 1em 0;font-family:Georgia,serif;font-size:15px;line-height:1.5;color:#1a1a1a;">${lines}</p>`;
  });
  return [
    '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f6f6f4;">',
    '<div style="max-width:560px;margin:0 auto;background:#fff;padding:28px 24px;border:1px solid #e5e5e0;">',
    ...paragraphs,
    "</div></body></html>",
  ].join("\n");
}

export function renderChaseEmail(input: {
  templateKey: ChaseTemplateKey;
  locale: ChaseLocale;
  vars: ChaseTemplateVars;
}): RenderedChaseEmail {
  const tpl = getChaseTemplate(input.templateKey, input.locale);
  const subject = tpl.subject(input.vars);
  const text = tpl.text(input.vars);
  return {
    templateKey: input.templateKey,
    locale: input.locale,
    subject,
    text,
    html: textToHtml(text),
  };
}

export const DEFAULT_PHYSICAL_ADDRESS =
  process.env.CHASE_PHYSICAL_ADDRESS?.trim() ||
  "CertShield · US operations · shivanshu814pathak@gmail.com";
