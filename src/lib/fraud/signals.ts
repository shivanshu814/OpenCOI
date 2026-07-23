/**
 * B7 — Fraud / risk signals (never a guarantee). Present as "risk signals" only.
 */

export type FraudSignalSeverity = "info" | "warn" | "high";

export type FraudSignal = {
  code: string;
  severity: FraudSignalSeverity;
  message: string;
};

const EDITOR_HINTS = [
  "photoshop",
  "illustrator",
  "gimp",
  "acrobat distiller",
  "nitro",
  "foxit",
  "pdf-xchange",
  "preview",
  "canva",
];

/** Inspect PDF info dictionary via pdf-lib. */
export async function analyzePdfMetadata(
  pdfBytes: Uint8Array | ArrayBuffer,
): Promise<FraudSignal[]> {
  const signals: FraudSignal[] = [];
  try {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    const creator = (doc.getCreator() ?? "").toLowerCase();
    const producer = (doc.getProducer() ?? "").toLowerCase();
    const combined = `${creator} ${producer}`;

    for (const hint of EDITOR_HINTS) {
      if (combined.includes(hint)) {
        signals.push({
          code: "pdf_editor_metadata",
          severity: "warn",
          message: `PDF metadata mentions an editor/tool (${hint}) — review authenticity.`,
        });
        break;
      }
    }

    const created = doc.getCreationDate() ?? null;
    const modified = doc.getModificationDate() ?? null;
    if (created && modified && modified.getTime() > created.getTime() + 60_000) {
      signals.push({
        code: "pdf_modified_after_create",
        severity: "info",
        message:
          "PDF modification date is after creation date — common for legitimate stamps, worth a glance.",
      });
    }

    if (!creator && !producer) {
      signals.push({
        code: "pdf_missing_metadata",
        severity: "info",
        message: "PDF has little/no Creator/Producer metadata.",
      });
    }
  } catch {
    signals.push({
      code: "pdf_metadata_unreadable",
      severity: "info",
      message: "Could not read PDF metadata for risk signals.",
    });
  }
  return signals;
}

/** Same policy number on another vendor in the org (B7 reuse signal). */
export function policyReuseSignals(input: {
  policyNumbers: string[];
  otherVendorPolicyHits: { vendorName: string; policyNumber: string }[];
}): FraudSignal[] {
  const signals: FraudSignal[] = [];
  for (const hit of input.otherVendorPolicyHits) {
    signals.push({
      code: "policy_number_reused",
      severity: "high",
      message: `Policy ${hit.policyNumber} also appears on vendor "${hit.vendorName}".`,
    });
  }
  return signals;
}

/** Insured name vs vendor legal name mismatch (B5-adjacent risk signal). */
export function insuredNameMismatchSignal(input: {
  insuredName: string | null;
  vendorName: string;
  similarity: number;
}): FraudSignal | null {
  if (!input.insuredName?.trim()) return null;
  if (input.similarity >= 0.72) return null;
  return {
    code: "insured_name_mismatch",
    severity: "high",
    message: `Insured name "${input.insuredName}" weakly matches vendor "${input.vendorName}" (similarity ${input.similarity.toFixed(2)}).`,
  };
}
