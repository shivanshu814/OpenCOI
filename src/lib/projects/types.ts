import type { VendorStatus } from "@/lib/data/types";
import { propertyCompliancePercent } from "@/lib/scores/compute";

export type ProjectStatus = "active" | "closeout" | "closed";

export type ProjectSummary = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  property_id: string | null;
  vendor_count: number;
  compliance_percent: number;
};

export type ProjectVendorLine = {
  id: string;
  name: string;
  trade: string | null;
  status: VendorStatus;
  documents_on_file: number;
};

export function projectCompliancePercent(
  vendorStatuses: VendorStatus[],
): number {
  return propertyCompliancePercent(vendorStatuses);
}

export function buildProjectCloseoutSummary(input: {
  projectName: string;
  vendors: ProjectVendorLine[];
  documentsOnFile: number;
}): string {
  const pct = projectCompliancePercent(input.vendors.map((v) => v.status));
  const gaps = input.vendors.filter(
    (v) =>
      v.status === "non_compliant" ||
      v.status === "missing_docs" ||
      v.status === "in_review",
  ).length;
  return `${input.projectName} closeout: ${pct}% of ${input.vendors.length} sub(s) covered (compliant or expiring). ${input.documentsOnFile} document(s) on file. ${gaps} sub(s) still need attention before close.`;
}

export function closeoutFilename(projectName: string, day = new Date()): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `closeout-${slug || "project"}-${day.toISOString().slice(0, 10)}.zip`;
}
