export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Claude vision via OpenRouter (OPENROUTER_API_KEY). */
export function isClaudeConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function isInngestConfigured() {
  return Boolean(process.env.INNGEST_EVENT_KEY || process.env.INNGEST_DEV);
}

/**
 * Whether uploads should queue via Inngest (vs run Claude inline).
 *
 * Local default is inline: having INNGEST_EVENT_KEY in `.env.local` sends
 * events to Inngest Cloud, which cannot reach localhost — docs strand at
 * `uploaded`. Opt into queueing locally with INNGEST_FORCE_QUEUE=1 and
 * `npx inngest-cli@latest dev`.
 */
export function shouldQueueViaInngest() {
  if (process.env.INNGEST_FORCE_QUEUE === "1") {
    return isInngestConfigured();
  }
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    return Boolean(process.env.INNGEST_EVENT_KEY?.trim());
  }
  return false;
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

/** Outbound chase email ready (SMTP preferred, else Resend). */
export function isOutboundEmailConfigured() {
  return isSmtpConfigured() || isResendConfigured();
}

/** Postmark inbound webhook auth configured (email-in listening). */
export function isEmailInboundConfigured() {
  const domain = process.env.INBOUND_EMAIL_DOMAIN?.trim();
  const bearer = process.env.POSTMARK_INBOUND_HOOK_TOKEN?.trim();
  const basic =
    process.env.POSTMARK_INBOUND_BASIC_USER?.trim() &&
    process.env.POSTMARK_INBOUND_BASIC_PASSWORD?.trim();
  return Boolean(domain && (bearer || basic));
}

export function isPaddleCheckoutConfigured() {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();
  const hasPrice = Boolean(
    process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER?.trim() ||
    process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO?.trim() ||
    process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS?.trim(),
  );
  return Boolean(token && hasPrice);
}

