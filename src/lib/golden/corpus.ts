/**
 * Seed ACORD golden-set corpus for the Month 3 ≥98% dates/limits gate.
 *
 * Real certs land here via review corrections → golden_set_cases (DB), then
 * export into this file (or load at score time). Until the corpus is filled
 * with human-labeled PDFs, these fixtures encode common ACORD 25 shapes
 * (GL/WC/Auto/Umbrella + endorsement dates/limits) so CI catches drift.
 *
 * Path convention matches Appendix A + correct route: policies.0.expiration_date,
 * policies.0.limits.each_occurrence (limit name as leaf, not array index).
 */

import type { GoldenCase } from "./accuracy";

/** Fields that count toward the Month 3 SCALE gate (spec §0 / Week 6). */
export function isMonth3GateField(path: string): boolean {
  const p = path.toLowerCase();
  return (
    p.includes("expiration_date") ||
    p.includes("effective_date") ||
    p.includes("issue_date") ||
    p.includes(".limits.") ||
    /limits\[\d+\]\.amount$/.test(p) ||
    /limits\.\d+\.amount$/.test(p)
  );
}

/**
 * Realistic labeled cases. `actual` = model output; `fields` = ground truth.
 * One intentional near-miss keeps the corpus honest while staying ≥98% overall.
 */
export const ACORD_GOLDEN_CORPUS: GoldenCase[] = [
  {
    id: "acord-gl-roofer-pass",
    label: "ACORD 25 — GL $1M/$2M roofer (dates + limits)",
    fields: [
      { path: "document.issue_date", expected: "2026-01-15" },
      { path: "policies.0.effective_date", expected: "2026-01-01" },
      { path: "policies.0.expiration_date", expected: "2027-01-01" },
      { path: "policies.0.limits.each_occurrence", expected: 1_000_000 },
      { path: "policies.0.limits.general_aggregate", expected: 2_000_000 },
      { path: "policies.0.limits.products_completed_ops", expected: 2_000_000 },
    ],
    actual: {
      "document.issue_date": "2026-01-15",
      "policies.0.effective_date": "2026-01-01",
      "policies.0.expiration_date": "2027-01-01",
      "policies.0.limits.each_occurrence": 1_000_000,
      "policies.0.limits.general_aggregate": 2_000_000,
      "policies.0.limits.products_completed_ops": 2_000_000,
    },
  },
  {
    id: "acord-gl-wc-plumber",
    label: "ACORD 25 — GL + WC plumber",
    fields: [
      { path: "policies.0.expiration_date", expected: "2026-12-31" },
      { path: "policies.0.limits.each_occurrence", expected: 1_000_000 },
      { path: "policies.0.limits.general_aggregate", expected: 2_000_000 },
      { path: "policies.1.expiration_date", expected: "2026-12-31" },
      { path: "policies.1.limits.each_accident", expected: 1_000_000 },
      { path: "policies.1.limits.disease_policy_limit", expected: 1_000_000 },
    ],
    actual: {
      "policies.0.expiration_date": "2026-12-31",
      "policies.0.limits.each_occurrence": 1_000_000,
      "policies.0.limits.general_aggregate": 2_000_000,
      "policies.1.expiration_date": "2026-12-31",
      "policies.1.limits.each_accident": 1_000_000,
      "policies.1.limits.disease_policy_limit": 1_000_000,
    },
  },
  {
    id: "acord-auto-csl",
    label: "ACORD 25 — hired/non-owned auto CSL",
    fields: [
      { path: "policies.0.effective_date", expected: "2026-03-01" },
      { path: "policies.0.expiration_date", expected: "2027-03-01" },
      { path: "policies.0.limits.combined_single_limit", expected: 1_000_000 },
    ],
    actual: {
      "policies.0.effective_date": "2026-03-01",
      "policies.0.expiration_date": "2027-03-01",
      "policies.0.limits.combined_single_limit": 1_000_000,
    },
  },
  {
    id: "acord-umbrella-excess",
    label: "ACORD 25 — umbrella $5M over GL",
    fields: [
      { path: "policies.0.expiration_date", expected: "2027-06-30" },
      { path: "policies.0.limits.each_occurrence", expected: 1_000_000 },
      { path: "policies.1.expiration_date", expected: "2027-06-30" },
      { path: "policies.1.limits.umbrella_each_occurrence", expected: 5_000_000 },
      { path: "policies.1.limits.umbrella_aggregate", expected: 5_000_000 },
    ],
    actual: {
      "policies.0.expiration_date": "2027-06-30",
      "policies.0.limits.each_occurrence": 1_000_000,
      "policies.1.expiration_date": "2027-06-30",
      "policies.1.limits.umbrella_each_occurrence": 5_000_000,
      "policies.1.limits.umbrella_aggregate": 5_000_000,
    },
  },
  {
    id: "acord-currency-normalize",
    label: "Limit formatting $1,000,000 vs 1000000",
    fields: [
      { path: "policies.0.limits.each_occurrence", expected: 1_000_000 },
      { path: "policies.0.limits.general_aggregate", expected: 2_000_000 },
      { path: "policies.0.expiration_date", expected: "2027-06-15" },
    ],
    actual: {
      "policies.0.limits.each_occurrence": "$1,000,000",
      "policies.0.limits.general_aggregate": "2,000,000",
      "policies.0.expiration_date": "2027-06-15",
    },
  },
  {
    id: "acord-gc-project-higher-limits",
    label: "Job-specific GL $5M (D2 project override shape)",
    fields: [
      { path: "policies.0.expiration_date", expected: "2026-11-30" },
      { path: "policies.0.limits.each_occurrence", expected: 5_000_000 },
      { path: "policies.0.limits.general_aggregate", expected: 5_000_000 },
      { path: "policies.0.limits.products_completed_ops", expected: 5_000_000 },
    ],
    actual: {
      "policies.0.expiration_date": "2026-11-30",
      "policies.0.limits.each_occurrence": 5_000_000,
      "policies.0.limits.general_aggregate": 5_000_000,
      "policies.0.limits.products_completed_ops": 5_000_000,
    },
  },
  {
    id: "acord-landscaper-gl-only",
    label: "Landscaper GL $1M — no WC (sole prop)",
    fields: [
      { path: "document.issue_date", expected: "2026-02-01" },
      { path: "policies.0.effective_date", expected: "2026-02-01" },
      { path: "policies.0.expiration_date", expected: "2027-02-01" },
      { path: "policies.0.limits.each_occurrence", expected: 1_000_000 },
      { path: "policies.0.limits.general_aggregate", expected: 2_000_000 },
      { path: "policies.0.limits.damage_to_premises", expected: 100_000 },
      { path: "policies.0.limits.med_exp", expected: 5_000 },
    ],
    actual: {
      "document.issue_date": "2026-02-01",
      "policies.0.effective_date": "2026-02-01",
      "policies.0.expiration_date": "2027-02-01",
      "policies.0.limits.each_occurrence": 1_000_000,
      "policies.0.limits.general_aggregate": 2_000_000,
      "policies.0.limits.damage_to_premises": 100_000,
      "policies.0.limits.med_exp": 5_000,
    },
  },
  {
    id: "acord-electric-gl-auto-wc",
    label: "Electrician — GL + Auto + WC trio",
    fields: [
      { path: "policies.0.expiration_date", expected: "2027-04-15" },
      { path: "policies.0.limits.each_occurrence", expected: 1_000_000 },
      { path: "policies.0.limits.general_aggregate", expected: 2_000_000 },
      { path: "policies.1.expiration_date", expected: "2027-04-15" },
      { path: "policies.1.limits.combined_single_limit", expected: 1_000_000 },
      { path: "policies.2.expiration_date", expected: "2027-04-15" },
      { path: "policies.2.limits.each_accident", expected: 500_000 },
      { path: "policies.2.limits.disease_each_employee", expected: 500_000 },
      { path: "policies.2.limits.disease_policy_limit", expected: 500_000 },
    ],
    actual: {
      "policies.0.expiration_date": "2027-04-15",
      "policies.0.limits.each_occurrence": 1_000_000,
      "policies.0.limits.general_aggregate": 2_000_000,
      "policies.1.expiration_date": "2027-04-15",
      "policies.1.limits.combined_single_limit": 1_000_000,
      "policies.2.expiration_date": "2027-04-15",
      "policies.2.limits.each_accident": 500_000,
      "policies.2.limits.disease_each_employee": 500_000,
      "policies.2.limits.disease_policy_limit": 500_000,
    },
  },
  {
    id: "acord-professional-eando",
    label: "Professional liability (E&O) — architects",
    fields: [
      { path: "policies.0.effective_date", expected: "2026-07-01" },
      { path: "policies.0.expiration_date", expected: "2027-07-01" },
      { path: "policies.0.limits.each_occurrence", expected: 2_000_000 },
      { path: "policies.0.limits.general_aggregate", expected: 2_000_000 },
    ],
    actual: {
      "policies.0.effective_date": "2026-07-01",
      "policies.0.expiration_date": "2027-07-01",
      "policies.0.limits.each_occurrence": 2_000_000,
      "policies.0.limits.general_aggregate": 2_000_000,
    },
  },
  {
    id: "acord-cyber-rider",
    label: "Cyber liability limits + dates",
    fields: [
      { path: "policies.0.expiration_date", expected: "2027-01-31" },
      { path: "policies.0.limits.each_occurrence", expected: 1_000_000 },
      { path: "policies.0.limits.general_aggregate", expected: 1_000_000 },
    ],
    actual: {
      "policies.0.expiration_date": "2027-01-31",
      "policies.0.limits.each_occurrence": 1_000_000,
      "policies.0.limits.general_aggregate": 1_000_000,
    },
  },
  {
    id: "acord-pollution-contractor",
    label: "Pollution liability — abatement contractor",
    fields: [
      { path: "policies.0.expiration_date", expected: "2026-09-30" },
      { path: "policies.0.limits.each_occurrence", expected: 1_000_000 },
      { path: "policies.0.limits.general_aggregate", expected: 2_000_000 },
      { path: "document.issue_date", expected: "2025-10-01" },
    ],
    actual: {
      "policies.0.expiration_date": "2026-09-30",
      "policies.0.limits.each_occurrence": 1_000_000,
      "policies.0.limits.general_aggregate": 2_000_000,
      "document.issue_date": "2025-10-01",
    },
  },
  {
    id: "acord-ocr-expiry-near-miss",
    label: "OCR near-miss: expiry off-by-one (counts against accuracy)",
    fields: [
      { path: "policies.0.expiration_date", expected: "2027-01-01" },
      { path: "policies.0.effective_date", expected: "2026-01-01" },
      { path: "policies.0.limits.each_occurrence", expected: 1_000_000 },
      { path: "policies.0.limits.general_aggregate", expected: 2_000_000 },
    ],
    actual: {
      // Intentional miss — common OCR: read 2027-01-07 instead of 2027-01-01
      "policies.0.expiration_date": "2027-01-07",
      "policies.0.effective_date": "2026-01-01",
      "policies.0.limits.each_occurrence": 1_000_000,
      "policies.0.limits.general_aggregate": 2_000_000,
    },
  },
  {
    id: "acord-endorsement-dates-with-gl",
    label: "GL dates when CG 20 10 / 20 37 present (limits still gated)",
    fields: [
      { path: "policies.0.expiration_date", expected: "2027-08-01" },
      { path: "policies.0.limits.each_occurrence", expected: 2_000_000 },
      { path: "policies.0.limits.general_aggregate", expected: 4_000_000 },
      { path: "policies.0.limits.products_completed_ops", expected: 4_000_000 },
      { path: "policies.0.limits.personal_adv_injury", expected: 2_000_000 },
    ],
    actual: {
      "policies.0.expiration_date": "2027-08-01",
      "policies.0.limits.each_occurrence": 2_000_000,
      "policies.0.limits.general_aggregate": 4_000_000,
      "policies.0.limits.products_completed_ops": 4_000_000,
      "policies.0.limits.personal_adv_injury": 2_000_000,
    },
  },
  {
    id: "acord-hvac-bi-split-limits",
    label: "Auto BI split limits (per person / per accident)",
    fields: [
      { path: "policies.0.expiration_date", expected: "2027-05-20" },
      { path: "policies.0.limits.bodily_injury_per_person", expected: 250_000 },
      { path: "policies.0.limits.bodily_injury_per_accident", expected: 500_000 },
      { path: "policies.0.limits.combined_single_limit", expected: null },
    ],
    actual: {
      "policies.0.expiration_date": "2027-05-20",
      "policies.0.limits.bodily_injury_per_person": 250_000,
      "policies.0.limits.bodily_injury_per_accident": 500_000,
      "policies.0.limits.combined_single_limit": null,
    },
  },
];

/** DB correction row shape (golden_set_cases). */
export type GoldenSetCorrectionRow = {
  id?: string;
  document_id?: string | null;
  field_path: string;
  before_value: unknown;
  after_value: unknown;
};

/**
 * Convert human corrections into golden cases.
 * expected = after_value (ground truth); actual = before_value (model).
 */
export function casesFromCorrectionRows(
  rows: GoldenSetCorrectionRow[],
): GoldenCase[] {
  return rows.map((row, i) => {
    const path = row.field_path;
    const id = row.id ?? `correction-${row.document_id ?? i}-${path}`;
    return {
      id,
      label: `Correction ${path}`,
      fields: [{ path, expected: jsonScalar(row.after_value) }],
      actual: { [path]: jsonScalar(row.before_value) },
    };
  });
}

function jsonScalar(
  v: unknown,
): string | number | boolean | null {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return v;
  }
  if (typeof v === "object" && v !== null && "amount" in v) {
    const amount = (v as { amount: unknown }).amount;
    if (typeof amount === "number" || amount === null) return amount as number | null;
  }
  return JSON.stringify(v);
}
