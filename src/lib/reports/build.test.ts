import type { Extraction } from "@/lib/extraction/schema";
import { runRequirementsEngine } from "@/lib/requirements/engine";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  askAgentForLine,
  buildComplianceReport,
  buildSummary,
} from "./build";
import { renderComplianceReportPdf, reportFilename } from "./pdf";

const sample: Extraction = {
  document: { type: "acord_25", issue_date: "2026-01-15", confidence: 0.96 },
  producer: {
    name: "Harbor Insurance Agency",
    contact_name: "Maria Lopez",
    email: "maria@harborins.example",
    phone: "305-555-0142",
    confidence: 0.94,
  },
  insured: {
    name: "Sunshine Roofing LLC",
    address: "1200 Brickell Ave, Miami, FL",
    confidence: 0.97,
  },
  insurers: [
    { letter: "A", name: "Example Mutual", naic: "12345", confidence: 0.95 },
  ],
  policies: [
    {
      line: "general_liability",
      insurer_letter: "A",
      policy_number: "GL-998877",
      effective_date: "2026-01-01",
      expiration_date: "2026-08-15",
      limits: [
        { name: "each_occurrence", amount: 1_000_000, confidence: 0.98 },
        { name: "general_aggregate", amount: 2_000_000, confidence: 0.97 },
      ],
      checkboxes: {
        additional_insured: true,
        waiver_of_subrogation: false,
        confidence: 0.88,
      },
      confidence: 0.95,
    },
  ],
  certificate_holder: {
    name: "Demo Property Management LLC",
    address: null,
    confidence: 0.93,
  },
  description_of_operations: {
    text: "Roofing operations.",
    mentions_additional_insured: true,
    mentions_primary_noncontributory: false,
    mentions_waiver_of_subrogation: false,
    confidence: 0.9,
  },
  endorsement_forms_detected: [
    {
      form: "CG_20_10",
      edition_date: "12/19",
      named_insured_match: true,
      confidence: 0.91,
    },
  ],
  extraction_meta: {
    model_version: "claude-demo",
    prompt_version: "v0.1.0",
    overall_confidence: 0.93,
    low_confidence_paths: [],
    cost_usd: 0.12,
    latency_ms: 4200,
  },
};

describe("compliance report build", () => {
  it("maps endorsement gaps to ask-agent copy", () => {
    const checks = runRequirementsEngine(sample);
    const waiver = checks.lines.find((l) => l.rule_id === "gl_waiver");
    assert.ok(waiver);
    assert.notEqual(waiver.verdict, "PASS");
    const ask = askAgentForLine(waiver);
    assert.ok(ask?.includes("CG 24 04"));
  });

  it("builds summary + gaps + disclaimer + CTA", () => {
    const checks = runRequirementsEngine(sample);
    const report = buildComplianceReport({
      orgName: "Demo PM",
      vendor: {
        id: "v_roof",
        name: "Sunshine Roofing LLC",
        trade: "Roofer",
        email: "office@example.com",
        status: "in_review",
      },
      document: {
        id: "doc_1",
        file_name: "coi.pdf",
        status: "in_internal_review",
        overall_verdict: checks.overall,
      },
      checkLines: checks.lines,
      generatedAt: new Date("2026-07-23T12:00:00Z"),
    });

    assert.equal(report.brand, "CertShield");
    assert.ok(report.gaps.length > 0);
    assert.ok(report.ask_agent.length > 0);
    assert.match(report.summary, /Sunshine Roofing/);
    assert.match(
      report.disclaimer,
      /not legal, insurance, or professional advice/i,
    );
    assert.match(report.cta, /\$99/);
    assert.equal(
      buildSummary({
        vendorName: "X",
        status: "compliant",
        overall: "PASS",
        gapCount: 0,
        passCount: 6,
      }),
      "X: all checked requirement lines pass. Status: compliant.",
    );
  });
});

describe("compliance report PDF", () => {
  it("renders a non-empty PDF with disclaimer bytes", async () => {
    const checks = runRequirementsEngine(sample);
    const report = buildComplianceReport({
      orgName: "Demo PM",
      vendor: {
        id: "v_roof",
        name: "Sunshine Roofing LLC",
        trade: "Roofer",
        email: "office@example.com",
        status: "in_review",
      },
      document: {
        id: "doc_1",
        file_name: "coi.pdf",
        status: "in_internal_review",
        overall_verdict: checks.overall,
      },
      checkLines: checks.lines,
      generatedAt: new Date("2026-07-23T12:00:00Z"),
    });

    const bytes = await renderComplianceReportPdf(report);
    assert.ok(bytes.byteLength > 500);
    const head = Buffer.from(bytes.slice(0, 5)).toString("utf8");
    assert.equal(head, "%PDF-");
    assert.match(reportFilename(report), /certshield-compliance-sunshine/);
  });
});
