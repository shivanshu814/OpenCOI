import {
  CONFIDENCE_THRESHOLD,
  extractionSchema,
  PROMPT_VERSION,
  type Extraction,
} from "@/lib/extraction/schema";
import {
  scrubTemplatePlaceholders,
  UNREADABLE_FIELD,
} from "@/lib/extraction/placeholders";
import { extractionToolInputSchema } from "@/lib/extraction/tool-schema";
import Anthropic from "@anthropic-ai/sdk";
import { ZodError } from "zod";

/** OpenRouter model slug — Claude via OpenRouter (docs stack: Claude vision → JSON). */
export const MODEL_VERSION =
  process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api";

/**
 * USD per 1M tokens {input, output}, keyed by a substring of the model slug.
 * Used to log a real (if estimated) cost per AI call — docs/01 §7 / CLAUDE.md
 * rule 5 require cost logged on every extraction. First matching key wins;
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

const SYSTEM = `You extract Certificate of Insurance (ACORD) data into strict JSON matching the provided schema.
Rules:
- never invent values; use null + low confidence instead of guessing
- a BLANK/SPECIMEN ACORD form prints its own field labels where data belongs ("NAME OF VENDOR", "NAME OF INSURANCE COMPANY", "POLICY NUMBER", "EFFECTIVE DATE", "CITY, STATE, ZIP CODE"). Those are NOT values: return null with confidence 0, never echo the label as data
- ALL dates (issue_date, effective_date, expiration_date) MUST be ISO YYYY-MM-DD — convert ACORD MM/DD/YYYY values (e.g. 01/01/2027 → 2027-01-01)
- every object that has confidence must include a 0-1 confidence
- detect endorsement forms when attached: CG 20 10 (ongoing ops AI), CG 20 37 (completed ops AI), CG 24 04 (waiver of subrogation)
- set named_insured_match true/false when you can compare endorsement named insured to certificate insured; null if unsure
- description_of_operations: set mentions_additional_insured, mentions_primary_noncontributory, mentions_waiver_of_subrogation from the ACORD description box wording (not from checkboxes alone)
- low_confidence_paths must list JSON paths for any required field under 0.90 confidence`;

type MediaType =
  | "application/pdf"
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif";

function getOpenRouterClient() {
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
    maxRetries: 2,
    timeout: 120_000,
    defaultHeaders: {
      "HTTP-Referer": appUrl,
      "X-Title": "CertShield",
    },
  });
}

/** Strip anything that looks like an API key before a message can surface. */
function redactSecrets(text: string): string {
  return text.replace(/\b(sk-or-v?\d?-?|sk-ant-)[A-Za-z0-9_-]{8,}\b/g, "[redacted]");
}

/**
 * Map an extraction failure to a user-safe, actionable message. Never leaks
 * the API key; never pretends success. Shown in upload/review UI and stored
 * on the extraction_failed audit event.
 */
export function describeExtractionError(err: unknown): string {
  if (err instanceof Error && err.message.includes("OPENROUTER_API_KEY")) {
    return "AI extraction is not configured — OPENROUTER_API_KEY is missing. Set it, then use Run extraction now.";
  }
  if (err instanceof ZodError) {
    return "The AI returned malformed extraction data. Retry extraction; if it persists, upload a clearer PDF.";
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return "The AI request timed out. Retry extraction — the document is safe.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Could not reach the AI provider. Check connectivity and retry extraction.";
  }
  if (err instanceof Anthropic.APIError) {
    const status = typeof err.status === "number" ? err.status : 0;
    if (status === 401 || status === 403) {
      return "The AI provider rejected the API key. Verify OPENROUTER_API_KEY, then retry extraction.";
    }
    if (status === 429) {
      return "The AI provider is rate-limiting requests. Wait a minute and retry extraction.";
    }
    if (status >= 500) {
      return "The AI provider had a temporary problem. Retry extraction in a moment.";
    }
    return redactSecrets(
      `AI extraction failed (provider error ${status || "unknown"}). Retry extraction.`,
    );
  }
  if (err instanceof Error && err.message.includes("submit_extraction")) {
    return "The AI did not return structured extraction output. Retry extraction; if it persists, upload a clearer PDF.";
  }
  const raw = err instanceof Error ? err.message : "Unknown error";
  return redactSecrets(`AI extraction failed: ${raw}. Retry extraction.`);
}

export async function extractCoiFromPdfBase64(params: {
  pdfBase64: string;
  mediaType?: MediaType;
  /** Appendix A retry — re-examine these low-confidence JSON paths closely. */
  focusPaths?: string[];
}): Promise<Extraction> {
  const client = getOpenRouterClient();
  const started = Date.now();
  const mediaType = params.mediaType ?? "application/pdf";
  const focus =
    params.focusPaths && params.focusPaths.length > 0
      ? ` Zoom in and re-read these fields especially carefully — the first pass was low-confidence: ${params.focusPaths.join(", ")}. Correct any misread digits, dates, or limits; still use null + low confidence rather than guessing.`
      : "";

  const fileContent: Anthropic.ContentBlockParam =
    mediaType === "application/pdf"
      ? {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: params.pdfBase64,
        },
      }
      : {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: params.pdfBase64,
        },
      };

  const response = await client.messages.create({
    model: MODEL_VERSION,
    max_tokens: 4096,
    temperature: 0,
    system: SYSTEM,
    tools: [
      {
        name: "submit_extraction",
        description:
          "Submit the COI extraction as strict JSON matching Appendix A.",
        // Strict Appendix A JSON Schema (not additionalProperties: true).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        input_schema: extractionToolInputSchema as any,
      },
    ],
    tool_choice: { type: "tool", name: "submit_extraction" },
    messages: [
      {
        role: "user",
        content: [
          fileContent,
          {
            type: "text",
            text: `Extract this certificate into submit_extraction. Include endorsement_forms_detected.${focus}`,
          },
        ],
      },
    ],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Claude did not return submit_extraction tool use");
  }

  const latency_ms = Date.now() - started;
  const rawInput = toolBlock.input as Record<string, unknown>;

  // A blank ACORD specimen prints its own field labels ("NAME OF VENDOR",
  // "POLICY NUMBER"), which the model can return as confident values. Scrub
  // them deterministically so the document lands in review instead of
  // creating an insured literally named after the form label.
  const { value: scrubbedInput, scrubbed } =
    scrubTemplatePlaceholders(rawInput);
  const input = scrubbedInput as Record<string, unknown>;

  // `insured.name` is a required non-nullable string in Appendix A, so a
  // scrubbed name cannot be left null — mark it unreadable and let the review
  // queue own it rather than failing the whole extraction.
  const insured = input.insured as Record<string, unknown> | undefined;
  if (insured && insured.name == null) {
    insured.name = UNREADABLE_FIELD;
  }

  const cost_usd = estimateCostUsd(
    MODEL_VERSION,
    response.usage?.input_tokens ?? 0,
    response.usage?.output_tokens ?? 0,
  );

  const modelPaths =
    (input.extraction_meta as { low_confidence_paths?: string[] } | undefined)
      ?.low_confidence_paths ?? [];

  const withMeta = {
    ...input,
    extraction_meta: {
      model_version: MODEL_VERSION,
      prompt_version: PROMPT_VERSION,
      overall_confidence: scrubbed.length
        ? // Any placeholder means this was a blank/specimen form; nothing on
          // the page can be trusted enough to skip review.
          0
        : typeof (
              input.extraction_meta as { overall_confidence?: number } | undefined
            )?.overall_confidence === "number"
          ? (input.extraction_meta as { overall_confidence: number })
            .overall_confidence
          : 0.5,
      low_confidence_paths: [...new Set([...modelPaths, ...scrubbed])],
      cost_usd,
      latency_ms,
    },
  };

  return extractionSchema.parse(withMeta);
}

/** Appendix A — a required field is under 0.90 confidence (or overall is low). */
export function needsLowConfidenceRetry(ex: Extraction): boolean {
  return (
    ex.extraction_meta.overall_confidence < CONFIDENCE_THRESHOLD ||
    ex.extraction_meta.low_confidence_paths.length > 0
  );
}

/**
 * Choose the better of two extraction passes: higher overall confidence wins,
 * but cost is summed and latency maxed so the logged meta reflects BOTH calls
 * (never under-reports cost — CLAUDE.md rule 5).
 */
export function pickBetterExtraction(
  first: Extraction,
  second: Extraction,
): Extraction {
  const winner =
    second.extraction_meta.overall_confidence >
    first.extraction_meta.overall_confidence
      ? second
      : first;
  return {
    ...winner,
    extraction_meta: {
      ...winner.extraction_meta,
      cost_usd: first.extraction_meta.cost_usd + second.extraction_meta.cost_usd,
      latency_ms: Math.max(
        first.extraction_meta.latency_ms,
        second.extraction_meta.latency_ms,
      ),
    },
  };
}

/**
 * Appendix A extraction with a single low-confidence retry pass. The first
 * pass runs normally; if any required field is under-confident, a second pass
 * re-reads just those fields and the higher-confidence result is kept. Not a
 * literal page-raster crop (would need a PDF rasterizer) — a focused re-prompt
 * on the low-confidence paths, which is the practical equivalent over the API.
 */
export async function extractCoiWithRetry(params: {
  pdfBase64: string;
  mediaType?: MediaType;
}): Promise<Extraction> {
  const first = await extractCoiFromPdfBase64(params);
  if (!needsLowConfidenceRetry(first)) return first;

  try {
    const second = await extractCoiFromPdfBase64({
      ...params,
      focusPaths: first.extraction_meta.low_confidence_paths,
    });
    return pickBetterExtraction(first, second);
  } catch {
    // Retry is best-effort; never fail the whole extraction on a retry error.
    return first;
  }
}
