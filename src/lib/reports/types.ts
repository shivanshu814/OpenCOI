import type { VendorStatus } from "@/lib/data/types";
import type { Verdict } from "@/lib/requirements/engine";

export type ReportCheckLine = {
  rule_id: string;
  label: string;
  verdict: Verdict;
  reason: string;
  ask_agent: string | null;
};

export type ComplianceReport = {
  brand: "CertShield";
  generated_at: string;
  org_name: string;
  vendor: {
    id: string;
    name: string;
    trade: string | null;
    email: string | null;
    status: VendorStatus;
  };
  document: {
    id: string;
    file_name: string;
    status: string;
    overall_verdict: Verdict | null;
  } | null;
  summary: string;
  lines: ReportCheckLine[];
  gaps: ReportCheckLine[];
  ask_agent: string[];
  disclaimer: string;
  /** Soft CTA — free-audit / sales weapon (docs/03). */
  cta: string;
};

/** D3 / P10 — monthly branded owner report (PDF + email). */
export type OwnerReportVendorLine = {
  id: string;
  name: string;
  trade: string | null;
  status: VendorStatus;
  documents_on_file: number;
};

export type OwnerReport = {
  brand: "CertShield";
  generated_at: string;
  period_label: string;
  org_name: string;
  property: {
    id: string;
    name: string;
    address: string | null;
    owner_llc_names: string[];
    certificate_holder_name: string | null;
  };
  compliance_percent: number;
  vendor_count: number;
  documents_on_file: number;
  /**
   * Spec D3 "incidents avoided" — operational proxy only:
   * vendors flagged non-compliant / missing docs / in review (not claim outcomes).
   */
  risks_flagged: number;
  expiring_count: number;
  by_status: Record<VendorStatus, number>;
  vendors: OwnerReportVendorLine[];
  summary: string;
  disclaimer: string;
  honesty_note: string;
};
