import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { buildPackSummaryPdf, zipPack } from "@/lib/packs/build";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import { NextResponse } from "next/server";

/** C7 audit pack — ZIP+PDF for one property (all assigned vendors). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: propertyId } = await context.params;

  if (!isSupabaseConfigured()) {
    const pdf = await buildPackSummaryPdf({
      title: "Property audit pack (demo)",
      subtitle: "Demo mode",
      documents: [],
      messages: [],
      audit: [],
    });
    const zip = await zipPack([{ name: "SUMMARY.pdf", bytes: pdf }]);
    return new NextResponse(Buffer.from(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="audit-pack-demo.zip"',
      },
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id, name")
    .eq("id", propertyId)
    .eq("org_id", session.orgId)
    .maybeSingle();
  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: links } = await supabase
    .from("property_vendors")
    .select("vendor_id")
    .eq("property_id", propertyId)
    .eq("org_id", session.orgId);

  const vendorIds = (links ?? []).map((l) => l.vendor_id as string);
  let vendors: { id: string; name: string; status: string }[] = [];
  if (vendorIds.length) {
    const { data } = await supabase
      .from("vendors")
      .select("id, name, status")
      .in("id", vendorIds);
    vendors = (data ?? []) as never;
  }

  const { data: documents } = vendorIds.length
    ? await supabase
      .from("documents")
      .select("id, file_name, status, doc_kind, created_at")
      .eq("org_id", session.orgId)
      .in("vendor_id", vendorIds)
      .order("created_at", { ascending: false })
      .limit(200)
    : { data: [] };

  const { data: audit } = await supabase
    .from("audit_events")
    .select("created_at, action, entity_type, entity_id, actor_type")
    .eq("org_id", session.orgId)
    .eq("entity_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(200);

  const pdf = await buildPackSummaryPdf({
    title: `Audit pack — ${property.name}`,
    subtitle: `${session.orgName} · ${vendors.length} vendors`,
    vendors: vendors.map((v) => ({ name: v.name, status: v.status })),
    documents: (documents ?? []) as never,
    messages: [],
    audit: (audit ?? []) as never,
  });

  const zip = await zipPack([
    { name: "SUMMARY.pdf", bytes: pdf },
    {
      name: "property.json",
      bytes: new TextEncoder().encode(
        JSON.stringify({ property, vendors, documents, audit }, null, 2),
      ),
    },
  ]);

  await insertAuditEvent(supabase, {
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    actor_email: session.email,
    entity_type: "property",
    entity_id: propertyId,
    action: "audit_pack_exported",
    after_state: { vendors: vendors.length },
  });

  const safe = property.name.replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
  return new NextResponse(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="audit-pack-${safe}.zip"`,
    },
  });
}
