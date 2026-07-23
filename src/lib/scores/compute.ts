/**
 * C6 — Compliance scores (screenshot-able for owner meetings).
 * Simple, explainable: status → points; portfolio = average of vendors.
 */

import type { VendorStatus } from "@/lib/data/types";

const STATUS_SCORE: Record<VendorStatus, number> = {
  compliant: 100,
  expiring: 70,
  in_review: 50,
  missing_docs: 20,
  non_compliant: 0,
};

export function vendorComplianceScore(status: VendorStatus): number {
  return STATUS_SCORE[status] ?? 0;
}

export function portfolioComplianceScore(
  vendors: { status: VendorStatus }[],
): {
  score: number;
  counted: number;
  byStatus: Record<VendorStatus, number>;
} {
  const byStatus: Record<VendorStatus, number> = {
    compliant: 0,
    expiring: 0,
    non_compliant: 0,
    missing_docs: 0,
    in_review: 0,
  };
  if (vendors.length === 0) {
    return { score: 0, counted: 0, byStatus };
  }
  let sum = 0;
  for (const v of vendors) {
    byStatus[v.status] = (byStatus[v.status] ?? 0) + 1;
    sum += vendorComplianceScore(v.status);
  }
  return {
    score: Math.round(sum / vendors.length),
    counted: vendors.length,
    byStatus,
  };
}

/** Property % = share of assigned vendors that are compliant or expiring (still covered). */
export function propertyCompliancePercent(
  vendorStatuses: VendorStatus[],
): number {
  if (vendorStatuses.length === 0) return 0;
  const ok = vendorStatuses.filter(
    (s) => s === "compliant" || s === "expiring",
  ).length;
  return Math.round((ok / vendorStatuses.length) * 100);
}
