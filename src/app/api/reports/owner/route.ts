import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { renderOwnerReportPdfBytes } from "@/lib/reports/owner-send";
import { NextResponse } from "next/server";

/**
 * GET /api/reports/owner?propertyId=...
 * D3 — branded owner compliance report PDF.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId")?.trim();

  if (!propertyId) {
    return NextResponse.json(
      { error: "propertyId query param required" },
      { status: 400 },
    );
  }

  if (isSupabaseConfigured()) {
    const session = await getSessionOrg();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const rendered = await renderOwnerReportPdfBytes(propertyId);
  if (!rendered) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(rendered.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${rendered.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
