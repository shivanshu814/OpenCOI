import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import type { VendorStatus } from "@/lib/data/types";
import {
  DEMO_DOCUMENTS,
  DEMO_VENDORS,
  getDemoDocument,
} from "@/lib/demo/store";
import { sanitizeHexColor } from "@/lib/portal/tokens";
import type { CheckLine, Verdict } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import { buildComplianceReport } from "./build";
import type { ComplianceReport } from "./types";

export async function loadComplianceReport(
  vendorId: string,
  documentId?: string,
): Promise<ComplianceReport | null> {
  if (!isSupabaseConfigured()) {
    return loadDemoReport(vendorId, documentId);
  }

  const session = await getSessionOrg();
  if (!session) return null;

  const supabase = await createClient();
  const [{ data: vendor, error }, { data: org }] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name, email, trade, status")
      .eq("id", vendorId)
      .eq("org_id", session.orgId)
      .maybeSingle(),
    supabase
      .from("orgs")
      .select("brand_primary_color")
      .eq("id", session.orgId)
      .maybeSingle(),
  ]);

  if (error || !vendor) return null;

  let docRow: {
    id: string;
    file_name: string;
    status: string;
  } | null = null;

  if (documentId) {
    const { data } = await supabase
      .from("documents")
      .select("id, file_name, status")
      .eq("id", documentId)
      .eq("org_id", session.orgId)
      .eq("vendor_id", vendorId)
      .maybeSingle();
    docRow = data;
  } else {
    const { data } = await supabase
      .from("documents")
      .select("id, file_name, status")
      .eq("org_id", session.orgId)
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    docRow = data;
  }

  let checkLines: CheckLine[] = [];
  let overall: Verdict | null = null;

  if (docRow) {
    const { data: check } = await supabase
      .from("compliance_checks")
      .select("lines, overall_verdict")
      .eq("document_id", docRow.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    checkLines = (check?.lines as CheckLine[]) ?? [];
    overall = (check?.overall_verdict as Verdict) ?? null;
  }

  return buildComplianceReport({
    orgName: session.orgName,
    brandColor: sanitizeHexColor(org?.brand_primary_color),
    vendor: {
      id: vendor.id,
      name: vendor.name,
      trade: vendor.trade,
      email: vendor.email,
      status: vendor.status as VendorStatus,
    },
    document: docRow
      ? {
        id: docRow.id,
        file_name: docRow.file_name,
        status: docRow.status,
        overall_verdict: overall,
      }
      : null,
    checkLines,
  });
}

function loadDemoReport(
  vendorId: string,
  documentId?: string,
): ComplianceReport | null {
  const vendor = DEMO_VENDORS.find((v) => v.id === vendorId);
  if (!vendor) return null;

  const doc = documentId
    ? getDemoDocument(documentId)
    : DEMO_DOCUMENTS.find((d) => d.vendor_id === vendorId) ?? null;

  if (doc && doc.vendor_id !== vendorId) return null;

  return buildComplianceReport({
    orgName: "Demo Property Management LLC",
    vendor: {
      id: vendor.id,
      name: vendor.name,
      trade: vendor.trade,
      email: vendor.email,
      status: vendor.status,
    },
    document: doc
      ? {
        id: doc.id,
        file_name: doc.file_name,
        status: doc.status,
        overall_verdict: doc.overall_verdict,
      }
      : null,
    checkLines: doc?.check_lines ?? [],
  });
}
