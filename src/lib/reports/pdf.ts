import type { Verdict } from "@/lib/requirements/engine";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ComplianceReport } from "./types";

const PAGE = { w: 612, h: 792 }; // US Letter
const MARGIN = 48;
const CONTENT_W = PAGE.w - MARGIN * 2;
const FOOTER_H = 58;
const HEADER_H = 44;

/** Brand ink — cool navy (docs/02 + app --ink), not flat marketing blue. */
const INK = rgb(0.09, 0.16, 0.26); // ~#172A43
const INK_SOFT = rgb(0.18, 0.24, 0.32);
const MUTED = rgb(0.42, 0.46, 0.52);
const RULE = rgb(0.86, 0.88, 0.9);
const WASH = rgb(0.965, 0.975, 0.97);
const WHITE = rgb(1, 1, 1);

/** Default CertShield mint (#00B884) — matches CertShieldMark / --brand. */
const MINT = rgb(0, 0.722, 0.518);
const MINT_WASH = rgb(0.9, 0.97, 0.94);

const PASS = rgb(0.086, 0.639, 0.29); // #16A34A
const PASS_WASH = rgb(0.91, 0.97, 0.93);
const FAIL = rgb(0.863, 0.149, 0.149); // #DC2626
const FAIL_WASH = rgb(0.99, 0.93, 0.93);
const WARN = rgb(0.851, 0.467, 0.024); // #D97706
const WARN_WASH = rgb(0.99, 0.96, 0.9);
const MISS = rgb(0.4, 0.44, 0.5);
const MISS_WASH = rgb(0.94, 0.95, 0.96);

type PdfColor = ReturnType<typeof rgb>;

/** F2 — parse a #rgb/#rrggbb hex to a pdf-lib color; falls back to mint. */
function brandColor(hex: string | null | undefined): PdfColor {
  if (!hex) return MINT;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return MINT;
  const n = parseInt(h, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function verdictColor(v: Verdict): PdfColor {
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

function verdictWash(v: Verdict): PdfColor {
  switch (v) {
    case "PASS":
      return PASS_WASH;
    case "FAIL":
      return FAIL_WASH;
    case "EXPIRING":
      return WARN_WASH;
    case "MISSING":
      return MISS_WASH;
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
  accent: PdfColor;
};

function countVerdicts(report: ComplianceReport) {
  const counts = { PASS: 0, FAIL: 0, MISSING: 0, EXPIRING: 0 };
  for (const line of report.lines) {
    counts[line.verdict] += 1;
  }
  return counts;
}

/**
 * CertShield mark — mint tile + white shield + mint check
 * (matches public/logo.svg / CertShieldMark; drawn via paths so PDF embeds without SVG).
 *
 * pdf-lib drawSvgPath: `y` is the TOP of the SVG (Y-axis is flipped with scale(s,-s)).
 */
function drawLogoMark(
  page: PDFPage,
  x: number,
  yTop: number,
  size: number,
  tile: PdfColor,
) {
  const s = size / 36;
  // Rounded tile
  page.drawSvgPath(
    "M8 0 H28 A8 8 0 0 1 36 8 V28 A8 8 0 0 1 28 36 H8 A8 8 0 0 1 0 28 V8 A8 8 0 0 1 8 0 Z",
    { x, y: yTop, scale: s, color: tile },
  );
  // Shield (white)
  page.drawSvgPath(
    "M18 7.2C18 7.2 11.25 9.45 11.25 9.45V17.7C11.25 22.2 14.55 26.1 18 27.3C21.45 26.1 24.75 22.2 24.75 17.7V9.45C24.75 9.45 18 7.2 18 7.2Z",
    { x, y: yTop, scale: s, color: WHITE },
  );
  // Check stroke (mint on white shield)
  page.drawSvgPath("M15.2 17.55 L16.95 19.3 L20.95 14.7", {
    x,
    y: yTop,
    scale: s,
    borderColor: tile,
    borderWidth: Math.max(1.6, 2.25 * s),
  });
}

function drawPill(
  page: PDFPage,
  fontBold: PDFFont,
  opts: {
    x: number;
    y: number;
    label: string;
    fg: PdfColor;
    bg: PdfColor;
    size?: number;
    padX?: number;
    padY?: number;
  },
) {
  const size = opts.size ?? 8;
  const padX = opts.padX ?? 7;
  const padY = opts.padY ?? 3.5;
  const label = pdfSafe(opts.label);
  const tw = fontBold.widthOfTextAtSize(label, size);
  const w = tw + padX * 2;
  const h = size + padY * 2;
  page.drawRectangle({
    x: opts.x,
    y: opts.y - padY,
    width: w,
    height: h,
    color: opts.bg,
    borderColor: opts.fg,
    borderWidth: 0.6,
  });
  page.drawText(label, {
    x: opts.x + padX,
    y: opts.y,
    size,
    font: fontBold,
    color: opts.fg,
  });
  return { w, h };
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE.w, PAGE.h]);
  ctx.y = PAGE.h - MARGIN;
  drawPageChrome(ctx);
}

function ensureSpace(ctx: Ctx, need: number) {
  if (ctx.y - need < MARGIN + FOOTER_H) {
    newPage(ctx);
  }
}

function drawPageChrome(ctx: Ctx) {
  drawHeader(ctx);
  drawFooter(ctx);
}

function drawHeader(ctx: Ctx) {
  const { page, fontBold, font, report, accent } = ctx;
  const markSize = 28;
  // Align mark top with wordmark cap-height band
  const markTop = ctx.y + 6;

  // Soft top accent band
  page.drawRectangle({
    x: 0,
    y: PAGE.h - 6,
    width: PAGE.w,
    height: 6,
    color: accent,
  });

  drawLogoMark(page, MARGIN, markTop, markSize, accent);

  const textX = MARGIN + markSize + 10;
  page.drawText("CertShield", {
    x: textX,
    y: ctx.y - 2,
    size: 15,
    font: fontBold,
    color: INK,
  });
  page.drawText("Vendor compliance report", {
    x: textX,
    y: ctx.y - 17,
    size: 9,
    font,
    color: MUTED,
  });

  const date = new Date(report.generated_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const prepared = "Prepared for";
  const org = pdfSafe(report.org_name);
  const dateLine = pdfSafe(date);
  const orgW = fontBold.widthOfTextAtSize(org, 9);
  const preparedW = font.widthOfTextAtSize(prepared, 8);
  const dateW = font.widthOfTextAtSize(dateLine, 8);
  const blockW = Math.max(orgW, preparedW, dateW);
  const rightX = PAGE.w - MARGIN;
  page.drawText(prepared, {
    x: rightX - blockW,
    y: ctx.y - 1,
    size: 8,
    font,
    color: MUTED,
  });
  page.drawText(org, {
    x: rightX - orgW,
    y: ctx.y - 13,
    size: 9,
    font: fontBold,
    color: INK_SOFT,
  });
  page.drawText(dateLine, {
    x: rightX - dateW,
    y: ctx.y - 25,
    size: 8,
    font,
    color: MUTED,
  });

  ctx.y -= HEADER_H;
  page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE.w - MARGIN, y: ctx.y },
    thickness: 1,
    color: RULE,
  });
  ctx.y -= 14;
}

function drawFooter(ctx: Ctx) {
  const { page, font, report } = ctx;
  page.drawLine({
    start: { x: MARGIN, y: FOOTER_H },
    end: { x: PAGE.w - MARGIN, y: FOOTER_H },
    thickness: 0.6,
    color: RULE,
  });
  // Binding disclaimer (docs/01 + schema DISCLAIMER) — keep verbatim meaning via pdfSafe dashes
  const disc = wrap(report.disclaimer, font, 7.5, CONTENT_W - 56);
  let fy = FOOTER_H - 14;
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
  // Page numbers stamped after final save pass
}

function stampPageNumbers(doc: PDFDocument, font: PDFFont) {
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    page.drawRectangle({
      x: PAGE.w - MARGIN - 48,
      y: FOOTER_H - 22,
      width: 48,
      height: 14,
      color: WHITE,
    });
    const pager = `${i + 1} / ${pages.length}`;
    const pw = font.widthOfTextAtSize(pager, 8);
    page.drawText(pager, {
      x: PAGE.w - MARGIN - pw,
      y: FOOTER_H - 16,
      size: 8,
      font,
      color: MUTED,
    });
  }
}

function drawSectionLabel(ctx: Ctx, title: string) {
  ensureSpace(ctx, 28);
  ctx.page.drawText(pdfSafe(title.toUpperCase()), {
    x: MARGIN,
    y: ctx.y,
    size: 8,
    font: ctx.fontBold,
    color: MUTED,
  });
  // Accent underline tick
  const tw = ctx.fontBold.widthOfTextAtSize(title.toUpperCase(), 8);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 5,
    width: Math.min(tw, 72),
    height: 1.5,
    color: ctx.accent,
  });
  ctx.y -= 18;
}

function drawVendorBlock(ctx: Ctx) {
  const { page, font, fontBold, report } = ctx;
  const overall = report.document?.overall_verdict ?? null;
  ensureSpace(ctx, 70);

  // Soft panel behind vendor + verdict
  const panelTop = ctx.y + 4;
  const panelH = 56;
  page.drawRectangle({
    x: MARGIN,
    y: panelTop - panelH,
    width: CONTENT_W,
    height: panelH,
    color: WASH,
  });
  page.drawRectangle({
    x: MARGIN,
    y: panelTop - panelH,
    width: 3.5,
    height: panelH,
    color: overall ? verdictColor(overall) : ctx.accent,
  });

  const name = pdfSafe(report.vendor.name);
  page.drawText(name, {
    x: MARGIN + 14,
    y: ctx.y - 6,
    size: 14,
    font: fontBold,
    color: INK,
  });

  if (overall) {
    const pillLabel = overall;
    const tw = fontBold.widthOfTextAtSize(pillLabel, 9);
    const pillW = tw + 20;
    const pillH = 18;
    const px = PAGE.w - MARGIN - 12 - pillW;
    const py = ctx.y - 8;
    // Filled overall badge — stronger than per-row outline pills
    page.drawRectangle({
      x: px,
      y: py,
      width: pillW,
      height: pillH,
      color: verdictColor(overall),
    });
    page.drawText(pillLabel, {
      x: px + (pillW - tw) / 2,
      y: py + 5,
      size: 9,
      font: fontBold,
      color: WHITE,
    });
  }

  const metaParts = [
    report.vendor.trade ? `Trade: ${report.vendor.trade}` : null,
    report.vendor.email ? `Email: ${report.vendor.email}` : null,
    `Status: ${report.vendor.status.replaceAll("_", " ")}`,
  ].filter(Boolean) as string[];
  const meta = pdfSafe(metaParts.join("   |   "));
  page.drawText(meta, {
    x: MARGIN + 14,
    y: ctx.y - 22,
    size: 8.5,
    font,
    color: MUTED,
  });

  const docLine = report.document
    ? `Document: ${report.document.file_name}`
    : "Document: none on file";
  page.drawText(pdfSafe(docLine), {
    x: MARGIN + 14,
    y: ctx.y - 36,
    size: 8.5,
    font,
    color: INK_SOFT,
  });

  ctx.y -= panelH + 12;
}

function drawSummaryStats(ctx: Ctx) {
  const counts = countVerdicts(ctx.report);
  drawSectionLabel(ctx, "Summary");

  const stats: { key: Verdict; label: string; n: number }[] = [
    { key: "PASS", label: "Pass", n: counts.PASS },
    { key: "FAIL", label: "Fail", n: counts.FAIL },
    { key: "MISSING", label: "Missing", n: counts.MISSING },
    { key: "EXPIRING", label: "Expiring", n: counts.EXPIRING },
  ];

  const gap = 8;
  const cardW = (CONTENT_W - gap * 3) / 4;
  const cardH = 40;
  ensureSpace(ctx, cardH + 24);

  let x = MARGIN;
  for (const s of stats) {
    const fg = verdictColor(s.key);
    const bg = verdictWash(s.key);
    ctx.page.drawRectangle({
      x,
      y: ctx.y - cardH + 10,
      width: cardW,
      height: cardH,
      color: bg,
      borderColor: RULE,
      borderWidth: 0.5,
    });
    ctx.page.drawRectangle({
      x,
      y: ctx.y - cardH + 10,
      width: 3,
      height: cardH,
      color: fg,
    });
    const num = String(s.n);
    ctx.page.drawText(num, {
      x: x + 10,
      y: ctx.y - 4,
      size: 15,
      font: ctx.fontBold,
      color: fg,
    });
    ctx.page.drawText(s.label.toUpperCase(), {
      x: x + 10,
      y: ctx.y - 20,
      size: 7,
      font: ctx.fontBold,
      color: MUTED,
    });
    x += cardW + gap;
  }
  ctx.y -= cardH + 6;

  // Narrative summary under stats
  const lines = wrap(ctx.report.summary, ctx.font, 9, CONTENT_W);
  ensureSpace(ctx, lines.length * 11 + 8);
  for (const line of lines) {
    ctx.page.drawText(pdfSafe(line), {
      x: MARGIN,
      y: ctx.y,
      size: 9,
      font: ctx.font,
      color: INK_SOFT,
    });
    ctx.y -= 11;
  }
  ctx.y -= 10;
}

function drawRequirements(ctx: Ctx) {
  drawSectionLabel(ctx, "Requirements check");

  if (ctx.report.lines.length === 0) {
    ensureSpace(ctx, 24);
    ctx.page.drawText(
      "No requirement lines evaluated - upload a COI to run checks.",
      {
        x: MARGIN,
        y: ctx.y,
        size: 9,
        font: ctx.font,
        color: MUTED,
      },
    );
    ctx.y -= 20;
    return;
  }

  for (const line of ctx.report.lines) {
    const reasonLines = wrap(line.reason, ctx.font, 8.5, CONTENT_W - 96);
    const padTop = 10;
    const padBot = 10;
    const rowH = Math.max(34, padTop + 12 + reasonLines.length * 10 + padBot);
    ensureSpace(ctx, rowH + 6);

    const rowTop = ctx.y + 4;
    const rowBottom = rowTop - rowH;
    ctx.page.drawRectangle({
      x: MARGIN,
      y: rowBottom,
      width: CONTENT_W,
      height: rowH,
      color: WHITE,
      borderColor: RULE,
      borderWidth: 0.55,
    });
    // Left status wash strip
    ctx.page.drawRectangle({
      x: MARGIN,
      y: rowBottom,
      width: 3.5,
      height: rowH,
      color: verdictColor(line.verdict),
    });

    const textTop = rowTop - padTop - 2;
    drawPill(ctx.page, ctx.fontBold, {
      x: MARGIN + 12,
      y: textTop,
      label: line.verdict,
      fg: verdictColor(line.verdict),
      bg: verdictWash(line.verdict),
      size: 7,
      padX: 5.5,
      padY: 2.8,
    });

    ctx.page.drawText(pdfSafe(line.label), {
      x: MARGIN + 76,
      y: textTop,
      size: 9.5,
      font: ctx.fontBold,
      color: INK,
    });

    let ry = textTop - 14;
    for (const rl of reasonLines) {
      ctx.page.drawText(pdfSafe(rl), {
        x: MARGIN + 76,
        y: ry,
        size: 8.5,
        font: ctx.font,
        color: MUTED,
      });
      ry -= 10;
    }

    ctx.y = rowBottom - 6;
  }
  ctx.y -= 4;
}

function drawAskAgent(ctx: Ctx) {
  drawSectionLabel(ctx, "What to ask the insurance agent");

  if (ctx.report.ask_agent.length === 0) {
    ensureSpace(ctx, 24);
    ctx.page.drawText(
      "No gaps to chase - keep the certificate on file and monitor expirations.",
      {
        x: MARGIN,
        y: ctx.y,
        size: 9,
        font: ctx.font,
        color: MUTED,
      },
    );
    ctx.y -= 18;
    return;
  }

  let n = 1;
  for (const ask of ctx.report.ask_agent) {
    const bodyLines = wrap(ask, ctx.font, 9, CONTENT_W - 34);
    const blockH = bodyLines.length * 11 + 8;
    ensureSpace(ctx, blockH + 4);

    // Number circle
    const cy = ctx.y + 1;
    ctx.page.drawCircle({
      x: MARGIN + 7,
      y: cy,
      size: 7,
      color: MINT_WASH,
      borderColor: ctx.accent,
      borderWidth: 0.75,
    });
    const num = String(n);
    const nw = ctx.fontBold.widthOfTextAtSize(num, 7.5);
    ctx.page.drawText(num, {
      x: MARGIN + 7 - nw / 2,
      y: cy - 2.5,
      size: 7.5,
      font: ctx.fontBold,
      color: ctx.accent,
    });

    let ty = ctx.y;
    for (const bl of bodyLines) {
      ctx.page.drawText(pdfSafe(bl), {
        x: MARGIN + 22,
        y: ty,
        size: 9,
        font: ctx.font,
        color: INK_SOFT,
      });
      ty -= 11;
    }
    ctx.y = ty - 5;
    n += 1;
  }
}

function drawSoftCta(ctx: Ctx) {
  // Keep CTA on the current page when possible — avoid a lonely marketing page.
  const need = 34;
  if (ctx.y - need < MARGIN + FOOTER_H) {
    // Not enough room: skip CTA rather than forcing a sparse second page.
    // Disclaimer footer still carries on every page.
    return;
  }
  ctx.y -= 2;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 26,
    width: CONTENT_W,
    height: 30,
    color: MINT_WASH,
  });
  ctx.page.drawText(pdfSafe(ctx.report.cta), {
    x: MARGIN + 12,
    y: ctx.y - 8,
    size: 8.5,
    font: ctx.fontBold,
    color: INK_SOFT,
  });
  ctx.page.drawText("Never work with an uninsured vendor again.", {
    x: MARGIN + 12,
    y: ctx.y - 20,
    size: 7.5,
    font: ctx.font,
    color: MUTED,
  });
  ctx.y -= 34;
}

/** B10 — branded per-vendor compliance PDF (status, gaps, ask-agent, disclaimer). */
export async function renderComplianceReportPdf(
  report: ComplianceReport,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const accent = brandColor(report.brand_color);

  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE.w, PAGE.h]),
    font,
    fontBold,
    y: PAGE.h - MARGIN,
    report,
    accent,
  };
  drawPageChrome(ctx);

  drawVendorBlock(ctx);
  drawSummaryStats(ctx);
  drawRequirements(ctx);
  drawAskAgent(ctx);
  drawSoftCta(ctx);

  stampPageNumbers(doc, font);
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
