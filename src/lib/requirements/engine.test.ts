import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Extraction } from "../extraction/schema";
import {
  DEFAULT_GLOBAL_RULES,
  runRequirementsEngine,
  type RequirementRule,
} from "./engine";

function baseExtraction(
  overrides: Partial<Extraction> = {},
): Extraction {
  return {
    document: { type: "acord_25", issue_date: "2026-01-15", confidence: 0.95 },
    producer: {
      name: "Agency",
      contact_name: null,
      email: null,
      phone: null,
      confidence: 0.9,
    },
    insured: { name: "Vendor LLC", address: null, confidence: 0.95 },
    insurers: [
      {
        letter: "A",
        name: "Travelers Indemnity",
        naic: "25674",
        confidence: 0.9,
      },
    ],
    policies: [
      {
        line: "general_liability",
        insurer_letter: "A",
        policy_number: "GL-1",
        effective_date: "2026-01-01",
        expiration_date: "2027-01-01",
        limits: [
          { name: "each_occurrence", amount: 1_000_000, confidence: 0.95 },
          { name: "general_aggregate", amount: 2_000_000, confidence: 0.95 },
        ],
        checkboxes: {
          additional_insured: false,
          waiver_of_subrogation: false,
          confidence: 0.95,
        },
        confidence: 0.95,
      },
    ],
    certificate_holder: { name: "Holder", address: null, confidence: 0.9 },
    description_of_operations: {
      text: null,
      mentions_additional_insured: false,
      mentions_primary_noncontributory: false,
      mentions_waiver_of_subrogation: false,
      confidence: 0.9,
    },
    endorsement_forms_detected: [],
    extraction_meta: {
      model_version: "test",
      prompt_version: "v0.1.0",
      overall_confidence: 0.9,
      low_confidence_paths: [],
      cost_usd: 0,
      latency_ms: 1,
    },
    ...overrides,
  };
}

function line(
  result: ReturnType<typeof runRequirementsEngine>,
  ruleId: string,
) {
  const found = result.lines.find((l) => l.rule_id === ruleId);
  assert.ok(found, `missing rule ${ruleId}`);
  return found;
}

describe("B4 endorsement checks", () => {
  it("fails when AI checkbox is checked but CG 20 10 PDF is missing", () => {
    const extraction = baseExtraction({
      policies: [
        {
          ...baseExtraction().policies[0]!,
          checkboxes: {
            additional_insured: true,
            waiver_of_subrogation: false,
            confidence: 0.95,
          },
        },
      ],
    });
    const result = runRequirementsEngine(extraction, [
      {
        id: "gl_ai_cg_20_10",
        line: "general_liability",
        require_endorsement: "CG_20_10",
        label: "CG 20 10",
      },
    ]);
    const check = line(result, "gl_ai_cg_20_10");
    assert.equal(check.verdict, "FAIL");
    assert.match(check.reason, /claims additional insured/);
    assert.match(check.reason, /CG 20 10/);
  });

  it("passes CG 20 10 when endorsement PDF matches named insured", () => {
    const extraction = baseExtraction({
      endorsement_forms_detected: [
        {
          form: "CG_20_10",
          edition_date: "12/19",
          named_insured_match: true,
          confidence: 0.92,
        },
      ],
    });
    const result = runRequirementsEngine(extraction, [
      {
        id: "gl_ai_cg_20_10",
        line: "general_liability",
        require_endorsement: "CG_20_10",
        label: "CG 20 10",
      },
    ]);
    assert.equal(line(result, "gl_ai_cg_20_10").verdict, "PASS");
  });

  it("fails when named_insured_match is false", () => {
    const extraction = baseExtraction({
      endorsement_forms_detected: [
        {
          form: "CG_20_37",
          edition_date: "12/19",
          named_insured_match: false,
          confidence: 0.95,
        },
      ],
    });
    const result = runRequirementsEngine(extraction, [
      {
        id: "gl_ai_cg_20_37",
        line: "general_liability",
        require_endorsement: "CG_20_37",
        label: "CG 20 37",
      },
    ]);
    const check = line(result, "gl_ai_cg_20_37");
    assert.equal(check.verdict, "FAIL");
    assert.match(check.reason, /named insured/);
  });

  it("requires CG 24 04 PDF — checkbox alone is not enough", () => {
    const extraction = baseExtraction({
      policies: [
        {
          ...baseExtraction().policies[0]!,
          checkboxes: {
            additional_insured: false,
            waiver_of_subrogation: true,
            confidence: 0.95,
          },
        },
      ],
    });
    const result = runRequirementsEngine(extraction, [
      {
        id: "gl_waiver",
        line: "general_liability",
        require_endorsement: "CG_24_04",
        label: "Waiver",
      },
    ]);
    const check = line(result, "gl_waiver");
    assert.equal(check.verdict, "FAIL");
    assert.match(check.reason, /claims waiver/);
  });

  it("fails primary & non-contributory when wording missing", () => {
    const result = runRequirementsEngine(baseExtraction(), [
      {
        id: "gl_primary_noncontributory",
        line: "general_liability",
        require_primary_noncontributory: true,
        label: "PNC",
      },
    ]);
    assert.equal(line(result, "gl_primary_noncontributory").verdict, "FAIL");
  });

  it("passes primary & non-contributory when description mentions it", () => {
    const extraction = baseExtraction({
      description_of_operations: {
        text: "Coverage is primary and non-contributory.",
        mentions_additional_insured: false,
        mentions_primary_noncontributory: true,
        mentions_waiver_of_subrogation: false,
        confidence: 0.93,
      },
    });
    const result = runRequirementsEngine(extraction, [
      {
        id: "gl_primary_noncontributory",
        line: "general_liability",
        require_primary_noncontributory: true,
        label: "PNC",
      },
    ]);
    assert.equal(line(result, "gl_primary_noncontributory").verdict, "PASS");
  });

  it("default global rules include B4 wedge forms and B6 carrier floor", () => {
    const ids = DEFAULT_GLOBAL_RULES.map((r: RequirementRule) => r.id);
    assert.ok(ids.includes("gl_ai_cg_20_10"));
    assert.ok(ids.includes("gl_ai_cg_20_37"));
    assert.ok(ids.includes("gl_waiver"));
    assert.ok(ids.includes("gl_primary_noncontributory"));
    assert.ok(ids.includes("carrier_am_best"));
  });

  it("B6 passes when NAIC maps to A+ above floor", () => {
    const result = runRequirementsEngine(baseExtraction(), [
      {
        id: "carrier_am_best",
        line: "general_liability",
        min_am_best_rating: "A-",
        label: "Carrier AM Best ≥ A-",
      },
    ]);
    assert.equal(line(result, "carrier_am_best").verdict, "PASS");
  });

  it("overall is FAIL when any endorsement line fails", () => {
    const result = runRequirementsEngine(baseExtraction());
    assert.equal(result.overall, "FAIL");
    assert.equal(result.needs_internal_review, true);
  });
});
