import {
  extractionSchema,
  PROMPT_VERSION,
  type Extraction,
} from "@/lib/extraction/schema";
import Anthropic from "@anthropic-ai/sdk";

/** OpenRouter model slug — Claude via OpenRouter (docs stack: Claude vision → JSON). */
export const MODEL_VERSION =
  process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api";

const SYSTEM = `You extract Certificate of Insurance (ACORD) data into strict JSON matching the provided schema.
Rules:
- never invent values; use null + low confidence instead of guessing
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
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://certshield.com";

  return new Anthropic({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": appUrl,
      "X-Title": "CertShield",
    },
  });
}

export async function extractCoiFromPdfBase64(params: {
  pdfBase64: string;
  mediaType?: MediaType;
}): Promise<Extraction> {
  const client = getOpenRouterClient();
  const started = Date.now();
  const mediaType = params.mediaType ?? "application/pdf";

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
        input_schema: {
          type: "object",
          additionalProperties: true,
        },
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
            text: "Extract this certificate into submit_extraction. Include endorsement_forms_detected.",
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
  const input = toolBlock.input as Record<string, unknown>;

  const withMeta = {
    ...input,
    extraction_meta: {
      model_version: MODEL_VERSION,
      prompt_version: PROMPT_VERSION,
      overall_confidence:
        typeof (input.extraction_meta as { overall_confidence?: number } | undefined)
          ?.overall_confidence === "number"
          ? (input.extraction_meta as { overall_confidence: number })
            .overall_confidence
          : 0.5,
      low_confidence_paths:
        (input.extraction_meta as { low_confidence_paths?: string[] } | undefined)
          ?.low_confidence_paths ?? [],
      cost_usd: 0,
      latency_ms,
    },
  };

  return extractionSchema.parse(withMeta);
}
