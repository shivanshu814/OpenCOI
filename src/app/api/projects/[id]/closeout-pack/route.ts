import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import type { VendorStatus } from "@/lib/data/types";
import { buildPackSummaryPdf, zipPack } from "@/lib/packs/build";
import {
  buildProjectCloseoutSummary,
  closeoutFilename,
} from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** D2 closeout compliance pack — all subs' final certs summary in one ZIP. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;

  if (!isSupabaseConfigured()) {
    const vendors = [
      {
        id: "v_roof",
        name: "Sunshine Roofing LLC",
        trade: "Roofer",
        status: "in_review" as VendorStatus,
        documents_on_file: 1,
      },
      {
        id: "v_land",
        name: "GreenPath Landscaping",
        trade: "Landscaper",
        status: "expiring" as VendorStatus,
        documents_on_file: 0,
      },
    ];
    const summary = buildProjectCloseoutSummary({
      projectName: "Roof Replace — Building A",
      vendors,
      documentsOnFile: 1,
    });
    const pdf = await buildPackSummaryPdf({
      title: "Project closeout pack (demo)",
      subtitle: summary,
      vendors: vendors.map((v) => ({ name: v.name, status: v.status })),
      documents: [],
      messages: [],
      audit: [],
      checksSummary: summary,
    });
    const zip = await zipPack([
      { name: "CLOSEOUT-SUMMARY.pdf", bytes: pdf },
      {
        name: "project.json",
        bytes: new TextEncoder().encode(
          JSON.stringify({ demo: true, vendors, summary }, null, 2),
        ),
      },
    ]);
    return new NextResponse(Buffer.from(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${closeoutFilename("Roof Replace Building A")}"`,
      },
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, start_date, end_date, status")
    .eq("id", projectId)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: links } = await supabase
    .from("project_vendors")
    .select("vendor_id")
    .eq("project_id", projectId)
    .eq("org_id", session.orgId);

  const vendorIds = (links ?? []).map((l) => l.vendor_id as string);
  let vendors: {
    id: string;
    name: string;
    trade: string | null;
    status: VendorStatus;
  }[] = [];

  if (vendorIds.length) {
    const { data } = await supabase
      .from("vendors")
      .select("id, name, trade, status")
      .in("id", vendorIds);
    vendors = (data ?? []) as never;
  }

  const { data: documents } = vendorIds.length
    ? await supabase
      .from("documents")
      .select("id, file_name, status, doc_kind, created_at, vendor_id, project_id")
      .eq("org_id", session.orgId)
      .in("vendor_id", vendorIds)
      .order("created_at", { ascending: false })
      .limit(300)
    : { data: [] };

  const docCountByVendor = new Map<string, number>();
  for (const d of documents ?? []) {
    const vid = d.vendor_id as string;
    docCountByVendor.set(vid, (docCountByVendor.get(vid) ?? 0) + 1);
  }

  const vendorLines = vendors.map((v) => ({
    id: v.id,
    name: v.name,
    trade: v.trade,
    status: v.status,
    documents_on_file: docCountByVendor.get(v.id) ?? 0,
  }));

  const documentsOnFile = vendorLines.reduce(
    (s, v) => s + v.documents_on_file,
    0,
  );
  const summary = buildProjectCloseoutSummary({
    projectName: project.name,
    vendors: vendorLines,
    documentsOnFile,
  });

  const { data: audit } = await supabase
    .from("audit_events")
    .select("created_at, action, entity_type, entity_id, actor_type")
    .eq("org_id", session.orgId)
    .eq("entity_id", projectId)
    .order("created_at", { ascending: false })
    .limit(200);

  const pdf = await buildPackSummaryPdf({
    title: `Closeout pack - ${project.name}`,
    subtitle: `${session.orgName} | ${project.start_date ?? "?"} -> ${project.end_date ?? "?"}`,
    vendors: vendorLines.map((v) => ({ name: v.name, status: v.status })),
    documents: (documents ?? []) as never,
    messages: [],
    audit: (audit ?? []) as never,
    checksSummary: summary,
  });

  const zip = await zipPack([
    { name: "CLOSEOUT-SUMMARY.pdf", bytes: pdf },
    {
      name: "project.json",
      bytes: new TextEncoder().encode(
        JSON.stringify(
          { project, vendors: vendorLines, documents, audit, summary },
          null,
          2,
        ),
      ),
    },
  ]);

  await supabase.from("audit_events").insert({
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    entity_type: "project",
    entity_id: projectId,
    action: "closeout_pack_exported",
    after_state: {
      vendors: vendors.length,
      documents: (documents ?? []).length,
    },
  });

  return new NextResponse(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${closeoutFilename(project.name)}"`,
    },
  });
}
