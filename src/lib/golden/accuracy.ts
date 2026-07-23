/**
 * Golden-set accuracy harness (Week 6 / Month 3 SCALE gate).
 * Compares expected vs actual field paths on labeled extractions.
 * ≥98% on dates/limits is the M3 gate that reduces internal review — not a launch blocker.
 */

import {
  ACORD_GOLDEN_CORPUS,
  isMonth3GateField,
} from "./corpus";

export type GoldenField = {
  path: string;
  expected: string | number | boolean | null;
};

export type GoldenCase = {
  id: string;
  label: string;
  fields: GoldenField[];
  /** Actual values as if extracted (model output). */
  actual: Record<string, string | number | boolean | null>;
};

export type AccuracyResult = {
  total: number;
  matched: number;
  accuracy: number;
  failures: { caseId: string; path: string; expected: unknown; actual: unknown }[];
};

export type ScoreOptions = {
  /** When true, only score dates + limits (Month 3 SCALE gate). */
  datesAndLimitsOnly?: boolean;
};

export function scoreGoldenSet(
  cases: GoldenCase[],
  options: ScoreOptions = {},
): AccuracyResult {
  let total = 0;
  let matched = 0;
  const failures: AccuracyResult["failures"] = [];

  for (const c of cases) {
    for (const f of c.fields) {
      if (options.datesAndLimitsOnly && !isMonth3GateField(f.path)) continue;
      total += 1;
      const actual = c.actual[f.path] ?? null;
      const ok = normalize(actual) === normalize(f.expected);
      if (ok) matched += 1;
      else {
        failures.push({
          caseId: c.id,
          path: f.path,
          expected: f.expected,
          actual,
        });
      }
    }
  }

  const accuracy = total === 0 ? 0 : matched / total;
  return { total, matched, accuracy, failures };
}

function normalize(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v).trim().toLowerCase().replace(/[$,]/g, "");
}

export const MONTH3_ACCURACY_GATE = 0.98;

/**
 * Full fixture corpus for CI — ACORD-shaped cases (expand via review corrections).
 * Re-exported alias kept for older imports.
 */
export const FIXTURE_GOLDEN_CASES: GoldenCase[] = ACORD_GOLDEN_CORPUS;

export { ACORD_GOLDEN_CORPUS, casesFromCorrectionRows, isMonth3GateField } from "./corpus";
export type { GoldenSetCorrectionRow } from "./corpus";

