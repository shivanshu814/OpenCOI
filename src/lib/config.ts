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

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
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

