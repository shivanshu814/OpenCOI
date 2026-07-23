import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE_GOLDEN_CASES,
  MONTH3_ACCURACY_GATE,
  scoreGoldenSet,
} from "./accuracy";

describe("golden-set accuracy harness", () => {
  it("scores fixture corpus at ≥98% (Week 6 / M3 gate scaffolding)", () => {
    const result = scoreGoldenSet(FIXTURE_GOLDEN_CASES);
    assert.equal(result.failures.length, 0);
    assert.ok(
      result.accuracy >= MONTH3_ACCURACY_GATE,
      `accuracy ${result.accuracy} below gate ${MONTH3_ACCURACY_GATE}`,
    );
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
});
