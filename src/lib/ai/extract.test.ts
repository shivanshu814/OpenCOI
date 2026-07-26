import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { ZodError } from "zod";
import {
  describeExtractionError,
  estimateCostUsd,
  needsLowConfidenceRetry,
  pickBetterExtraction,
} from "./extract";
import type { Extraction } from "@/lib/extraction/schema";

function ex(overall: number, paths: string[], cost = 0.01, latency = 100): Extraction {
  return {
    document: { type: "acord_25", issue_date: null, confidence: overall },
    producer: { name: null, contact_name: null, email: null, phone: null, confidence: overall },
    insured: { name: "V", address: null, confidence: overall },
    insurers: [],
    policies: [],
    certificate_holder: { name: null, address: null, confidence: overall },
    description_of_operations: {
      text: null,
      mentions_additional_insured: false,
      mentions_primary_noncontributory: false,
      mentions_waiver_of_subrogation: false,
      confidence: overall,
    },
    endorsement_forms_detected: [],
    extraction_meta: {
      model_version: "test",
      prompt_version: "v0.1.0",
      overall_confidence: overall,
      low_confidence_paths: paths,
      cost_usd: cost,
      latency_ms: latency,
    },
  };
}

test("estimateCostUsd: Sonnet default rate ($3/$15 per 1M)", () => {
  // 1M input + 1M output on Sonnet = $3 + $15 = $18
  assert.equal(estimateCostUsd("anthropic/claude-sonnet-4.5", 1_000_000, 1_000_000), 18);
});

test("estimateCostUsd: Opus rate ($5/$25 per 1M)", () => {
  assert.equal(estimateCostUsd("anthropic/claude-opus-4.1", 1_000_000, 1_000_000), 30);
});

test("estimateCostUsd: Haiku rate ($1/$5 per 1M)", () => {
  assert.equal(estimateCostUsd("anthropic/claude-haiku-4.5", 1_000_000, 1_000_000), 6);
});

test("estimateCostUsd: unknown slug falls back to default rate (never 0 for real usage)", () => {
  const cost = estimateCostUsd("some/unknown-model", 500_000, 100_000);
  assert.ok(cost > 0, "cost must be non-zero for real token usage");
  // 0.5*3 + 0.1*15 = 1.5 + 1.5 = 3
  assert.equal(cost, 3);
});

test("estimateCostUsd: zero tokens => zero cost", () => {
  assert.equal(estimateCostUsd("anthropic/claude-sonnet-4.5", 0, 0), 0);
});

test("needsLowConfidenceRetry: true when overall < 0.90", () => {
  assert.equal(needsLowConfidenceRetry(ex(0.8, [])), true);
});

test("needsLowConfidenceRetry: true when a low-confidence path is listed", () => {
  assert.equal(needsLowConfidenceRetry(ex(0.95, ["policies[0].limits[0].amount"])), true);
});

test("needsLowConfidenceRetry: false when confident and no flagged paths", () => {
  assert.equal(needsLowConfidenceRetry(ex(0.95, [])), false);
});

test("pickBetterExtraction: keeps the higher-confidence pass but SUMS cost", () => {
  const first = ex(0.7, ["a"], 0.01, 120);
  const second = ex(0.92, [], 0.012, 90);
  const merged = pickBetterExtraction(first, second);
  assert.equal(merged.extraction_meta.overall_confidence, 0.92);
  // cost is summed across BOTH passes — never under-reported
  assert.ok(Math.abs(merged.extraction_meta.cost_usd - 0.022) < 1e-9);
  // latency is the max of both
  assert.equal(merged.extraction_meta.latency_ms, 120);
});

test("pickBetterExtraction: keeps first when retry did not improve confidence", () => {
  const first = ex(0.9, [], 0.01, 100);
  const second = ex(0.85, ["x"], 0.011, 80);
  const merged = pickBetterExtraction(first, second);
  assert.equal(merged.extraction_meta.overall_confidence, 0.9);
  assert.ok(Math.abs(merged.extraction_meta.cost_usd - 0.021) < 1e-9);
});

// --- describeExtractionError: user-safe failure messages, no key leaks ---

test("describeExtractionError: missing OPENROUTER_API_KEY names the fix", () => {
  const msg = describeExtractionError(new Error("OPENROUTER_API_KEY is not set"));
  assert.match(msg, /OPENROUTER_API_KEY is missing/);
});

test("describeExtractionError: 401/403 → invalid key message", () => {
  const err = new Anthropic.APIError(401, {}, "unauthorized", new Headers());
  assert.match(describeExtractionError(err), /rejected the API key/);
});

test("describeExtractionError: 429 → rate-limit retry message", () => {
  const err = new Anthropic.APIError(429, {}, "rate limited", new Headers());
  assert.match(describeExtractionError(err), /rate-limiting/);
});

test("describeExtractionError: 5xx → temporary provider problem", () => {
  const err = new Anthropic.APIError(503, {}, "upstream down", new Headers());
  assert.match(describeExtractionError(err), /temporary problem/);
});

test("describeExtractionError: timeout classified before generic connection", () => {
  const err = new Anthropic.APIConnectionTimeoutError({ message: "timed out" });
  assert.match(describeExtractionError(err), /timed out/);
});

test("describeExtractionError: malformed model JSON (ZodError) → retry, no crash", () => {
  const err = new ZodError([]);
  assert.match(describeExtractionError(err), /malformed extraction data/);
});

test("describeExtractionError: missing tool_use block → structured-output message", () => {
  const err = new Error("Claude did not return submit_extraction tool use");
  assert.match(describeExtractionError(err), /structured extraction output/);
});

test("describeExtractionError: never leaks an sk-or-... key in messages", () => {
  const err = new Error(
    "request failed for key sk-or-v1-abcdef0123456789abcdef0123456789",
  );
  const msg = describeExtractionError(err);
  assert.ok(!msg.includes("sk-or-"), "API key material must be redacted");
  assert.match(msg, /\[redacted\]/);
});
