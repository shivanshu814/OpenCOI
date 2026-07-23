import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  portfolioComplianceScore,
  propertyCompliancePercent,
  vendorComplianceScore,
} from "./compute";

describe("C6 compliance scores", () => {
  it("maps statuses to scores", () => {
    assert.equal(vendorComplianceScore("compliant"), 100);
    assert.equal(vendorComplianceScore("non_compliant"), 0);
    assert.equal(vendorComplianceScore("expiring"), 70);
  });

  it("averages portfolio", () => {
    const p = portfolioComplianceScore([
      { status: "compliant" },
      { status: "non_compliant" },
    ]);
    assert.equal(p.score, 50);
    assert.equal(p.counted, 2);
  });

  it("property percent counts compliant+expiring", () => {
    assert.equal(
      propertyCompliancePercent(["compliant", "expiring", "missing_docs"]),
      67,
    );
  });
});
