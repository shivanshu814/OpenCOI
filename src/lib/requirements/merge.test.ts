import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RequirementRule } from "./engine";
import { mergeRequirementRules } from "./merge";

describe("mergeRequirementRules", () => {
  const base: RequirementRule = {
    id: "gl_each_occ",
    line: "general_liability",
    limit_name: "each_occurrence",
    min_amount: 1_000_000,
    label: "GL $1M",
  };

  it("lets property overrides win over global", () => {
    const merged = mergeRequirementRules({
      global: [base],
      trade: [],
      property: [{ ...base, min_amount: 2_000_000, label: "GL $2M property" }],
    });
    const rule = merged.find((r) => r.id === "gl_each_occ");
    assert.equal(rule?.min_amount, 2_000_000);
    assert.equal(rule?.label, "GL $2M property");
  });

  it("adds trade-only rules", () => {
    const wc: RequirementRule = {
      id: "wc_each",
      line: "workers_comp",
      limit_name: "each_accident",
      min_amount: 1_000_000,
      label: "WC",
    };
    const merged = mergeRequirementRules({
      global: [base],
      trade: [wc],
      property: [],
    });
    assert.ok(merged.some((r) => r.id === "wc_each"));
  });

  it("lets project overrides win over property (D2)", () => {
    const merged = mergeRequirementRules({
      global: [base],
      trade: [],
      property: [{ ...base, min_amount: 2_000_000, label: "GL $2M property" }],
      project: [{ ...base, min_amount: 5_000_000, label: "GL $5M project" }],
    });
    const rule = merged.find((r) => r.id === "gl_each_occ");
    assert.equal(rule?.min_amount, 5_000_000);
    assert.equal(rule?.label, "GL $5M project");
  });
});
