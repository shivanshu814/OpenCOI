import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACORD_GOLDEN_CORPUS,
  FIXTURE_GOLDEN_CASES,
  MONTH3_ACCURACY_GATE,
  casesFromCorrectionRows,
  isMonth3GateField,
  scoreGoldenSet,
} from "./accuracy";

describe("golden-set accuracy harness", () => {
  it("scores ACORD corpus dates/limits at ≥98% (Month 3 SCALE gate)", () => {
    const result = scoreGoldenSet(ACORD_GOLDEN_CORPUS, {
      datesAndLimitsOnly: true,
    });
    assert.ok(result.total >= 50, `expected ≥50 date/limit fields, got ${result.total}`);
    assert.ok(
      result.accuracy >= MONTH3_ACCURACY_GATE,
      `accuracy ${result.accuracy} (${result.matched}/${result.total}) below gate ${MONTH3_ACCURACY_GATE}; failures=${JSON.stringify(result.failures)}`,
    );
    // Honest corpus: at least one intentional OCR near-miss
    assert.ok(
      result.failures.some((f) => f.caseId === "acord-ocr-expiry-near-miss"),
      "expected OCR near-miss to count as a failure",
    );
  });

  it("exports FIXTURE_GOLDEN_CASES as the ACORD corpus", () => {
    assert.equal(FIXTURE_GOLDEN_CASES.length, ACORD_GOLDEN_CORPUS.length);
    assert.ok(FIXTURE_GOLDEN_CASES.length >= 12);
  });

  it("reports failures when fields diverge", () => {
    const result = scoreGoldenSet([
      {
        id: "bad",
        label: "mismatch",
        fields: [{ path: "insured.name", expected: "A" }],
        actual: { "insured.name": "B" },
      },
    ]);
    assert.equal(result.matched, 0);
    assert.equal(result.failures.length, 1);
  });

  it("classifies Month 3 gate field paths", () => {
    assert.equal(isMonth3GateField("policies.0.expiration_date"), true);
    assert.equal(isMonth3GateField("policies.0.limits.each_occurrence"), true);
    assert.equal(isMonth3GateField("document.issue_date"), true);
    assert.equal(isMonth3GateField("insured.name"), false);
    assert.equal(isMonth3GateField("insurers.0.naic"), false);
  });

  it("builds cases from golden_set_cases correction rows", () => {
    const cases = casesFromCorrectionRows([
      {
        id: "row-1",
        document_id: "doc-1",
        field_path: "policies.0.expiration_date",
        before_value: "2027-01-07",
        after_value: "2027-01-01",
      },
    ]);
    const result = scoreGoldenSet(cases, { datesAndLimitsOnly: true });
    assert.equal(result.total, 1);
    assert.equal(result.matched, 0);
    assert.equal(result.failures[0]?.expected, "2027-01-01");
    assert.equal(result.failures[0]?.actual, "2027-01-07");
  });

  it("normalizes currency strings on limits", () => {
    const result = scoreGoldenSet(
      [
        {
          id: "cur",
          label: "currency",
          fields: [
            { path: "policies.0.limits.each_occurrence", expected: 1000000 },
          ],
          actual: { "policies.0.limits.each_occurrence": "$1,000,000" },
        },
      ],
      { datesAndLimitsOnly: true },
    );
    assert.equal(result.accuracy, 1);
  });
});
