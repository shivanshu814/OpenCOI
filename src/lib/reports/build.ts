import type { VendorStatus } from "@/lib/data/types";
import { DISCLAIMER } from "@/lib/extraction/schema";
import type { CheckLine, Verdict } from "@/lib/requirements/engine";
import type { ComplianceReport, ReportCheckLine } from "./types";

const STATUS_LABEL: Record<VendorStatus, string> = {
  compliant: "compliant",
  expiring: "expiring within 30 days",
  non_compliant: "non-compliant",
  missing_docs: "missing required documents",
  in_review: "in internal review",
};

/** Map requirement gaps → plain-English asks for the vendor's insurance agent (B10). */
export function askAgentForLine(line: CheckLine): string | null {
  if (line.verdict === "PASS") return null;

  if (line.rule_id.endsWith("_expiration") && line.verdict === "MISSING") {
    return "Please issue a COI with clearly legible policy effective and expiration dates.";
  }

  switch (line.rule_id) {
    case "gl_each_occ":
      return "Please issue an updated COI showing General Liability each-occurrence limit of at least $1,000,000.";
    case "gl_agg":
      return "Please issue an updated COI showing General Liability general aggregate of at least $2,000,000.";
    case "gl_ai_cg_20_10":
      return "Please attach CG 20 10 (additional insured — ongoing operations) naming the certificate holder, and send the endorsement PDF with the COI.";
    case "gl_ai_cg_20_37":
      return "Please attach CG 20 37 (additional insured — completed operations) naming the certificate holder, and send the endorsement PDF with the COI.";
    case "gl_waiver":
      return "Please attach CG 24 04 (waiver of subrogation) and send the endorsement PDF with the COI.";
    case "gl_primary_noncontributory":
      return "Please add primary and non-contributory wording for the certificate holder on the COI / endorsement.";
    default:
      if (line.verdict === "EXPIRING") {
        return "Please send a renewal certificate of insurance before the current policy expires.";
      }
      if (line.reason.toLowerCase().includes("expired")) {
        return "Please send a current renewal certificate — the policy on file has expired.";
      }
      return `Please resolve: ${line.label} — ${line.reason}`;
  }
}

export function buildSummary(input: {
  vendorName: string;
  status: VendorStatus;
  overall: Verdict | null;
  gapCount: number;
  passCount: number;
}): string {
  const { vendorName, status, overall, gapCount, passCount } = input;
  if (!overall && gapCount === 0 && passCount === 0) {
    return `${vendorName}: no certificate on file yet — request a current ACORD 25 (and required endorsements) from their producer.`;
  }
  if (gapCount === 0) {
    return `${vendorName}: all checked requirement lines pass. Status: ${STATUS_LABEL[status]}.`;
  }
  const focus =
    overall === "EXPIRING"
      ? "expiration risk"
      : overall === "MISSING"
        ? "missing coverage or limits"
        : "requirement gaps";
  return `${vendorName}: ${gapCount} gap(s) flagged (${focus}). ${passCount} line(s) pass. Status: ${STATUS_LABEL[status]}.`;
}

export function buildComplianceReport(input: {
  orgName: string;
  brandColor?: string | null;
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
  checkLines: CheckLine[];
  generatedAt?: Date;
}): ComplianceReport {
  const lines: ReportCheckLine[] = input.checkLines.map((line) => ({
    rule_id: line.rule_id,
    label: line.label,
    verdict: line.verdict,
    reason: line.reason,
    ask_agent: askAgentForLine(line),
  }));

  const gaps = lines.filter((l) => l.verdict !== "PASS");
  const ask_agent = [
    ...new Set(
      gaps
        .map((g) => g.ask_agent)
        .filter((a): a is string => Boolean(a)),
    ),
  ];

  const passCount = lines.filter((l) => l.verdict === "PASS").length;

  return {
    brand: "CertShield",
    generated_at: (input.generatedAt ?? new Date()).toISOString(),
    org_name: input.orgName,
    brand_color: input.brandColor ?? null,
    vendor: input.vendor,
    document: input.document,
    summary: buildSummary({
      vendorName: input.vendor.name,
      status: input.vendor.status,
      overall: input.document?.overall_verdict ?? null,
      gapCount: gaps.length,
      passCount,
    }),
    lines,
    gaps,
    ask_agent,
    disclaimer: DISCLAIMER,
    cta: "Run this on all your vendors, automatically — CertShield, from $99/mo.",
  };
}
