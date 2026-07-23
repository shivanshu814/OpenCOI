import type { Extraction } from "@/lib/extraction/schema";
import type { CheckLine, Verdict } from "@/lib/requirements/engine";

export type VendorStatus =
  | "compliant"
  | "expiring"
  | "non_compliant"
  | "missing_docs"
  | "in_review";

export type DocumentPipelineStatus =
  | "uploaded"
  | "extracted"
  | "checked"
  | "in_internal_review"
  | "published"
  | "accepted"
  | "overridden"
  | "disputed";

export type Vendor = {
  id: string;
  org_id?: string;
  name: string;
  email: string | null;
  trade: string | null;
  status: VendorStatus;
};

export type CustomerDecision = "accepted" | "overridden" | "disputed";

export type DocumentRow = {
  id: string;
  org_id?: string;
  vendor_id: string;
  file_name: string;
  storage_path?: string | null;
  status: DocumentPipelineStatus;
  extraction: Extraction | null;
  check_lines: CheckLine[];
  overall_verdict: Verdict | null;
  customer_decision?: CustomerDecision | null;
  customer_decision_reason?: string | null;
  /** B7 risk signals — never presented as a guarantee. */
  fraud_signals?: {
    code: string;
    severity: string;
    message: string;
  }[];
};

export function dashboardCounts(vendors: Vendor[]) {
  return {
    compliant: vendors.filter((v) => v.status === "compliant").length,
    expiring: vendors.filter((v) => v.status === "expiring").length,
    non_compliant: vendors.filter((v) => v.status === "non_compliant").length,
    missing_docs: vendors.filter((v) => v.status === "missing_docs").length,
    in_review: vendors.filter((v) => v.status === "in_review").length,
  };
}

export function vendorStatusFromVerdict(verdict: Verdict): VendorStatus {
  switch (verdict) {
    case "PASS":
      return "compliant";
    case "EXPIRING":
      return "expiring";
    case "FAIL":
      return "non_compliant";
    case "MISSING":
      return "missing_docs";
  }
}
