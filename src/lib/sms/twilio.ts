/**
 * Twilio SMS outbound. Without credentials → demo mode (log + fake id).
 * TCPA: callers must gate on vendor sms_opt_in_at and no sms_opt_out_at.
 */

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
    process.env.TWILIO_AUTH_TOKEN?.trim() &&
    process.env.TWILIO_FROM_NUMBER?.trim(),
  );
}

export type SendSmsInput = {
  to: string;
  body: string;
};

export type SendSmsResult =
  | { ok: true; demo: true; id: string }
  | { ok: true; demo: false; id: string }
  | { ok: false; error: string };

function normalizeE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.trim().startsWith("+") && digits.length >= 10) {
    return `+${digits}`;
  }
  return null;
}

export async function sendOutboundSms(
  input: SendSmsInput,
): Promise<SendSmsResult> {
  const to = normalizeE164(input.to);
  if (!to) {
    return { ok: false, error: "Invalid phone number" };
  }

  if (!isTwilioConfigured()) {
    console.info("[twilio:demo]", { to, body: input.body.slice(0, 120) });
    return { ok: true, demo: true, id: `demo_sms_${Date.now()}` };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  const from = process.env.TWILIO_FROM_NUMBER!.trim();
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: input.body,
  });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
    const data = (await res.json()) as {
      sid?: string;
      message?: string;
      error_message?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: data.message ?? data.error_message ?? `Twilio HTTP ${res.status}`,
      };
    }
    return { ok: true, demo: false, id: data.sid ?? `twilio_${Date.now()}` };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Twilio request failed",
    };
  }
}

export { normalizeE164 };
