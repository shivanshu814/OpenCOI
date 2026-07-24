import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACORD_GOLDEN_CORPUS,
  FIXTURE_GOLDEN_CASES,
  MONTH3_ACCURACY_GATE,
  casesFromCorrectionRows,
  isMonth3GateField,
  scoreCorrectionCorpus,
  scoreGoldenSet,
} from "./accuracy";

describe("golden-set accuracy harness", () => {
  // NOTE: this scores hand-authored fixtures whose `actual` values are seeded to
  // (mostly) match — it verifies the SCORER MECHANICS and guards against code
  // drift. It is NOT a measurement of real model accuracy, and does NOT satisfy
  // the Month 3 ≥98% production gate. That gate is measured only against real
  // human-labeled corrections (see scoreCorrectionCorpus + admin page).
  it("scorer runs over the fixture corpus on date/limit fields (harness self-check)", () => {
    const result = scoreGoldenSet(ACORD_GOLDEN_CORPUS, {
      datesAndLimitsOnly: true,
    });
    assert.ok(result.total >= 50, `expected ≥50 date/limit fields, got ${result.total}`);
    // Fixtures are seeded high so unrelated code changes that break scoring surface loudly.
    assert.ok(
      result.accuracy >= 0.9,
      `fixture harness scored ${result.accuracy} (${result.matched}/${result.total}); scorer likely broke; failures=${JSON.stringify(result.failures)}`,
    );
    // Honest corpus: at least one intentional OCR near-miss must count as a failure.
    assert.ok(
      result.failures.some((f) => f.caseId === "acord-ocr-expiry-near-miss"),
      "expected OCR near-miss to count as a failure",
    );
  });

  it("scores real corrections separately and reports 0 total when none exist (Month 3 gate stays honest)", () => {
    // No real labeled corrections yet → not measurable, never a fake pass.
    const empty = scoreCorrectionCorpus([]);
    assert.equal(empty.total, 0);
    assert.equal(empty.accuracy, 0);

    // With real corrections, the gate is measured only on gate fields.
    const scored = scoreCorrectionCorpus([
      {
        field_path: "policies.0.expiration_date",
        before_value: "2027-01-01",
        after_value: "2027-01-01",
      },
      {
        field_path: "insured.name",
        before_value: "Acme",
        after_value: "Acme LLC",
      },
    ]);
    // insured.name is not a gate field, so only the date counts.
    assert.equal(scored.total, 1);
    assert.ok(MONTH3_ACCURACY_GATE === 0.98);
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
