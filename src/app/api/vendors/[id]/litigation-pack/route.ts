import { canWriteOrgData } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { buildPackSummaryPdf, zipPack } from "@/lib/packs/build";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** C7 litigation pack — ZIP+PDF for one vendor. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: vendorId } = await context.params;

  if (!isSupabaseConfigured()) {
    const pdf = await buildPackSummaryPdf({
      title: "Litigation pack (demo)",
      subtitle: "Demo mode — connect Supabase for live export",
      documents: [],
      messages: [],
      audit: [],
    });
    const zip = await zipPack([{ name: "SUMMARY.pdf", bytes: pdf }]);
    return new NextResponse(Buffer.from(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="litigation-pack-demo.zip"',
      },
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWriteOrgData(session.role) && session.role === "viewer") {
    // viewers can export for litigation support
  }

  const supabase = await createClient();
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, name, status")
    .eq("id", vendorId)
    .eq("org_id", session.orgId)
    .maybeSingle();
  if (!vendor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ data: documents }, { data: messages }, { data: audit }, { data: checks }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id, file_name, status, doc_kind, created_at, fraud_signals")
        .eq("vendor_id", vendorId)
        .eq("org_id", session.orgId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("messages")
        .select(
          "created_at, channel, template_key, subject, to_email, status",
        )
        .eq("vendor_id", vendorId)
        .eq("org_id", session.orgId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("audit_events")
        .select("created_at, action, entity_type, entity_id, actor_type")
        .eq("org_id", session.orgId)
        .eq("entity_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("compliance_checks")
        .select("overall_verdict, created_at")
        .eq("vendor_id", vendorId)
        .eq("org_id", session.orgId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const fraudSignals =
    (documents ?? []).flatMap((d) =>
      Array.isArray(d.fraud_signals) ? d.fraud_signals : [],
    ) ?? [];

  const pdf = await buildPackSummaryPdf({
    title: `Litigation pack — ${vendor.name}`,
    subtitle: `${session.orgName} · status ${vendor.status}`,
    vendors: [{ name: vendor.name, status: vendor.status }],
    documents: (documents ?? []) as never,
    messages: (messages ?? []) as never,
    audit: (audit ?? []) as never,
    checksSummary: checks?.[0]
      ? `Latest overall verdict: ${checks[0].overall_verdict} (${String(checks[0].created_at).slice(0, 10)})`
      : "No compliance checks on file.",
    fraudSignals: fraudSignals as never,
  });

  const files: { name: string; bytes: Uint8Array }[] = [
    { name: "SUMMARY.pdf", bytes: pdf },
    {
      name: "audit.json",
      bytes: new TextEncoder().encode(
        JSON.stringify({ vendor, documents, messages, audit, checks }, null, 2),
      ),
    },
  ];

  // Attach PDFs from storage when available
  for (const d of documents ?? []) {
    const { data: full } = await supabase
      .from("documents")
      .select("storage_path, file_name")
      .eq("id", d.id)
      .maybeSingle();
    if (!full?.storage_path || full.storage_path === "pending") continue;
    try {
      const { data: blob } = await supabase.storage
        .from("cois")
        .download(full.storage_path);
      if (blob) {
        const buf = new Uint8Array(await blob.arrayBuffer());
        files.push({
          name: `documents/${full.file_name || d.file_name}`,
          bytes: buf,
        });
      }
    } catch {
      /* skip missing */
    }
  }

  const zip = await zipPack(files);
  const safe = vendor.name.replace(/[^a-z0-9]+/gi, "-").slice(0, 40);

  await supabase.from("audit_events").insert({
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    entity_type: "vendor",
    entity_id: vendorId,
    action: "litigation_pack_exported",
    after_state: { files: files.length },
  });

  return new NextResponse(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="litigation-pack-${safe}.zip"`,
    },
  });
}
