/**
 * B7 — layout and font anomaly signals.
 *
 * A tampered COI is usually not a forged document; it is a real certificate
 * with one number retyped. That leaves traces in the PDF's own structure: the
 * edited page carries a font the rest of the form never uses, or the file
 * gained an incremental-update section after it was signed.
 *
 * **Every signal here is `info` severity, deliberately.** A font count is
 * circumstantial, not evidence: legitimate certificates get re-saved by agency
 * software, flattened by scanners, and stamped by portals all the time. The
 * product says "worth a second look at the original", never "this vendor
 * altered their certificate" — accusing a real contractor of insurance fraud
 * on a heuristic is a reputational and legal problem far worse than missing a
 * forgery that human review would catch anyway (docs/08 §3).
 *
 * These read the PDF's structure only. No verdict depends on them.
 */

import { PDFDocument, PDFDict, PDFName } from "pdf-lib";

import type { FraudSignal } from "./signals";

/** ACORD forms are typed in a handful of faces; well past that is unusual. */
const FONT_COUNT_ATTENTION_THRESHOLD = 8;

/**
 * Fonts used by an ACORD 25 that a *reader* added rather than the issuer —
 * annotation and typewriter tools default to these, so seeing one alongside
 * the form's own faces suggests the page was typed on after issue.
 */
const ANNOTATION_FONT_HINTS = ["courier", "comic", "impact", "wingdings"];

export type LayoutAnalysis = {
  signals: FraudSignal[];
  /** Distinct base font names found, for the review UI to show verbatim. */
  fonts: string[];
  pageCount: number;
  /** PDF grew by an incremental update after its original save. */
  incrementallyUpdated: boolean;
};

/**
 * Fonts per page, tolerating structural damage.
 *
 * Real certificates come out of scanners and decades-old agency software with
 * dangling object refs; pdf-lib throws on those from `getPages()` and from
 * `lookup()`, *after* the document loaded fine. Since this is an advisory
 * signal attached to the extraction pipeline, a malformed PDF must degrade to
 * "no signal" and never take an upload down with it.
 */
function baseFontNames(pdf: PDFDocument): { fonts: string[]; pageCount: number } {
  const names = new Set<string>();

  let pages: ReturnType<PDFDocument["getPages"]>;
  try {
    pages = pdf.getPages();
  } catch {
    return { fonts: [], pageCount: 0 };
  }

  for (const page of pages) {
    try {
      const resources = page.node.get(PDFName.of("Resources"));
      if (!(resources instanceof PDFDict)) continue;
      const fontDict = resources.get(PDFName.of("Font"));
      if (!(fontDict instanceof PDFDict)) continue;

      for (const key of fontDict.keys()) {
        try {
          const font = fontDict.lookup(key);
          if (!(font instanceof PDFDict)) continue;
          const base = font.get(PDFName.of("BaseFont"));
          if (!base) continue;
          // "/ABCDEF+Helvetica-Bold" → "Helvetica-Bold": the six-letter prefix
          // is a per-embedding subset tag and would inflate every count.
          const raw = base.toString().replace(/^\//, "");
          names.add(raw.replace(/^[A-Z]{6}\+/, ""));
        } catch {
          // Broken font entry — skip it, keep the rest of the page.
        }
      }
    } catch {
      // Broken page — skip it, keep the rest of the document.
    }
  }

  return { fonts: [...names].sort(), pageCount: pages.length };
}

/**
 * Count `%%EOF` markers. More than one means the file was saved, then saved
 * again *on top of itself* — the normal signature of an annotation or form
 * fill, and also of an edit made after the agency issued the certificate.
 */
function countEofMarkers(bytes: Uint8Array): number {
  const needle = "%%EOF";
  const text = Buffer.from(bytes).toString("latin1");
  let count = 0;
  let index = text.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(needle, index + needle.length);
  }
  return count;
}

export async function analyzePdfLayout(
  pdfBytes: Uint8Array | ArrayBuffer,
): Promise<LayoutAnalysis> {
  const bytes =
    pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);

  const empty: LayoutAnalysis = {
    signals: [],
    fonts: [],
    pageCount: 0,
    incrementallyUpdated: false,
  };

  // The whole analysis is best-effort. An unreadable structure is not a risk
  // signal — a scanner or decades-old agency software is far likelier than
  // tampering — and this runs inside the extraction pipeline, so it must never
  // be the reason an upload fails.
  let signals: FraudSignal[];
  let fonts: string[];
  let pageCount: number;
  let incrementallyUpdated: boolean;

  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const parsed = baseFontNames(pdf);
    fonts = parsed.fonts;
    pageCount = parsed.pageCount;
    incrementallyUpdated = countEofMarkers(bytes) > 1;
    signals = [];
  } catch {
    return empty;
  }

  if (fonts.length > FONT_COUNT_ATTENTION_THRESHOLD) {
    signals.push({
      code: "pdf_many_fonts",
      severity: "info",
      message: `Uses ${fonts.length} different fonts (${fonts.slice(0, 4).join(", ")}…). Certificates issued straight from agency software usually use fewer. Not evidence of anything — just worth comparing against the original.`,
    });
  }

  const annotationFonts = fonts.filter((f) =>
    ANNOTATION_FONT_HINTS.some((hint) => f.toLowerCase().includes(hint)),
  );
  if (annotationFonts.length > 0 && fonts.length > annotationFonts.length) {
    signals.push({
      code: "pdf_annotation_font",
      severity: "info",
      message: `Contains a typewriter/annotation font (${annotationFonts.join(", ")}) alongside the form's own fonts. Often means text was typed onto the page in a PDF reader after it was issued — commonly legitimate, e.g. a project name added by the property manager.`,
    });
  }

  // NOT a signal: incremental updates.
  //
  // Measured against the seven real ACORD certificates in `public/samples/`,
  // five of seven legitimate documents carry an incremental-update section —
  // agency software, form fills, and portal stamps all produce one. A flag
  // that fires on ~70% of good documents is noise, and noise teaches
  // reviewers to dismiss the signals that do matter. It stays on the returned
  // analysis as a *fact* the review UI can show next to the PDF, but it is
  // not raised as a risk. Do not promote it without new evidence.

  return { signals, fonts, pageCount, incrementallyUpdated };
}
