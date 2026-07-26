import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import {
  DEMO_DOCUMENTS,
  DEMO_VENDORS,
  getDemoDocument,
} from "@/lib/demo/store";
import type { Extraction } from "@/lib/extraction/schema";
import type { CheckLine, Verdict } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow, Vendor, VendorStatus } from "./types";

function mapVendor(row: {
  id: string;
  org_id?: string;
  name: string;
  email: string | null;
  trade: string | null;
  status: string;
}): Vendor {
  return {
    id: row.id,
    org_id: row.org_id,
    name: row.name,
    email: row.email,
    trade: row.trade,
    status: row.status as VendorStatus,
  };
}

export async function listVendors(): Promise<Vendor[]> {
  const { vendors } = await queryVendors({ limit: VENDOR_PICKER_LIMIT });
  return vendors;
}

/** Rows per vendors-page view. */
export const VENDOR_PAGE_SIZE = 50;

/**
 * Upper bound for callers that need "the roster" in one array (vendor pickers
 * on upload / property / project). PostgREST caps a request at 1000 rows
 * regardless, so this makes the ceiling explicit instead of silently losing
 * vendors past the cap.
 */
const VENDOR_PICKER_LIMIT = 500;

export type VendorQuery = {
  /** Case-insensitive match on name, trade, or email — applied in Postgres. */
  search?: string;
  status?: VendorStatus | null;
  limit?: number;
  offset?: number;
};

export type VendorQueryResult = {
  vendors: Vendor[];
  /** Total matching rows before paging — drives "N of M" and page count. */
  total: number;
};

/**
 * Vendors for one org, filtered and paged **in Postgres**.
 *
 * Filtering used to happen in JS over every row the page had loaded, which
 * quietly broke past PostgREST's 1000-row ceiling: a search for a vendor at
 * row 1200 returned "no results" on a roster that plainly contained them.
 */
export async function queryVendors(
  query: VendorQuery = {},
): Promise<VendorQueryResult> {
  const limit = query.limit ?? VENDOR_PAGE_SIZE;
  const offset = query.offset ?? 0;
  const search = query.search?.trim().toLowerCase() ?? "";

  if (!isSupabaseConfigured()) {
    const all = DEMO_VENDORS.map((v) => ({
      id: v.id,
      name: v.name,
      email: v.email,
      trade: v.trade,
      status: v.status,
    })).filter((v) => {
      if (query.status && v.status !== query.status) return false;
      if (!search) return true;
      return [v.name, v.trade, v.email]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(search));
    });
    return { vendors: all.slice(offset, offset + limit), total: all.length };
  }

  const session = await getSessionOrg();
  if (!session) return { vendors: [], total: 0 };

  const supabase = await createClient();
  let q = supabase
    .from("vendors")
    .select("id, org_id, name, email, trade, status", { count: "exact" })
    .eq("org_id", session.orgId);

  if (query.status) q = q.eq("status", query.status);
  if (search) {
    // PostgREST `or` takes a comma-separated filter list; commas and parens in
    // the needle would break out of it, so strip them before interpolating.
    const needle = search.replace(/[,()*]/g, " ").trim();
    if (needle) {
      q = q.or(
        `name.ilike.%${needle}%,trade.ilike.%${needle}%,email.ilike.%${needle}%`,
      );
    }
  }

  const { data, error, count } = await q
    .order("name")
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("queryVendors", error);
    return { vendors: [], total: 0 };
  }
  return { vendors: (data ?? []).map(mapVendor), total: count ?? 0 };
}

/** Per-status vendor counts for the whole org (head-only count queries). */
export async function vendorStatusCounts(): Promise<
  Record<VendorStatus, number> & { total: number }
> {
  const empty = {
    compliant: 0,
    expiring: 0,
    non_compliant: 0,
    missing_docs: 0,
    in_review: 0,
    total: 0,
  };

  if (!isSupabaseConfigured()) {
    const counts = { ...empty };
    for (const v of DEMO_VENDORS) {
      counts[v.status] += 1;
      counts.total += 1;
    }
    return counts;
  }

  const session = await getSessionOrg();
  if (!session) return empty;

  const supabase = await createClient();
  const statuses: VendorStatus[] = [
    "compliant",
    "expiring",
    "non_compliant",
    "missing_docs",
    "in_review",
  ];

  // `head: true` returns the count without transferring a single row, so this
  // stays O(1) payload no matter how large the roster gets.
  const results = await Promise.all(
    statuses.map((status) =>
      supabase
        .from("vendors")
        .select("id", { count: "exact", head: true })
        .eq("org_id", session.orgId)
        .eq("status", status),
    ),
  );

  const counts = { ...empty };
  statuses.forEach((status, i) => {
    const n = results[i]?.count ?? 0;
    counts[status] = n;
    counts.total += n;
  });
  return counts;
}

export async function listReviewQueue(): Promise<DocumentRow[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_DOCUMENTS.filter((d) => d.status === "in_internal_review").map(
      demoDocToRow,
    );
  }

  const session = await getSessionOrg();
  if (!session) return [];

  const supabase = await createClient();
  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, org_id, vendor_id, file_name, storage_path, status, created_at")
    .eq("org_id", session.orgId)
    .eq("status", "in_internal_review")
    // FIFO — the UI tells reviewers to clear the oldest item first.
    .order("created_at", { ascending: true });

  if (error || !docs?.length) {
    if (error) console.error("listReviewQueue", error);
    return [];
  }

  return Promise.all(docs.map((d) => hydrateDocument(d)));
}

/** Published verdicts awaiting customer accept / override (Appendix B). */
export async function listAwaitingCustomerDecision(): Promise<DocumentRow[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_DOCUMENTS.filter((d) => d.status === "published").map(
      demoDocToRow,
    );
  }

  const session = await getSessionOrg();
  if (!session) return [];

  const supabase = await createClient();
  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, org_id, vendor_id, file_name, storage_path, status")
    .eq("org_id", session.orgId)
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (error || !docs?.length) {
    if (error) console.error("listAwaitingCustomerDecision", error);
    return [];
  }

  return Promise.all(docs.map((d) => hydrateDocument(d)));
}

/** Lightweight per-vendor document history for the vendor detail page. */
export type VendorDocumentSummary = {
  id: string;
  file_name: string;
  status: DocumentRow["status"];
  created_at: string | null;
  overall_verdict: Verdict | null;
  customer_decision: DocumentRow["customer_decision"];
};

export async function listVendorDocuments(
  vendorId: string,
): Promise<VendorDocumentSummary[]> {
  if (!isSupabaseConfigured()) {
    return DEMO_DOCUMENTS.filter((d) => d.vendor_id === vendorId).map((d) => ({
      id: d.id,
      file_name: d.file_name,
      status: d.status,
      created_at: null,
      overall_verdict: d.overall_verdict,
      customer_decision: d.customer_decision ?? null,
    }));
  }

  const session = await getSessionOrg();
  if (!session) return [];

  const supabase = await createClient();
  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, file_name, status, created_at")
    .eq("org_id", session.orgId)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error || !docs?.length) {
    if (error) console.error("listVendorDocuments", error);
    return [];
  }

  const { data: checks } = await supabase
    .from("compliance_checks")
    .select("document_id, overall_verdict, customer_decision, created_at")
    .in(
      "document_id",
      docs.map((d) => d.id),
    )
    .order("created_at", { ascending: false });

  // Latest check per document (rows are newest-first).
  const latestByDoc = new Map<
    string,
    { overall_verdict: string | null; customer_decision: string | null }
  >();
  for (const check of checks ?? []) {
    if (!latestByDoc.has(check.document_id)) {
      latestByDoc.set(check.document_id, check);
    }
  }

  return docs.map((d) => {
    const check = latestByDoc.get(d.id);
    return {
      id: d.id,
      file_name: d.file_name,
      status: d.status as DocumentRow["status"],
      created_at: (d.created_at as string | null) ?? null,
      overall_verdict: (check?.overall_verdict as Verdict) ?? null,
      customer_decision:
        (check?.customer_decision as DocumentRow["customer_decision"]) ?? null,
    };
  });
}

export async function getDocument(id: string): Promise<DocumentRow | null> {
  if (!isSupabaseConfigured()) {
    const demo = getDemoDocument(id);
    return demo ? demoDocToRow(demo) : null;
  }

  const session = await getSessionOrg();
  if (!session) return null;

  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, org_id, vendor_id, file_name, storage_path, status, fraud_signals")
    .eq("id", id)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (error || !doc) {
    if (error) console.error("getDocument", error);
    return null;
  }

  return hydrateDocument(doc);
}

async function hydrateDocument(doc: {
  id: string;
  org_id: string;
  vendor_id: string;
  file_name: string;
  storage_path: string | null;
  status: string;
  created_at?: string | null;
  fraud_signals?: DocumentRow["fraud_signals"];
}): Promise<DocumentRow> {
  const supabase = await createClient();

  const [{ data: extraction }, { data: check }] = await Promise.all([
    supabase
      .from("extractions")
      .select("payload")
      .eq("document_id", doc.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("compliance_checks")
      .select(
        "lines, overall_verdict, customer_decision, customer_decision_reason",
      )
      .eq("document_id", doc.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    id: doc.id,
    org_id: doc.org_id,
    vendor_id: doc.vendor_id,
    file_name: doc.file_name,
    storage_path: doc.storage_path,
    status: doc.status as DocumentRow["status"],
    created_at: doc.created_at ?? null,
    extraction: (extraction?.payload as Extraction) ?? null,
    check_lines: (check?.lines as CheckLine[]) ?? [],
    overall_verdict: (check?.overall_verdict as Verdict) ?? null,
    customer_decision:
      (check?.customer_decision as DocumentRow["customer_decision"]) ?? null,
    customer_decision_reason: check?.customer_decision_reason ?? null,
    fraud_signals: Array.isArray(doc.fraud_signals) ? doc.fraud_signals : [],
  };
}

function demoDocToRow(d: (typeof DEMO_DOCUMENTS)[number]): DocumentRow {
  return {
    id: d.id,
    vendor_id: d.vendor_id,
    file_name: d.file_name,
    status: d.status,
    extraction: d.extraction,
    check_lines: d.check_lines,
    overall_verdict: d.overall_verdict,
    customer_decision: d.customer_decision ?? null,
    customer_decision_reason: d.customer_decision_reason ?? null,
  };
}
