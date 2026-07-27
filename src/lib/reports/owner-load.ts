import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { countByKey, groupByKey, uniqueKeys } from "@/lib/data/join";
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

/**
 * Properties rendered on `/app/reports` in one pass. Well past any customer's
 * real portfolio (the Business plan targets multi-site managers, not thousands
 * of buildings), but explicit rather than relying on PostgREST's silent 1000.
 */
const OWNER_REPORT_PROPERTY_LIMIT = 500;

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

  // The vendor links are keyed on (org_id, property_id) — both known up front —
  // so waiting for the property row first bought nothing but a round trip.
  const [{ data: property, error }, { data: links }] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, name, address_line, city, state, postal_code, owner_llc_names, certificate_holder_name",
      )
      .eq("id", propertyId)
      .eq("org_id", session.orgId)
      .maybeSingle(),
    supabase
      .from("property_vendors")
      .select("vendor_id")
      .eq("org_id", session.orgId)
      .eq("property_id", propertyId),
  ]);

  if (error || !property) return null;

  const vendorIds = uniqueKeys(links ?? [], (l) => l.vendor_id as string);
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

  // These two are independent of each other; they were awaited in sequence.
  const [{ data: vendors }, { data: docs }] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name, trade, status")
      .eq("org_id", session.orgId)
      .in("id", vendorIds),
    supabase
      .from("documents")
      // Only vendor_id is counted — `id` was fetched and discarded.
      .select("vendor_id")
      .eq("org_id", session.orgId)
      .in("vendor_id", vendorIds),
  ]);

  const docCountByVendor = countByKey(docs ?? [], (d) => d.vendor_id as string);

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

  // The links read used to be `.in("property_id", <every property in the org>)`,
  // which is the same set of rows as `.eq("org_id", …)` — an `in` filter
  // enumerating the org's whole property list, and a round trip spent waiting
  // to build it. Filtering by org directly lets both reads start together.
  const [{ data: properties }, { data: links }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name, city, state, owner_report_email, owner_report_enabled")
      .eq("org_id", session.orgId)
      .order("name")
      .limit(OWNER_REPORT_PROPERTY_LIMIT),
    supabase
      .from("property_vendors")
      .select("property_id, vendor_id")
      .eq("org_id", session.orgId),
  ]);

  const rows = (properties ?? []) as {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    owner_report_email: string | null;
    owner_report_enabled: boolean;
  }[];

  if (rows.length === 0) return [];

  const linkedByProperty = groupByKey(
    links ?? [],
    (l) => l.property_id as string,
  );
  const allVendorIds = uniqueKeys(links ?? [], (l) => l.vendor_id as string);

  const vendorStatus = new Map<string, VendorStatus>();
  let docCountByVendor = new Map<string, number>();

  if (allVendorIds.length > 0) {
    const [{ data: vendors }, { data: docs }] = await Promise.all([
      supabase
        .from("vendors")
        .select("id, status")
        .eq("org_id", session.orgId)
        .in("id", allVendorIds),
      supabase
        .from("documents")
        .select("vendor_id")
        .eq("org_id", session.orgId)
        .in("vendor_id", allVendorIds),
    ]);

    for (const v of vendors ?? []) {
      vendorStatus.set(v.id as string, v.status as VendorStatus);
    }
    docCountByVendor = countByKey(docs ?? [], (d) => d.vendor_id as string);
  }

  return rows.map((p) => {
    const vids = (linkedByProperty.get(p.id) ?? []).map(
      (l) => l.vendor_id as string,
    );
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
