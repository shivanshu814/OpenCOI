import nodemailer from "nodemailer";

/** Personal Gmail / Google Workspace SMTP until Resend domain is verified. */
export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

export function getSmtpFromAddress(): string {
  const from = process.env.SMTP_FROM?.trim();
  if (from) return from;
  const user = process.env.SMTP_USER?.trim();
  return user ? `CertShield <${user}>` : "CertShield <noreply@localhost>";
}

export async function sendViaSmtp(input: {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  from?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!isSmtpConfigured()) {
    return { ok: false, error: "SMTP is not configured" };
  }

  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT?.trim() || "587");
  const user = process.env.SMTP_USER!.trim();
  const pass = process.env.SMTP_PASS!.trim();

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: input.from?.trim() || getSmtpFromAddress(),
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
    });

    return {
      ok: true,
      id: typeof info.messageId === "string" ? info.messageId : `smtp_${Date.now()}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SMTP send failed",
    };
  }
}

/** Prefer SMTP when set (founder personal inbox); else Resend. */
export function preferredOutboundLabel(): "smtp" | "resend" | "none" {
  if (isSmtpConfigured()) return "smtp";
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  return "none";
}
