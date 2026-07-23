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
  if (!isSupabaseConfigured()) {
    return DEMO_VENDORS.map((v) => ({
      id: v.id,
      name: v.name,
      email: v.email,
      trade: v.trade,
      status: v.status,
    }));
  }

  const session = await getSessionOrg();
  if (!session) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, org_id, name, email, trade, status")
    .eq("org_id", session.orgId)
    .order("name");

  if (error) {
    console.error("listVendors", error);
    return [];
  }
  return (data ?? []).map(mapVendor);
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
    .select("id, org_id, vendor_id, file_name, storage_path, status")
    .eq("org_id", session.orgId)
    .eq("status", "in_internal_review")
    .order("created_at", { ascending: false });

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
