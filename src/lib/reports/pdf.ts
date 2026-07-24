import type { Verdict } from "@/lib/requirements/engine";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ComplianceReport } from "./types";

const PAGE = { w: 612, h: 792 }; // US Letter
const MARGIN = 48;
const CONTENT_W = PAGE.w - MARGIN * 2;

const INK = rgb(0.12, 0.14, 0.18);
const MUTED = rgb(0.4, 0.42, 0.46);
const RULE = rgb(0.82, 0.84, 0.86);
const BRAND = rgb(0.08, 0.22, 0.45);
const FAIL = rgb(0.72, 0.12, 0.12);

/** F2 — parse a #rgb/#rrggbb hex to a pdf-lib color; falls back to BRAND. */
function brandColor(hex: string | null | undefined) {
  if (!hex) return BRAND;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return BRAND;
  const n = parseInt(h, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
const PASS = rgb(0.1, 0.45, 0.28);
const WARN = rgb(0.72, 0.45, 0.05);
const MISS = rgb(0.35, 0.38, 0.42);

function verdictColor(v: Verdict) {
  switch (v) {
    case "PASS":
      return PASS;
    case "FAIL":
      return FAIL;
    case "EXPIRING":
      return WARN;
    case "MISSING":
      return MISS;
  }
}

/** Helvetica (WinAnsi) cannot encode ≥, em-dash, etc. — normalize for PDF. */
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
  report: ComplianceReport;
};

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE.w, PAGE.h]);
  ctx.y = PAGE.h - MARGIN;
  drawHeader(ctx);
  drawFooter(ctx);
}

function ensureSpace(ctx: Ctx, need: number) {
  if (ctx.y - need < MARGIN + 56) {
    newPage(ctx);
  }
}

function drawHeader(ctx: Ctx) {
  const { page, fontBold, font, report } = ctx;
  const accent = brandColor(report.brand_color);
  page.drawText("CertShield", {
    x: MARGIN,
    y: ctx.y,
    size: 18,
    font: fontBold,
    color: accent,
  });
  page.drawText("Vendor compliance report", {
    x: MARGIN,
    y: ctx.y - 16,
    size: 10,
    font,
    color: MUTED,
  });
  const date = new Date(report.generated_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const right = pdfSafe(`Prepared for ${report.org_name} | ${date}`);
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
    start: { x: MARGIN, y: 40 },
    end: { x: PAGE.w - MARGIN, y: 40 },
    thickness: 0.5,
    color: RULE,
  });
  const disc = wrap(report.disclaimer, font, 7.5, CONTENT_W - 80);
  let fy = 28;
  for (const line of disc) {
    page.drawText(pdfSafe(line), {
      x: MARGIN,
      y: fy,
      size: 7.5,
      font,
      color: MUTED,
    });
    fy -= 9;
  }
  const pager = `${pageIndex} / ${pages}`;
  const pw = font.widthOfTextAtSize(pager, 8);
  page.drawText(pager, {
    x: PAGE.w - MARGIN - pw,
    y: 28,
    size: 8,
    font,
    color: MUTED,
  });
}

function drawTextBlock(
  ctx: Ctx,
  text: string,
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number },
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
    color: brandColor(ctx.report.brand_color),
    gap: 6,
  });
}

/** B10 — branded per-vendor compliance PDF (status, gaps, ask-agent, disclaimer). */
export async function renderComplianceReportPdf(
  report: ComplianceReport,
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

  // Vendor block
  drawTextBlock(ctx, report.vendor.name, { size: 16, bold: true, gap: 4 });
  const meta = [
    report.vendor.trade ? `Trade: ${report.vendor.trade}` : null,
    report.vendor.email ? `Email: ${report.vendor.email}` : null,
    `Status: ${report.vendor.status.replaceAll("_", " ")}`,
    report.document
      ? `Document: ${report.document.file_name} · ${report.document.overall_verdict ?? "—"}`
      : "Document: none on file",
  ]
    .filter(Boolean)
    .join("  ·  ");
  drawTextBlock(ctx, meta, { size: 9, color: MUTED, gap: 12 });

  drawSectionTitle(ctx, "Summary");
  drawTextBlock(ctx, report.summary, { size: 10, gap: 14 });

  // Requirements
  drawSectionTitle(ctx, "Requirements check");
  if (report.lines.length === 0) {
    drawTextBlock(ctx, "No requirement lines evaluated — upload a COI to run checks.", {
      size: 9,
      color: MUTED,
      gap: 12,
    });
  } else {
    for (const line of report.lines) {
      ensureSpace(ctx, 36);
      const verdict = line.verdict;
      ctx.page.drawText(pdfSafe(verdict), {
        x: MARGIN,
        y: ctx.y,
        size: 9,
        font: fontBold,
        color: verdictColor(verdict),
      });
      ctx.page.drawText(pdfSafe(line.label), {
        x: MARGIN + 72,
        y: ctx.y,
        size: 10,
        font: fontBold,
        color: INK,
      });
      ctx.y -= 13;
      const reasonLines = wrap(line.reason, font, 9, CONTENT_W - 72);
      for (const rl of reasonLines) {
        ctx.page.drawText(pdfSafe(rl), {
          x: MARGIN + 72,
          y: ctx.y,
          size: 9,
          font,
          color: MUTED,
        });
        ctx.y -= 11;
      }
      ctx.y -= 8;
    }
  }

  // Gaps / ask agent
  drawSectionTitle(ctx, "What to ask the insurance agent");
  if (report.ask_agent.length === 0) {
    drawTextBlock(ctx, "No gaps to chase — keep the certificate on file and monitor expirations.", {
      size: 9,
      color: MUTED,
      gap: 12,
    });
  } else {
    let n = 1;
    for (const ask of report.ask_agent) {
      drawTextBlock(ctx, `${n}. ${ask}`, { size: 10, gap: 8 });
      n += 1;
    }
  }

  // CTA (free-audit sales weapon — docs/03)
  ensureSpace(ctx, 48);
  ctx.y -= 8;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE.w - MARGIN, y: ctx.y },
    thickness: 0.5,
    color: RULE,
  });
  ctx.y -= 16;
  drawTextBlock(ctx, report.cta, { size: 10, bold: true, color: BRAND, gap: 4 });
  drawTextBlock(
    ctx,
    "Never work with an uninsured vendor again.",
    { size: 9, color: MUTED, gap: 4 },
  );

  // Re-stamp footers with final page count
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    // Cover old pager area by redrawing footer strip
    page.drawRectangle({
      x: PAGE.w - MARGIN - 40,
      y: 20,
      width: 40,
      height: 16,
      color: rgb(1, 1, 1),
    });
    const pager = `${i + 1} / ${pages.length}`;
    const pw = font.widthOfTextAtSize(pager, 8);
    page.drawText(pager, {
      x: PAGE.w - MARGIN - pw,
      y: 28,
      size: 8,
      font,
      color: MUTED,
    });
  }

  return doc.save();
}

export function reportFilename(report: ComplianceReport): string {
  const slug = report.vendor.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const day = report.generated_at.slice(0, 10);
  return `certshield-compliance-${slug || "vendor"}-${day}.pdf`;
}
