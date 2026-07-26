import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Extraction } from "../extraction/schema";
import {
  DEFAULT_GLOBAL_RULES,
  evaluatePropertyValidation,
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

describe("expiration is a separate check line (roofer-sample false MISSING)", () => {
  const glRule: RequirementRule = {
    id: "gl_each_occ",
    line: "general_liability",
    limit_name: "each_occurrence",
    min_amount: 1_000_000,
    check_expiration: true,
    label: "GL each-occurrence ≥ $1M",
  };

  function withExpiration(expiration_date: string | null) {
    return baseExtraction({
      policies: [{ ...baseExtraction().policies[0]!, expiration_date }],
    });
  }

  it("US-format expiration (01/01/2099) still computes — limit passes AND expiration passes", () => {
    const result = runRequirementsEngine(withExpiration("01/01/2099"), [glRule]);
    assert.equal(line(result, "gl_each_occ").verdict, "PASS");
    assert.equal(line(result, "gl_each_occ").reason, "Meets requirement.");
    assert.equal(line(result, "gl_each_occ_expiration").verdict, "PASS");
  });

  it("missing expiration → separate MISSING line; the $1M limit row keeps its own PASS verdict", () => {
    const result = runRequirementsEngine(withExpiration(null), [glRule]);
    const limit = line(result, "gl_each_occ");
    assert.equal(limit.verdict, "PASS");
    assert.ok(!limit.reason.toLowerCase().includes("expiration"));
    const exp = line(result, "gl_each_occ_expiration");
    assert.equal(exp.verdict, "MISSING");
    assert.equal(exp.low_confidence, true);
    assert.match(exp.reason, /Expiration date missing/);
    assert.equal(result.overall, "MISSING");
  });

  it("expired policy → separate FAIL line", () => {
    const result = runRequirementsEngine(withExpiration("2020-01-01"), [glRule]);
    assert.equal(line(result, "gl_each_occ").verdict, "PASS");
    assert.equal(line(result, "gl_each_occ_expiration").verdict, "FAIL");
    assert.equal(result.overall, "FAIL");
  });

  it("expiration is evaluated even when the limit FAILs (no short-circuit)", () => {
    const low = baseExtraction({
      policies: [
        {
          ...baseExtraction().policies[0]!,
          expiration_date: "2020-01-01",
          limits: [
            { name: "each_occurrence", amount: 500_000, confidence: 0.95 },
          ],
        },
      ],
    });
    const result = runRequirementsEngine(low, [glRule]);
    assert.equal(line(result, "gl_each_occ").verdict, "FAIL");
    assert.equal(line(result, "gl_each_occ_expiration").verdict, "FAIL");
  });

  it("no expiration line when the policy itself is missing", () => {
    const none = baseExtraction({ policies: [] });
    const result = runRequirementsEngine(none, [glRule]);
    assert.equal(line(result, "gl_each_occ").verdict, "MISSING");
    assert.ok(!result.lines.some((l) => l.rule_id === "gl_each_occ_expiration"));
  });
});

describe("D1 per-property certificate-holder + AI wording validation", () => {
  it("PASS when extracted holder fuzzy-matches the property holder", () => {
    const ex = baseExtraction({
      certificate_holder: {
        name: "City of Springfield",
        address: null,
        confidence: 0.95,
      },
    });
    const lines = evaluatePropertyValidation(ex, {
      certificate_holder_name: "City of Springfield, Its Officers",
    });
    const l = lines.find((x) => x.rule_id === "property_certificate_holder");
    assert.ok(l);
    assert.equal(l.verdict, "PASS");
  });

  it("FAIL when the cert names a different holder than the property", () => {
    const ex = baseExtraction({
      certificate_holder: {
        name: "Acme Property Management",
        address: null,
        confidence: 0.95,
      },
    });
    const lines = evaluatePropertyValidation(ex, {
      certificate_holder_name: "City of Springfield",
    });
    const l = lines.find((x) => x.rule_id === "property_certificate_holder");
    assert.ok(l);
    assert.equal(l.verdict, "FAIL");
  });

  it("MISSING when the cert has no holder but the property requires one", () => {
    const ex = baseExtraction({
      certificate_holder: { name: null, address: null, confidence: 0.5 },
    });
    const lines = evaluatePropertyValidation(ex, {
      certificate_holder_name: "City of Springfield",
    });
    const l = lines.find((x) => x.rule_id === "property_certificate_holder");
    assert.ok(l);
    assert.equal(l.verdict, "MISSING");
  });

  it("AI wording: PASS when required wording is present in description", () => {
    const ex = baseExtraction({
      description_of_operations: {
        text: "City of Springfield is named as additional insured per contract.",
        mentions_additional_insured: true,
        mentions_primary_noncontributory: false,
        mentions_waiver_of_subrogation: false,
        confidence: 0.95,
      },
    });
    const lines = evaluatePropertyValidation(ex, {
      additional_insured_wording: "City of Springfield is named as additional insured",
    });
    const l = lines.find(
      (x) => x.rule_id === "property_additional_insured_wording",
    );
    assert.ok(l);
    assert.equal(l.verdict, "PASS");
  });

  it("AI wording: MISSING (review) when AI mentioned but exact wording unconfirmed", () => {
    const ex = baseExtraction({
      description_of_operations: {
        text: "Additional insured status applies.",
        mentions_additional_insured: true,
        mentions_primary_noncontributory: false,
        mentions_waiver_of_subrogation: false,
        confidence: 0.9,
      },
    });
    const lines = evaluatePropertyValidation(ex, {
      additional_insured_wording: "City of Springfield, its officers and employees",
    });
    const l = lines.find(
      (x) => x.rule_id === "property_additional_insured_wording",
    );
    assert.ok(l);
    assert.equal(l.verdict, "MISSING");
  });

  it("AI wording: FAIL when no additional insured mentioned at all", () => {
    const lines = evaluatePropertyValidation(baseExtraction(), {
      additional_insured_wording: "City of Springfield",
    });
    const l = lines.find(
      (x) => x.rule_id === "property_additional_insured_wording",
    );
    assert.ok(l);
    assert.equal(l.verdict, "FAIL");
  });

  it("no property validation lines emitted when neither field configured", () => {
    assert.equal(evaluatePropertyValidation(baseExtraction(), {}).length, 0);
  });

  it("property validation escalates overall verdict via runRequirementsEngine", () => {
    const ex = baseExtraction({
      certificate_holder: {
        name: "Wrong Holder",
        address: null,
        confidence: 0.95,
      },
    });
    const result = runRequirementsEngine(ex, DEFAULT_GLOBAL_RULES, {
      certificate_holder_name: "City of Springfield",
    });
    assert.ok(
      result.lines.some(
        (l) => l.rule_id === "property_certificate_holder" && l.verdict === "FAIL",
      ),
    );
    assert.equal(result.overall, "FAIL");
  });
});
