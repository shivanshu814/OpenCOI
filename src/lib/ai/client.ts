import Anthropic from "@anthropic-ai/sdk";

/** OpenRouter model slug — Claude via OpenRouter (docs stack: Claude → JSON). */
export const MODEL_VERSION =
  process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api";

/**
 * USD per 1M tokens {input, output}, keyed by a substring of the model slug.
 * Used to log a real (if estimated) cost per AI call — docs/01 §7 / CLAUDE.md
 * rule 5 require cost logged on every AI call. First matching key wins;
 * DEFAULT_RATE covers unknown slugs so cost is never silently 0.
 */
const MODEL_RATES: Array<{ match: string; input: number; output: number }> = [
  { match: "claude-opus-4", input: 5, output: 25 },
  { match: "claude-sonnet-4", input: 3, output: 15 },
  { match: "claude-sonnet", input: 3, output: 15 },
  { match: "claude-haiku", input: 1, output: 5 },
];
const DEFAULT_RATE = { input: 3, output: 15 };

/** Estimated USD cost for a call, from token usage and the model rate table. */
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const slug = model.toLowerCase();
  const rate = MODEL_RATES.find((r) => slug.includes(r.match)) ?? DEFAULT_RATE;
  return (
    (inputTokens / 1_000_000) * rate.input +
    (outputTokens / 1_000_000) * rate.output
  );
}

export function getOpenRouterClient(options?: {
  /** Chat is interactive — fail fast rather than hold a vendor for 2 minutes. */
  timeoutMs?: number;
  maxRetries?: number;
}) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://getcertshield.vercel.app";

  return new Anthropic({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    // Transient 429/5xx/connection errors retry with exponential backoff in
    // the SDK; a hard timeout keeps a hung upstream from pinning the request.
    maxRetries: options?.maxRetries ?? 2,
    timeout: options?.timeoutMs ?? 120_000,
    defaultHeaders: {
      "HTTP-Referer": appUrl,
      "X-Title": "CertShield",
    },
  });
}

/** Strip anything that looks like an API key before a message can surface. */
export function redactSecrets(text: string): string {
  return text.replace(
    /\b(sk-or-v?\d?-?|sk-ant-)[A-Za-z0-9_-]{8,}\b/g,
    "[redacted]",
  );
}
