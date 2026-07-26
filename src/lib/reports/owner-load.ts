import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import type { VendorStatus } from "@/lib/data/types";
import { DEMO_DOCUMENTS, DEMO_VENDORS } from "@/lib/demo/store";
import { propertyCompliancePercent } from "@/lib/scores/compute";
import { createClient } from "@/lib/supabase/server";
import { buildOwnerReport } from "./owner-build";
import type { OwnerReport } from "./types";

/** List-row summary for `/app/reports` — real metrics only, no invented properties. */
export type OwnerReportListRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  owner_report_email: string | null;
  owner_report_enabled: boolean;
  compliance_percent: number;
  documents_on_file: number;
  risks_flagged: number;
  vendor_count: number;
};

const DEMO_PROPERTY = {
  id: "prop_demo_1",
  name: "Oak Street Apartments",
  address_line: "100 Oak St",
  city: "Austin",
  state: "TX",
  postal_code: "78701",
  owner_llc_names: ["Oak Street LLC"],
  certificate_holder_name: "Oak Street LLC",
  owner_report_email: "owner@oakstreet.example",
};

export async function loadOwnerReport(
  propertyId: string,
): Promise<OwnerReport | null> {
  if (!isSupabaseConfigured()) {
    return loadDemoOwnerReport(propertyId);
  }

  const session = await getSessionOrg();
  if (!session) return null;

  const supabase = await createClient();
  const { data: property, error } = await supabase
    .from("properties")
    .select(
      "id, name, address_line, city, state, postal_code, owner_llc_names, certificate_holder_name",
    )
    .eq("id", propertyId)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (error || !property) return null;

  const { data: links } = await supabase
    .from("property_vendors")
    .select("vendor_id")
    .eq("property_id", propertyId)
    .eq("org_id", session.orgId);

  const vendorIds = (links ?? []).map((l) => l.vendor_id as string);
  if (vendorIds.length === 0) {
    return buildOwnerReport({
      orgName: session.orgName,
      property: {
        ...property,
        owner_llc_names: Array.isArray(property.owner_llc_names)
          ? (property.owner_llc_names as string[])
          : [],
      },
      vendors: [],
    });
  }

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, trade, status")
    .eq("org_id", session.orgId)
    .in("id", vendorIds);

  const { data: docs } = await supabase
    .from("documents")
    .select("id, vendor_id")
    .eq("org_id", session.orgId)
    .in("vendor_id", vendorIds);

  const docCountByVendor = new Map<string, number>();
  for (const d of docs ?? []) {
    const vid = d.vendor_id as string;
    docCountByVendor.set(vid, (docCountByVendor.get(vid) ?? 0) + 1);
  }

  return buildOwnerReport({
    orgName: session.orgName,
    property: {
      ...property,
      owner_llc_names: Array.isArray(property.owner_llc_names)
        ? (property.owner_llc_names as string[])
        : [],
    },
    vendors: (vendors ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      trade: v.trade,
      status: v.status as VendorStatus,
      documents_on_file: docCountByVendor.get(v.id) ?? 0,
    })),
  });
}

function loadDemoOwnerReport(propertyId: string): OwnerReport | null {
  if (propertyId !== DEMO_PROPERTY.id && propertyId !== "prop_demo_1") {
    // Allow any id in demo so property detail deep-links still work
    if (!propertyId.startsWith("prop_")) return null;
  }

  const docCountByVendor = new Map<string, number>();
  for (const d of DEMO_DOCUMENTS) {
    docCountByVendor.set(
      d.vendor_id,
      (docCountByVendor.get(d.vendor_id) ?? 0) + 1,
    );
  }

  return buildOwnerReport({
    orgName: "Demo Property Management LLC",
    property: {
      id: propertyId.startsWith("prop_") ? propertyId : DEMO_PROPERTY.id,
      name: DEMO_PROPERTY.name,
      address_line: DEMO_PROPERTY.address_line,
      city: DEMO_PROPERTY.city,
      state: DEMO_PROPERTY.state,
      postal_code: DEMO_PROPERTY.postal_code,
      owner_llc_names: DEMO_PROPERTY.owner_llc_names,
      certificate_holder_name: DEMO_PROPERTY.certificate_holder_name,
    },
    vendors: DEMO_VENDORS.map((v) => ({
      id: v.id,
      name: v.name,
      trade: v.trade,
      status: v.status,
      documents_on_file: docCountByVendor.get(v.id) ?? 0,
    })),
  });
}

export function demoOwnerReportEmail(): string {
  return DEMO_PROPERTY.owner_report_email;
}

/**
 * Batch-load property rows + D3 owner-report metrics for the Reports page.
 * Returns [] when Supabase is unset or the org has no properties (honest empty).
 */
export async function listOwnerReportRows(): Promise<OwnerReportListRow[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const session = await getSessionOrg();
  if (!session) return [];

  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select(
      "id, name, city, state, owner_report_email, owner_report_enabled",
    )
    .eq("org_id", session.orgId)
    .order("name");

  const rows = (properties ?? []) as {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    owner_report_email: string | null;
    owner_report_enabled: boolean;
  }[];

  if (rows.length === 0) return [];

  const propertyIds = rows.map((p) => p.id);

  const { data: links } = await supabase
    .from("property_vendors")
    .select("property_id, vendor_id")
    .eq("org_id", session.orgId)
    .in("property_id", propertyIds);

  const vendorIdsByProperty = new Map<string, string[]>();
  const allVendorIds = new Set<string>();
  for (const link of links ?? []) {
    const pid = link.property_id as string;
    const vid = link.vendor_id as string;
    const list = vendorIdsByProperty.get(pid) ?? [];
    list.push(vid);
    vendorIdsByProperty.set(pid, list);
    allVendorIds.add(vid);
  }

  const vendorStatus = new Map<string, VendorStatus>();
  const docCountByVendor = new Map<string, number>();

  if (allVendorIds.size > 0) {
    const ids = [...allVendorIds];
    const [{ data: vendors }, { data: docs }] = await Promise.all([
      supabase
        .from("vendors")
        .select("id, status")
        .eq("org_id", session.orgId)
        .in("id", ids),
      supabase
        .from("documents")
        .select("vendor_id")
        .eq("org_id", session.orgId)
        .in("vendor_id", ids),
    ]);

    for (const v of vendors ?? []) {
      vendorStatus.set(v.id as string, v.status as VendorStatus);
    }
    for (const d of docs ?? []) {
      const vid = d.vendor_id as string;
      docCountByVendor.set(vid, (docCountByVendor.get(vid) ?? 0) + 1);
    }
  }

  return rows.map((p) => {
    const vids = vendorIdsByProperty.get(p.id) ?? [];
    const statuses = vids
      .map((id) => vendorStatus.get(id))
      .filter((s): s is VendorStatus => s != null);
    let documents_on_file = 0;
    let risks_flagged = 0;
    for (const id of vids) {
      documents_on_file += docCountByVendor.get(id) ?? 0;
      const status = vendorStatus.get(id);
      if (
        status === "non_compliant" ||
        status === "missing_docs" ||
        status === "in_review"
      ) {
        risks_flagged += 1;
      }
    }
    return {
      id: p.id,
      name: p.name,
      city: p.city,
      state: p.state,
      owner_report_email: p.owner_report_email,
      owner_report_enabled: p.owner_report_enabled,
      compliance_percent: propertyCompliancePercent(statuses),
      documents_on_file,
      risks_flagged,
      vendor_count: vids.length,
    };
  });
}
