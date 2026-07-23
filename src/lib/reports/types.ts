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
