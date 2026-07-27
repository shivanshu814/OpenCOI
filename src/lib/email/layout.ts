/**
 * Shared branded HTML layout for ALL custom outbound email.
 *
 * One 600px inline-styled nested-table skeleton (the "house style" that
 * started life in team-invite): #f6f7f9 page, white card, accent top rule,
 * wordmark header, bulletproof table-cell buttons, muted footer with a
 * raw-URL fallback under every CTA. Every caller assembles `bodyHtml`
 * from pre-escaped content (use `escapeHtml` / the paragraph helpers) and
 * this module handles the chrome.
 *
 * White-label (F2): callers may pass `brand` — the color is sanitized to a
 * strict hex and the logo to https-only (reusing the portal sanitizers), so
 * org-supplied branding can never inject markup or a javascript: URL.
 *
 * NOT used for Supabase auth templates (web/supabase/email-templates).
 */

import { sanitizeHexColor, sanitizeLogoUrl } from "@/lib/portal/tokens";

const DEFAULT_BRAND_NAME = "CertShield";
const DEFAULT_BRAND_COLOR = "#00B884";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Escape a user/vendor-supplied string for safe interpolation into HTML. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type EmailCta = {
  /** Plain text — escaped by the layout. */
  label: string;
  /** Absolute URL — escaped by the layout (href + raw-URL fallback line). */
  url: string;
};

export type EmailBrand = {
  /** Display name in the header wordmark. Defaults to CertShield. */
  name?: string | null;
  /** Accent color — sanitized to #rgb/#rrggbb, else default green. */
  color?: string | null;
  /** Logo image — https-only, else the wordmark text is used. */
  logoUrl?: string | null;
};

export type BrandedEmailOptions = {
  /** Inbox preview text (plain text — escaped here). */
  preheader?: string;
  /** Card headline (plain text — escaped here). */
  heading: string;
  /**
   * Main content. Trusted HTML assembled by the caller — every dynamic
   * value inside it MUST already have gone through `escapeHtml`.
   */
  bodyHtml: string;
  /** Primary button (brand color). */
  cta?: EmailCta;
  /** Secondary button (neutral, bordered) — e.g. Deny next to Confirm. */
  secondaryCta?: EmailCta;
  /**
   * Muted footer note above the fallback links. Trusted HTML — escape
   * dynamic values before interpolating.
   */
  footerNote?: string;
  brand?: EmailBrand;
};

/** Standard body paragraph. `innerHtml` is trusted (pre-escaped) HTML. */
export function paragraphHtml(innerHtml: string): string {
  return `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#4a5260;">${innerHtml}</p>`;
}

/** Small muted paragraph for disclaimers inside the body. */
export function mutedTextHtml(innerHtml: string): string {
  return `<p style="margin:0 0 12px 0;font-size:12px;line-height:1.6;color:#6a727e;">${innerHtml}</p>`;
}

/** Styled bullet list. Each item is trusted (pre-escaped) HTML. */
export function listHtml(itemsHtml: string[]): string {
  const items = itemsHtml
    .map(
      (item) =>
        `<li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#4a5260;">${item}</li>`,
    )
    .join("\n");
  return `<ul style="margin:0 0 12px 0;padding:0 0 0 20px;">${items}</ul>`;
}

function buttonCell(cta: EmailCta, accent: string, primary: boolean): string {
  const cellStyle = primary
    ? `border-radius:8px;`
    : `border-radius:8px;border:1px solid #e2e5ea;`;
  const bgcolor = primary ? accent : "#ffffff";
  const textColor = primary ? "#ffffff" : "#4a5260";
  return `<td bgcolor="${bgcolor}" style="${cellStyle}">
  <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:14px;font-weight:600;color:${textColor};text-decoration:none;border-radius:8px;">${escapeHtml(cta.label)}</a>
</td>`;
}

/** Render the full email document. See `BrandedEmailOptions` for contracts. */
export function renderBrandedEmailHtml(opts: BrandedEmailOptions): string {
  const brandName = opts.brand?.name?.trim() || DEFAULT_BRAND_NAME;
  const accent = sanitizeHexColor(opts.brand?.color) ?? DEFAULT_BRAND_COLOR;
  const logoUrl = sanitizeLogoUrl(opts.brand?.logoUrl);

  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>\n`
    : "";

  const headerInner = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brandName)}" height="32" style="display:block;height:32px;max-width:220px;border:0;" />`
    : `<div style="font-size:15px;font-weight:700;color:#121b29;letter-spacing:-0.01em;">${escapeHtml(brandName)}</div>` +
      (brandName === DEFAULT_BRAND_NAME
        ? `\n            <div style="font-size:12px;color:#6a727e;margin-top:2px;">COI compliance</div>`
        : "");

  const ctas: EmailCta[] = [];
  if (opts.cta) ctas.push(opts.cta);
  if (opts.secondaryCta) ctas.push(opts.secondaryCta);

  const buttons = ctas.length
    ? `
        <tr>
          <td style="padding:24px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${opts.cta ? buttonCell(opts.cta, accent, true) : ""}
                ${
                  opts.cta && opts.secondaryCta
                    ? `<td style="width:12px;font-size:0;line-height:0;">&nbsp;</td>`
                    : ""
                }
                ${opts.secondaryCta ? buttonCell(opts.secondaryCta, accent, false) : ""}
              </tr>
            </table>
          </td>
        </tr>`
    : "";

  const fallback = ctas.length
    ? `<p style="margin:16px 0 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#8b929c;">
              ${ctas.length > 1 ? "Buttons not working? Paste these links into your browser:" : "Button not working? Paste this into your browser:"}<br />
              ${ctas
                .map(
                  (c) =>
                    `${escapeHtml(c.label)}: <span style="color:#6a727e;word-break:break-all;">${escapeHtml(c.url)}</span>`,
                )
                .join("<br />\n              ")}
            </p>`
    : "";

  const footerNote = opts.footerNote
    ? `<p style="margin:16px 0 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#8b929c;">${opts.footerNote}</p>`
    : "";

  const footer =
    footerNote || fallback
      ? `
        <tr>
          <td style="padding:22px 32px 28px 32px;">
            <div style="height:1px;background-color:#e2e5ea;line-height:1px;font-size:0;">&nbsp;</div>
            ${footerNote}
            ${fallback}
          </td>
        </tr>`
      : `
        <tr><td style="padding:0 0 28px 0;font-size:0;line-height:0;">&nbsp;</td></tr>`;

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f6f7f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f7f9;padding:24px 0;">
  <tr>
    <td align="center">
      ${preheader}
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:14px;border:1px solid #e2e5ea;overflow:hidden;">
        <tr><td style="height:4px;background-color:${accent};line-height:4px;font-size:0;">&nbsp;</td></tr>

        <tr>
          <td style="padding:28px 32px 0 32px;font-family:${FONT};">
            ${headerInner}
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px 0 32px;font-family:${FONT};">
            <h1 style="margin:0 0 14px 0;font-size:20px;line-height:1.3;font-weight:600;color:#121b29;letter-spacing:-0.02em;">
              ${escapeHtml(opts.heading)}
            </h1>
            ${opts.bodyHtml}
          </td>
        </tr>
${buttons}
${footer}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
