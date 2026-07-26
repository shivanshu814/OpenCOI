import { Resend } from "resend";
import {
  getSmtpFromAddress,
  isSmtpConfigured,
  preferredOutboundLabel,
  sendViaSmtp,
} from "@/lib/email/smtp";
import { isProductionRuntime } from "@/lib/runtime-env";

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** True when any real outbound transport is ready (SMTP or Resend). */
export function isOutboundEmailConfigured() {
  return preferredOutboundLabel() !== "none";
}

export function getResendFromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "CertShield <onboarding@resend.dev>"
  );
}

export function getOutboundFromAddress() {
  if (isSmtpConfigured()) return getSmtpFromAddress();
  return getResendFromAddress();
}

/** Domains Resend rejects in test/sandbox mode (and fake fixtures). */
const BLOCKED_TEST_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "invalid",
  "localhost",
]);

export function isBlockedOutboundEmail(to: string): string | null {
  const email = to.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return "Vendor email is missing or invalid.";
  const domain = email.slice(at + 1);
  if (BLOCKED_TEST_DOMAINS.has(domain) || domain.endsWith(".example")) {
    return `Cannot send to @${domain} — use a real inbox (not a fixture domain).`;
  }
  return null;
}

export function mapResendError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("example.com") || m.includes("testing email")) {
    return "Resend is still in test mode: it only delivers to your Resend account email, and blocks domains like example.com. Update the vendor email, or verify your sending domain in Resend — or set SMTP_* for Gmail app-password sends.";
  }
  if (m.includes("only send testing emails to your own")) {
    return "Resend test mode: recipient must be your Resend login email until a custom domain is verified. Prefer SMTP_* (Gmail app password) for now.";
  }
  return message;
}

let client: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!isResendConfigured()) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY!);
  return client;
}

export type SendEmailInput = {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  /** White-label from (SMTP user domain or Resend-verified domain). */
  from?: string;
  tags?: { name: string; value: string }[];
};

export type SendEmailResult =
  | { ok: true; demo: false; id: string; transport: "smtp" | "resend" }
  | { ok: false; error: string };

/**
 * Outbound chase/digest mail.
 * Prefer SMTP (personal Gmail app password) when configured;
 * else Resend. Never pretend success in production without a transport.
 */
export async function sendOutboundEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map(
    (t) => t.trim(),
  );
  for (const to of recipients) {
    const blocked = isBlockedOutboundEmail(to);
    if (blocked) return { ok: false, error: blocked };
  }

  if (isSmtpConfigured()) {
    const result = await sendViaSmtp({
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
      from: input.from,
    });
    if (!result.ok) return result;
    return { ok: true, demo: false, id: result.id, transport: "smtp" };
  }

  const resend = getResendClient();
  if (!resend) {
    if (isProductionRuntime()) {
      return {
        ok: false,
        error:
          "No email transport configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS (Gmail app password) or RESEND_API_KEY.",
      };
    }
    console.info("[email:dev-skip]", {
      to: input.to,
      subject: input.subject,
    });
    return {
      ok: false,
      error:
        "No email transport in this environment. Add SMTP_* or RESEND_API_KEY to .env.local.",
    };
  }

  const { data, error } = await resend.emails.send({
    from: input.from?.trim() || getResendFromAddress(),
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
    tags: input.tags,
  });

  if (error) {
    return { ok: false, error: mapResendError(error.message) };
  }

  return {
    ok: true,
    demo: false,
    id: data?.id ?? `resend_${Date.now()}`,
    transport: "resend",
  };
}
