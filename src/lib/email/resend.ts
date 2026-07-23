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
  const resend = getResendClient();
  if (!resend) {
    console.info("[resend:demo]", {
      to: input.to,
      cc: input.cc,
      subject: input.subject,
    });
    return { ok: true, demo: true, id: `demo_${Date.now()}` };
  }

  const { data, error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
    tags: input.tags,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, demo: false, id: data?.id ?? `resend_${Date.now()}` };
}
