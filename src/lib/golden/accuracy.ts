/**
 * Golden-set accuracy harness (Week 6 / Month 3 SCALE gate scaffolding).
 * Compares expected vs actual field paths on fixture extractions.
 * ≥98% on dates/limits is the M3 gate that reduces internal review — not a launch blocker.
 */

export type GoldenField = {
  path: string;
  expected: string | number | boolean | null;
};

export type GoldenCase = {
  id: string;
  label: string;
  fields: GoldenField[];
  /** Actual values as if extracted (fixture until real ACORD corpus is loaded). */
  actual: Record<string, string | number | boolean | null>;
};

export type AccuracyResult = {
  total: number;
  matched: number;
  accuracy: number;
  failures: { caseId: string; path: string; expected: unknown; actual: unknown }[];
};

export function scoreGoldenSet(cases: GoldenCase[]): AccuracyResult {
  let total = 0;
  let matched = 0;
  const failures: AccuracyResult["failures"] = [];

  for (const c of cases) {
    for (const f of c.fields) {
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

/** Seed fixtures — expand with real ACORD corrections from golden_set_cases. */
export const FIXTURE_GOLDEN_CASES: GoldenCase[] = [
  {
    id: "fixture-gl-pass",
    label: "GL $1M/$2M with dates",
    fields: [
      { path: "policies.0.expiration_date", expected: "2027-01-01" },
      { path: "policies.0.limits.each_occurrence", expected: 1_000_000 },
      { path: "policies.0.limits.general_aggregate", expected: 2_000_000 },
      { path: "insured.name", expected: "Acme Roofing LLC" },
    ],
    actual: {
      "policies.0.expiration_date": "2027-01-01",
      "policies.0.limits.each_occurrence": 1_000_000,
      "policies.0.limits.general_aggregate": 2_000_000,
      "insured.name": "Acme Roofing LLC",
    },
  },
  {
    id: "fixture-wc-pass",
    label: "WC + GL dates",
    fields: [
      { path: "policies.0.expiration_date", expected: "2026-12-31" },
      { path: "policies.1.expiration_date", expected: "2026-12-31" },
      { path: "policies.0.limits.each_occurrence", expected: 1_000_000 },
      { path: "insurers.0.naic", expected: "25674" },
    ],
    actual: {
      "policies.0.expiration_date": "2026-12-31",
      "policies.1.expiration_date": "2026-12-31",
      "policies.0.limits.each_occurrence": 1_000_000,
      "insurers.0.naic": "25674",
    },
  },
  {
    id: "fixture-currency-normalize",
    label: "Limit formatting normalize",
    fields: [
      { path: "policies.0.limits.each_occurrence", expected: 1000000 },
      { path: "policies.0.expiration_date", expected: "2027-06-15" },
    ],
    actual: {
      "policies.0.limits.each_occurrence": 1_000_000,
      "policies.0.expiration_date": "2027-06-15",
    },
  },
];
