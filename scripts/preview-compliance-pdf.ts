/**
 * One-off: generate a sample compliance PDF for visual QA.
 * Usage: npx tsx scripts/preview-compliance-pdf.ts [/tmp/out.pdf]
 */
import { writeFileSync } from "node:fs";
import type { Extraction } from "@/lib/extraction/schema";
import { runRequirementsEngine } from "@/lib/requirements/engine";
import { buildComplianceReport } from "@/lib/reports/build";
import {
  renderComplianceReportPdf,
  reportFilename,
} from "@/lib/reports/pdf";

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

async function main() {
  const checks = runRequirementsEngine(sample);
  const report = buildComplianceReport({
    orgName: "Demo Property Management LLC",
    vendor: {
      id: "v_roof",
      name: "Sunshine Roofing LLC",
      trade: "Roofer",
      email: "office@example.com",
      status: "in_review",
    },
    document: {
      id: "doc_1",
      file_name: "coi-sunshine-roofing.pdf",
      status: "in_internal_review",
      overall_verdict: checks.overall,
    },
    checkLines: checks.lines,
    generatedAt: new Date("2026-07-26T12:00:00Z"),
  });
  const bytes = await renderComplianceReportPdf(report);
  const out = process.argv[2] ?? `/tmp/${reportFilename(report)}`;
  writeFileSync(out, bytes);
  console.log(out, bytes.byteLength, checks.overall);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
