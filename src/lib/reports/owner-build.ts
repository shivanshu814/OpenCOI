import type { VendorStatus } from "@/lib/data/types";
import { DISCLAIMER } from "@/lib/extraction/schema";
import { propertyCompliancePercent } from "@/lib/scores/compute";
import type { OwnerReport, OwnerReportVendorLine } from "./types";

export const OWNER_HONESTY_NOTE =
  "Risks flagged counts vendors that are non-compliant, missing documents, or in review — not insurance claim outcomes. We catch expirations and chase renewals automatically; mid-term cancellations are mitigated via agent confirmation — no tool can guarantee catching a silent cancellation.";

export function periodLabelFor(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatPropertyAddress(parts: {
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
}): string | null {
  const line = [
    parts.address_line?.trim(),
    [parts.city?.trim(), parts.state?.trim()].filter(Boolean).join(", "),
    parts.postal_code?.trim(),
  ]
    .filter(Boolean)
    .join(" · ");
  return line || null;
}

export function buildOwnerReportSummary(input: {
  propertyName: string;
  periodLabel: string;
  compliancePercent: number;
  vendorCount: number;
  documentsOnFile: number;
  risksFlagged: number;
  expiringCount: number;
}): string {
  const {
    propertyName,
    periodLabel,
    compliancePercent,
    vendorCount,
    documentsOnFile,
    risksFlagged,
    expiringCount,
  } = input;
  return `${propertyName} — ${periodLabel}: ${compliancePercent}% of assigned vendors are covered (compliant or expiring). ${documentsOnFile} document(s) on file across ${vendorCount} vendor(s). ${risksFlagged} compliance risk(s) flagged before assignment; ${expiringCount} certificate(s) expiring within 30 days.`;
}

export function buildOwnerReport(input: {
  orgName: string;
  property: {
    id: string;
    name: string;
    address_line?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    owner_llc_names?: string[] | null;
    certificate_holder_name?: string | null;
  };
  vendors: {
    id: string;
    name: string;
    trade: string | null;
    status: VendorStatus;
    documents_on_file: number;
  }[];
  generatedAt?: Date;
}): OwnerReport {
  const generatedAt = input.generatedAt ?? new Date();
  const statuses = input.vendors.map((v) => v.status);
  const by_status: Record<VendorStatus, number> = {
    compliant: 0,
    expiring: 0,
    non_compliant: 0,
    missing_docs: 0,
    in_review: 0,
  };
  for (const s of statuses) {
    by_status[s] = (by_status[s] ?? 0) + 1;
  }

  const compliance_percent = propertyCompliancePercent(statuses);
  const documents_on_file = input.vendors.reduce(
    (sum, v) => sum + v.documents_on_file,
    0,
  );
  const risks_flagged =
    by_status.non_compliant + by_status.missing_docs + by_status.in_review;
  const expiring_count = by_status.expiring;
  const period_label = periodLabelFor(generatedAt);

  const vendors: OwnerReportVendorLine[] = input.vendors.map((v) => ({
    id: v.id,
    name: v.name,
    trade: v.trade,
    status: v.status,
    documents_on_file: v.documents_on_file,
  }));

  return {
    brand: "CertShield",
    generated_at: generatedAt.toISOString(),
    period_label,
    org_name: input.orgName,
    property: {
      id: input.property.id,
      name: input.property.name,
      address: formatPropertyAddress(input.property),
      owner_llc_names: (input.property.owner_llc_names ?? []).filter(Boolean),
      certificate_holder_name:
        input.property.certificate_holder_name?.trim() || null,
    },
    compliance_percent,
    vendor_count: input.vendors.length,
    documents_on_file,
    risks_flagged,
    expiring_count,
    by_status,
    vendors,
    summary: buildOwnerReportSummary({
      propertyName: input.property.name,
      periodLabel: period_label,
      compliancePercent: compliance_percent,
      vendorCount: input.vendors.length,
      documentsOnFile: documents_on_file,
      risksFlagged: risks_flagged,
      expiringCount: expiring_count,
    }),
    disclaimer: DISCLAIMER,
    honesty_note: OWNER_HONESTY_NOTE,
  };
}
