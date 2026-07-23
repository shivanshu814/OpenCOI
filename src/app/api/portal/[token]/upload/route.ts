import { isSupabaseConfigured } from "@/lib/config";
import { ingestPdfDocument } from "@/lib/documents/ingest";
import { resolvePortalToken } from "@/lib/portal/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Portal unavailable in demo mode" },
      { status: 503 },
    );
  }

  const { token } = await context.params;
  const ctx = await resolvePortalToken(token);
  if (!ctx) {
    return NextResponse.json(
      { error: "Invalid or expired portal link" },
      { status: 401 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const mime = file.type || "application/pdf";
  if (!name.endsWith(".pdf") && mime !== "application/pdf") {
    return NextResponse.json({ error: "PDF only" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await ingestPdfDocument({
      orgId: ctx.orgId,
      vendorId: ctx.vendorId,
      fileName: file.name,
      mimeType: mime,
      pdfBytes: bytes,
      supabase: admin,
      actor: { type: "vendor", id: ctx.vendorId },
      auditExtra: { source: "vendor_portal", token_id: ctx.tokenId },
    });

    return NextResponse.json({
      ok: true,
      documentId: result.documentId,
      queued: result.queued,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
