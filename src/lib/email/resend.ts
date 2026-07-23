import { Resend } from "resend";

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getResendFromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "CertShield <onboarding@resend.dev>"
  );
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
    return `Cannot send to @${domain} — Resend test mode blocks fixture domains. Edit the vendor to a real inbox (your Resend account email), or verify your sending domain in Resend for production sends.`;
  }
  return null;
}

export function mapResendError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("example.com") || m.includes("testing email")) {
    return "Resend is still in test mode: it only delivers to your Resend account email, and blocks domains like example.com. Update the vendor email, or verify your sending domain in Resend.";
  }
  if (m.includes("only send testing emails to your own")) {
    return "Resend test mode: recipient must be your Resend login email until a custom domain is verified.";
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
  /** F2 white-label from (must be verified in Resend). */
  from?: string;
  tags?: { name: string; value: string }[];
};

export type SendEmailResult =
  | { ok: true; demo: true; id: string }
  | { ok: true; demo: false; id: string }
  | { ok: false; error: string };

/** Outbound via Resend; without API key, logs and returns demo id. */
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

  const resend = getResendClient();
  if (!resend) {
    console.info("[resend:demo]", {
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      from: input.from,
    });
    return { ok: true, demo: true, id: `demo_${Date.now()}` };
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

  return { ok: true, demo: false, id: data?.id ?? `resend_${Date.now()}` };
}
