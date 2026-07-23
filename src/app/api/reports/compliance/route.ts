import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { loadComplianceReport } from "@/lib/reports/load";
import {
  renderComplianceReportPdf,
  reportFilename,
} from "@/lib/reports/pdf";
import { NextResponse } from "next/server";

/**
 * GET /api/reports/compliance?vendorId=...&documentId=...
 * B10 — branded compliance report PDF with disclaimer footer.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get("vendorId")?.trim();
  const documentId = searchParams.get("documentId")?.trim() || undefined;

  if (!vendorId) {
    return NextResponse.json(
      { error: "vendorId query param required" },
      { status: 400 },
    );
  }

  if (isSupabaseConfigured()) {
    const session = await getSessionOrg();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const report = await loadComplianceReport(vendorId, documentId);
  if (!report) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const bytes = await renderComplianceReportPdf(report);
  const filename = reportFilename(report);

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
