import type { DocumentPipelineStatus, VendorStatus } from "@/lib/data/types";
import { vendorStatusFromVerdict } from "@/lib/data/types";
import type { Extraction } from "@/lib/extraction/schema";
import {
  runRequirementsEngine,
  type CheckLine,
  type Verdict,
} from "@/lib/requirements/engine";
import {
  resolveCustomerDecision,
  type OverrideReasonCode,
} from "@/lib/verdicts/customer-decision";

export type { VendorStatus };

export type DemoVendor = {
  id: string;
  name: string;
  email: string;
  trade: string;
  status: VendorStatus;
};

export type DemoDocument = {
  id: string;
  vendor_id: string;
  file_name: string;
  status: DocumentPipelineStatus;
  extraction: Extraction | null;
  check_lines: CheckLine[];
  overall_verdict: Verdict | null;
  customer_decision?: "accepted" | "overridden" | "disputed" | null;
  customer_decision_reason?: string | null;
};

const sampleExtraction: Extraction = {
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
    text: "Roofing operations at managed properties.",
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
    low_confidence_paths: ["policies[0].checkboxes"],
    cost_usd: 0.12,
    latency_ms: 4200,
  },
};

export const DEMO_VENDORS: DemoVendor[] = [
  {
    id: "v_roof",
    name: "Sunshine Roofing LLC",
    email: "office@sunshineroof.example",
    trade: "Roofer",
    status: "in_review",
  },
  {
    id: "v_land",
    name: "GreenPath Landscaping",
    email: "ops@greenpath.example",
    trade: "Landscaper",
    status: "expiring",
  },
  {
    id: "v_plumb",
    name: "Bay Plumbing Co",
    email: "jobs@bayplumb.example",
    trade: "Plumber",
    status: "missing_docs",
  },
];

const demoChecks = runRequirementsEngine(sampleExtraction);

export const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    id: "doc_demo_1",
    vendor_id: "v_roof",
    file_name: "sunshine-roofing-coi.pdf",
    status: "in_internal_review",
    extraction: sampleExtraction,
    check_lines: demoChecks.lines,
    overall_verdict: demoChecks.overall,
    customer_decision: null,
    customer_decision_reason: null,
  },
];

export function getDemoDocument(id: string) {
  return DEMO_DOCUMENTS.find((d) => d.id === id) ?? null;
}

/** Demo: founder Approve & publish. */
export function demoAcceptPublish(id: string) {
  const doc = getDemoDocument(id);
  if (!doc) throw new Error("Not found");
  if (doc.status !== "in_internal_review") {
    throw new Error(`Cannot publish from status ${doc.status}`);
  }
  doc.status = "published";
  const vendor = DEMO_VENDORS.find((v) => v.id === doc.vendor_id);
  if (vendor && doc.overall_verdict) {
    vendor.status = vendorStatusFromVerdict(doc.overall_verdict);
  }
  return { status: doc.status as DocumentPipelineStatus };
}

type DecideBody =
  | { action: "accept" }
  | {
    action: "override";
    reason_code: OverrideReasonCode;
    reason_text?: string;
  };

/** Demo: customer accept / override / dispute. */
export function demoCustomerDecide(id: string, body: DecideBody) {
  const doc = getDemoDocument(id);
  if (!doc) throw new Error("Not found");
  if (doc.status !== "published") {
    throw new Error(`Cannot decide from status ${doc.status}`);
  }
  if (doc.customer_decision) {
    throw new Error("Customer decision already recorded");
  }
  if (!doc.overall_verdict) {
    throw new Error("No verdict");
  }

  const resolved = resolveCustomerDecision(
    body.action === "accept"
      ? { action: "accept" }
      : {
        action: "override",
        reason_code: body.reason_code,
        reason_text: body.reason_text,
      },
    doc.overall_verdict,
  );

  doc.customer_decision = resolved.customer_decision;
  doc.customer_decision_reason = resolved.reason;
  doc.status = resolved.document_status;

  const vendor = DEMO_VENDORS.find((v) => v.id === doc.vendor_id);
  if (vendor) vendor.status = resolved.vendor_status;

  return {
    status: resolved.document_status,
    customer_decision: resolved.customer_decision,
    reason: resolved.reason,
    vendor_status: resolved.vendor_status,
    routes_to_internal_review: resolved.routes_to_internal_review,
  };
}

/** Re-export for callers that still import from demo/store. */
export { dashboardCounts } from "@/lib/data/types";
