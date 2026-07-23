/**
 * Appendix B customer disposition after publish.
 * published → accepted | overridden(reason) | disputed → in_internal_review
 */

import type { DocumentPipelineStatus, VendorStatus } from "@/lib/data/types";
import { vendorStatusFromVerdict } from "@/lib/data/types";
import type { Verdict } from "@/lib/requirements/engine";

export const OVERRIDE_REASON_CODES = [
  "requirement_waived",
  "document_supersedes",
  "extraction_error_dispute",
  "other",
] as const;

export type OverrideReasonCode = (typeof OVERRIDE_REASON_CODES)[number];

export const OVERRIDE_REASON_LABELS: Record<OverrideReasonCode, string> = {
  requirement_waived: "Requirement waived for this vendor",
  document_supersedes: "Document supersedes",
  extraction_error_dispute: "Extraction error — dispute",
  other: "Other",
};

export type CustomerDecisionKind = "accepted" | "overridden" | "disputed";

export type ResolveCustomerDecisionInput =
  | { action: "accept" }
  | {
      action: "override";
      reason_code: OverrideReasonCode;
      reason_text?: string | null;
    };

export type ResolvedCustomerDecision = {
  customer_decision: CustomerDecisionKind;
  /** Human-readable reason stored on compliance_checks + audit */
  reason: string | null;
  /** Final document pipeline status after this action */
  document_status: DocumentPipelineStatus;
  /** Intermediate status when dispute routes through disputed → in_internal_review */
  intermediate_status: DocumentPipelineStatus | null;
  routes_to_internal_review: boolean;
  vendor_status: VendorStatus;
};

export function formatOverrideReason(
  code: OverrideReasonCode,
  otherText?: string | null,
): string {
  const label = OVERRIDE_REASON_LABELS[code];
  if (code === "other") {
    const text = otherText?.trim();
    if (!text) {
      throw new Error("Other override requires reason text");
    }
    return `${label}: ${text}`;
  }
  return label;
}

/**
 * Resolve accept/override into Appendix B statuses + vendor status side effects.
 */
export function resolveCustomerDecision(
  input: ResolveCustomerDecisionInput,
  overallVerdict: Verdict,
): ResolvedCustomerDecision {
  if (input.action === "accept") {
    return {
      customer_decision: "accepted",
      reason: null,
      document_status: "accepted",
      intermediate_status: null,
      routes_to_internal_review: false,
      vendor_status: vendorStatusFromVerdict(overallVerdict),
    };
  }

  const reason = formatOverrideReason(
    input.reason_code,
    input.reason_text,
  );

  if (input.reason_code === "extraction_error_dispute") {
    return {
      customer_decision: "disputed",
      reason,
      document_status: "in_internal_review",
      intermediate_status: "disputed",
      routes_to_internal_review: true,
      vendor_status: "in_review",
    };
  }

  // Waive → customer treats vendor as compliant despite FAIL/MISSING lines.
  const vendor_status: VendorStatus =
    input.reason_code === "requirement_waived"
      ? "compliant"
      : vendorStatusFromVerdict(overallVerdict);

  return {
    customer_decision: "overridden",
    reason,
    document_status: "overridden",
    intermediate_status: null,
    routes_to_internal_review: false,
    vendor_status,
  };
}

export function isOverrideReasonCode(v: unknown): v is OverrideReasonCode {
  return (
    typeof v === "string" &&
    (OVERRIDE_REASON_CODES as readonly string[]).includes(v)
  );
}
