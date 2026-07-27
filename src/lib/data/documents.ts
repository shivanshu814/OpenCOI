import { cache } from "react";
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
import { type CappedList, capped, firstByKey } from "./join";
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

/**
 * The vendor roster for pickers and name lookups.
 *
 * Memoized with React `cache()`, which is **request-scoped**: the dashboard,
 * the review queue and the review detail page each resolve the roster once per
 * render even when several components ask for it. Deliberately not a
 * cross-request cache — this data is org-scoped and feeds status badges, and a
 * roster held over from an earlier request could show a vendor as compliant
 * after their certificate lapsed. Outside a request scope `cache()` is a no-op,
 * so background jobs still read live rows.
 */
export const listVendors = cache(async function listVendors(): Promise<
  Vendor[]
> {
  // `withCount: false` — picker callers throw the total away, and an exact
  // count makes Postgres count every matching row on top of returning the page.
  const { vendors } = await queryVendors({
    limit: VENDOR_PICKER_LIMIT,
    withCount: false,
  });
  return vendors;
});

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
  /**
   * Ask Postgres for the exact total matching row count (default true).
   *
   * The count is a second aggregate over the whole matching set on top of
   * returning the page, and under RLS every counted row re-evaluates
   * `is_org_member`. Callers that only want "a list of vendors" — the upload,
   * review and dashboard pickers — should pass `false`; `total` then reports
   * the number of rows actually returned rather than the set size.
   */
  withCount?: boolean;
};

export type VendorQueryResult = {
  vendors: Vendor[];
  /**
   * Total matching rows before paging — drives "N of M" and page count.
   * When the query ran with `withCount: false` this is the returned row count,
   * not the size of the matching set.
   */
  total: number;
  /** Whether `total` is the true matching-set size or just `vendors.length`. */
  totalIsExact: boolean;
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
  const withCount = query.withCount ?? true;

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
    return {
      vendors: all.slice(offset, offset + limit),
      total: all.length,
      totalIsExact: true,
    };
  }

  const session = await getSessionOrg();
  if (!session) return { vendors: [], total: 0, totalIsExact: true };

  const supabase = await createClient();
  let q = supabase
    .from("vendors")
    .select(
      "id, org_id, name, email, trade, status",
      withCount ? { count: "exact" } : undefined,
    )
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
    return { vendors: [], total: 0, totalIsExact: true };
  }
  const vendors = (data ?? []).map(mapVendor);
  return {
    vendors,
    total: withCount ? (count ?? 0) : vendors.length,
    totalIsExact: withCount,
  };
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

/**
 * Ceiling on a single queue render.
 *
 * The queues used to be unbounded, which meant the dashboard's cost grew with
 * the customer's backlog and PostgREST's own 1000-row ceiling would eventually
 * cut the list off with nobody told. The cap is explicit and surfaced through
 * `CappedList.truncated` so the page can say "showing the first 200" instead of
 * implying an empty remainder.
 */
export const REVIEW_QUEUE_LIMIT = 200;

/** Ceiling on one vendor's document history (vendor detail page). */
export const VENDOR_DOCUMENTS_LIMIT = 200;

export async function listReviewQueue(): Promise<CappedList<DocumentRow>> {
  if (!isSupabaseConfigured()) {
    return capped(
      DEMO_DOCUMENTS.filter((d) => d.status === "in_internal_review").map(
        demoDocToRow,
      ),
      REVIEW_QUEUE_LIMIT,
    );
  }

  const session = await getSessionOrg();
  if (!session) return capped([], REVIEW_QUEUE_LIMIT);

  const supabase = await createClient();
  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, org_id, vendor_id, file_name, storage_path, status, created_at")
    .eq("org_id", session.orgId)
    .eq("status", "in_internal_review")
    // FIFO — the UI tells reviewers to clear the oldest item first.
    // Ascending reads `documents_org_status_created_idx` (019) backwards, which
    // Postgres does at no extra cost, so no separate ascending index is needed.
    .order("created_at", { ascending: true })
    .limit(REVIEW_QUEUE_LIMIT);

  if (error || !docs?.length) {
    if (error) console.error("listReviewQueue", error);
    return capped([], REVIEW_QUEUE_LIMIT);
  }

  return capped(
    await hydrateDocuments(supabase, session.orgId, docs),
    REVIEW_QUEUE_LIMIT,
  );
}

/** Published verdicts awaiting customer accept / override (Appendix B). */
export async function listAwaitingCustomerDecision(): Promise<
  CappedList<DocumentRow>
> {
  if (!isSupabaseConfigured()) {
    return capped(
      DEMO_DOCUMENTS.filter((d) => d.status === "published").map(demoDocToRow),
      REVIEW_QUEUE_LIMIT,
    );
  }

  const session = await getSessionOrg();
  if (!session) return capped([], REVIEW_QUEUE_LIMIT);

  const supabase = await createClient();
  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, org_id, vendor_id, file_name, storage_path, status")
    .eq("org_id", session.orgId)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(REVIEW_QUEUE_LIMIT);

  if (error || !docs?.length) {
    if (error) console.error("listAwaitingCustomerDecision", error);
    return capped([], REVIEW_QUEUE_LIMIT);
  }

  return capped(
    await hydrateDocuments(supabase, session.orgId, docs),
    REVIEW_QUEUE_LIMIT,
  );
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
): Promise<CappedList<VendorDocumentSummary>> {
  if (!isSupabaseConfigured()) {
    return capped(
      DEMO_DOCUMENTS.filter((d) => d.vendor_id === vendorId).map((d) => ({
        id: d.id,
        file_name: d.file_name,
        status: d.status,
        created_at: null,
        overall_verdict: d.overall_verdict,
        customer_decision: d.customer_decision ?? null,
      })),
      VENDOR_DOCUMENTS_LIMIT,
    );
  }

  const session = await getSessionOrg();
  if (!session) return capped([], VENDOR_DOCUMENTS_LIMIT);

  const supabase = await createClient();
  const { data: docs, error } = await supabase
    .from("documents")
    .select("id, file_name, status, created_at")
    .eq("org_id", session.orgId)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(VENDOR_DOCUMENTS_LIMIT);

  if (error || !docs?.length) {
    if (error) console.error("listVendorDocuments", error);
    return capped([], VENDOR_DOCUMENTS_LIMIT);
  }

  const { data: checks } = await supabase
    .from("compliance_checks")
    .select("document_id, overall_verdict, customer_decision, created_at")
    // org_id is redundant under RLS but lets the planner use
    // compliance_checks_document_created_idx without a tenant re-check per row.
    .eq("org_id", session.orgId)
    .in(
      "document_id",
      docs.map((d) => d.id),
    )
    .order("created_at", { ascending: false });

  // Latest check per document — rows arrive newest-first, so first-seen wins.
  const latestByDoc = firstByKey(checks ?? [], (c) => c.document_id as string);

  const rows = docs.map((d) => {
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

  return capped(rows, VENDOR_DOCUMENTS_LIMIT);
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

  const [row] = await hydrateDocuments(supabase, session.orgId, [doc]);
  return row ?? null;
}

type RawDocument = {
  id: string;
  org_id: string;
  vendor_id: string;
  file_name: string;
  storage_path: string | null;
  status: string;
  created_at?: string | null;
  fraud_signals?: DocumentRow["fraud_signals"];
};

/**
 * Attach the latest extraction and compliance check to a batch of documents in
 * **two queries total**, regardless of how many documents were passed.
 *
 * This replaces a per-document `hydrateDocument()` that issued two queries and
 * constructed a fresh Supabase client for every row. A 200-item review queue
 * therefore cost 401 round trips; the dashboard paid that twice (review queue
 * plus awaiting-decision) on every single render. That is the single largest
 * source of the "loading states everywhere" the product was showing.
 *
 * Correctness note: the batched reads are ordered newest-first and reduced with
 * `firstByKey`, which reproduces the old `.order(created_at desc).limit(1)`
 * exactly. A document that has been re-extracted keeps showing its most recent
 * verdict — attaching a superseded check would put a stale PASS in front of a
 * customer, which is precisely the failure this product exists to prevent.
 */
async function hydrateDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  docs: readonly RawDocument[],
): Promise<DocumentRow[]> {
  if (docs.length === 0) return [];
  const ids = docs.map((d) => d.id);

  const [{ data: extractions }, { data: checks }] = await Promise.all([
    supabase
      .from("extractions")
      .select("document_id, payload")
      .eq("org_id", orgId)
      .in("document_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("compliance_checks")
      .select(
        "document_id, lines, overall_verdict, customer_decision, customer_decision_reason",
      )
      .eq("org_id", orgId)
      .in("document_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  const latestExtraction = firstByKey(
    extractions ?? [],
    (e) => e.document_id as string,
  );
  const latestCheck = firstByKey(checks ?? [], (c) => c.document_id as string);

  return docs.map((doc) => hydrateOne(doc, latestExtraction, latestCheck));
}

function hydrateOne(
  doc: RawDocument,
  latestExtraction: Map<string, { payload: unknown }>,
  latestCheck: Map<
    string,
    {
      lines: unknown;
      overall_verdict: string | null;
      customer_decision: string | null;
      customer_decision_reason: string | null;
    }
  >,
): DocumentRow {
  const extraction = latestExtraction.get(doc.id);
  const check = latestCheck.get(doc.id);

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
