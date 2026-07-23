import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { OwnerReport } from "./types";

const PAGE = { w: 612, h: 792 };
const MARGIN = 48;
const CONTENT_W = PAGE.w - MARGIN * 2;

const INK = rgb(0.12, 0.14, 0.18);
const MUTED = rgb(0.4, 0.42, 0.46);
const RULE = rgb(0.82, 0.84, 0.86);
const BRAND = rgb(0.08, 0.22, 0.45);

function pdfSafe(text: string): string {
  return text
    .replaceAll("≥", ">=")
    .replaceAll("≤", "<=")
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("·", "|")
    .replace(/[^\x00-\x7E]/g, "?");
}

function wrap(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
  report: OwnerReport;
};

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE.w, PAGE.h]);
  ctx.y = PAGE.h - MARGIN;
  drawHeader(ctx);
  drawFooter(ctx);
}

function ensureSpace(ctx: Ctx, need: number) {
  if (ctx.y - need < MARGIN + 64) {
    newPage(ctx);
  }
}

function drawHeader(ctx: Ctx) {
  const { page, fontBold, font, report } = ctx;
  page.drawText("CertShield", {
    x: MARGIN,
    y: ctx.y,
    size: 18,
    font: fontBold,
    color: BRAND,
  });
  page.drawText("Owner compliance report", {
    x: MARGIN,
    y: ctx.y - 16,
    size: 10,
    font,
    color: MUTED,
  });
  const right = pdfSafe(
    `${report.period_label} | Prepared by ${report.org_name}`,
  );
  const rw = font.widthOfTextAtSize(right, 9);
  page.drawText(right, {
    x: PAGE.w - MARGIN - rw,
    y: ctx.y - 4,
    size: 9,
    font,
    color: MUTED,
  });
  ctx.y -= 36;
  page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE.w - MARGIN, y: ctx.y },
    thickness: 1,
    color: RULE,
  });
  ctx.y -= 20;
}

function drawFooter(ctx: Ctx) {
  const { page, font, report, doc } = ctx;
  const pages = doc.getPageCount();
  const pageIndex = doc.getPages().indexOf(page) + 1;
  page.drawLine({
    start: { x: MARGIN, y: 48 },
    end: { x: PAGE.w - MARGIN, y: 48 },
    thickness: 0.5,
    color: RULE,
  });
  const disc = wrap(report.disclaimer, font, 7, CONTENT_W - 80);
  let fy = 36;
  for (const line of disc.slice(0, 2)) {
    page.drawText(pdfSafe(line), {
      x: MARGIN,
      y: fy,
      size: 7,
      font,
      color: MUTED,
    });
    fy -= 9;
  }
  const pager = `${pageIndex} / ${pages}`;
  const pw = font.widthOfTextAtSize(pager, 8);
  page.drawText(pager, {
    x: PAGE.w - MARGIN - pw,
    y: 36,
    size: 8,
    font,
    color: MUTED,
  });
}

function drawTextBlock(
  ctx: Ctx,
  text: string,
  opts: {
    size?: number;
    bold?: boolean;
    color?: ReturnType<typeof rgb>;
    gap?: number;
  },
) {
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.fontBold : ctx.font;
  const color = opts.color ?? INK;
  const lines = wrap(text, font, size, CONTENT_W);
  const lineH = size + 3;
  ensureSpace(ctx, lines.length * lineH + (opts.gap ?? 8));
  for (const line of lines) {
    ctx.page.drawText(pdfSafe(line), { x: MARGIN, y: ctx.y, size, font, color });
    ctx.y -= lineH;
  }
  ctx.y -= opts.gap ?? 8;
}

function drawSectionTitle(ctx: Ctx, title: string) {
  ensureSpace(ctx, 28);
  drawTextBlock(ctx, title, {
    size: 11,
    bold: true,
    color: BRAND,
    gap: 6,
  });
}

function drawStatRow(
  ctx: Ctx,
  items: { label: string; value: string }[],
) {
  ensureSpace(ctx, 48);
  const colW = CONTENT_W / items.length;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const x = MARGIN + i * colW;
    ctx.page.drawText(pdfSafe(item.value), {
      x,
      y: ctx.y,
      size: 18,
      font: ctx.fontBold,
      color: BRAND,
    });
    ctx.page.drawText(pdfSafe(item.label), {
      x,
      y: ctx.y - 16,
      size: 8,
      font: ctx.font,
      color: MUTED,
    });
  }
  ctx.y -= 40;
}

/** D3 — branded monthly owner PDF (compliance %, risks flagged, docs on file). */
export async function renderOwnerReportPdf(
  report: OwnerReport,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE.w, PAGE.h]),
    font,
    fontBold,
    y: PAGE.h - MARGIN,
    report,
  };
  drawHeader(ctx);
  drawFooter(ctx);

  drawTextBlock(ctx, report.property.name, { size: 16, bold: true, gap: 4 });
  const meta = [
    report.property.address,
    report.property.certificate_holder_name
      ? `Holder: ${report.property.certificate_holder_name}`
      : null,
    report.property.owner_llc_names.length
      ? `Owner LLCs: ${report.property.owner_llc_names.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("  |  ");
  if (meta) {
    drawTextBlock(ctx, meta, { size: 9, color: MUTED, gap: 14 });
  } else {
    ctx.y -= 8;
  }

  drawSectionTitle(ctx, "At a glance");
  drawStatRow(ctx, [
    { label: "Compliance %", value: `${report.compliance_percent}%` },
    { label: "Docs on file", value: String(report.documents_on_file) },
    { label: "Risks flagged", value: String(report.risks_flagged) },
    { label: "Expiring <=30d", value: String(report.expiring_count) },
  ]);

  drawSectionTitle(ctx, "Summary");
  drawTextBlock(ctx, report.summary, { size: 10, gap: 12 });

  drawSectionTitle(ctx, "Vendors on this property");
  if (report.vendors.length === 0) {
    drawTextBlock(ctx, "No vendors assigned to this property yet.", {
      size: 9,
      color: MUTED,
      gap: 12,
    });
  } else {
    for (const v of report.vendors) {
      ensureSpace(ctx, 28);
      const line = `${v.name}${v.trade ? ` (${v.trade})` : ""} — ${v.status.replaceAll("_", " ")} · ${v.documents_on_file} doc(s)`;
      drawTextBlock(ctx, line, { size: 9, gap: 6 });
    }
  }

  drawSectionTitle(ctx, "About these numbers");
  drawTextBlock(ctx, report.honesty_note, { size: 8, color: MUTED, gap: 8 });

  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    page.drawRectangle({
      x: PAGE.w - MARGIN - 40,
      y: 28,
      width: 40,
      height: 16,
      color: rgb(1, 1, 1),
    });
    const pager = `${i + 1} / ${pages.length}`;
    const pw = font.widthOfTextAtSize(pager, 8);
    page.drawText(pager, {
      x: PAGE.w - MARGIN - pw,
      y: 36,
      size: 8,
      font,
      color: MUTED,
    });
  }

  return doc.save();
}

export function ownerReportFilename(report: OwnerReport): string {
  const slug = report.property.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const month = report.generated_at.slice(0, 7);
  return `certshield-owner-${slug || "property"}-${month}.pdf`;
}
