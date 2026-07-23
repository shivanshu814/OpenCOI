import type { FraudSignal } from "@/lib/fraud/signals";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PackAuditEvent = {
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_type: string;
};

export type PackMessage = {
  created_at: string;
  channel: string;
  template_key: string | null;
  subject: string | null;
  to_email: string | null;
  status: string;
};

export type PackDocumentMeta = {
  id: string;
  file_name: string;
  status: string;
  doc_kind?: string;
  created_at: string;
};

/** Build a summary PDF for litigation / audit packs. */
export async function buildPackSummaryPdf(input: {
  title: string;
  subtitle: string;
  vendors?: { name: string; status: string }[];
  documents: PackDocumentMeta[];
  messages: PackMessage[];
  audit: PackAuditEvent[];
  checksSummary?: string;
  fraudSignals?: FraudSignal[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([612, 792]);
  let y = 750;
  const left = 48;

  const write = (text: string, size = 10, useBold = false) => {
    if (y < 60) {
      page = doc.addPage([612, 792]);
      y = 750;
    }
    page.drawText(text.slice(0, 95), {
      x: left,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= size + 6;
  };

  write(input.title, 16, true);
  write(input.subtitle, 10);
  y -= 8;
  write(
    "Document review assistance — not legal, insurance, or professional advice.",
    8,
  );
  y -= 12;

  if (input.vendors?.length) {
    write("Vendors", 12, true);
    for (const v of input.vendors) write(`· ${v.name} — ${v.status}`);
    y -= 8;
  }

  if (input.checksSummary) {
    write("Compliance summary", 12, true);
    write(input.checksSummary);
    y -= 8;
  }

  write(`Documents (${input.documents.length})`, 12, true);
  for (const d of input.documents.slice(0, 40)) {
    write(
      `· ${d.file_name} [${d.doc_kind ?? "coi"}] ${d.status} ${d.created_at.slice(0, 10)}`,
    );
  }
  y -= 8;

  write(`Messages (${input.messages.length})`, 12, true);
  for (const m of input.messages.slice(0, 40)) {
    write(
      `· ${m.created_at.slice(0, 16)} ${m.channel} ${m.template_key ?? ""} ${m.status}`,
    );
  }
  y -= 8;

  write(`Audit events (${input.audit.length})`, 12, true);
  for (const a of input.audit.slice(0, 60)) {
    write(
      `· ${a.created_at.slice(0, 16)} ${a.action} ${a.entity_type}/${a.entity_id.slice(0, 8)}`,
    );
  }

  if (input.fraudSignals?.length) {
    y -= 8;
    write("Risk signals (not a guarantee)", 12, true);
    for (const s of input.fraudSignals) write(`· [${s.severity}] ${s.message}`);
  }

  return doc.save();
}

/** Bundle summary PDF + optional file buffers into a ZIP (jszip). */
export async function zipPack(files: {
  name: string;
  bytes: Uint8Array | Buffer;
}[]): Promise<Uint8Array> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, f.bytes);
  }
  const out = await zip.generateAsync({ type: "uint8array" });
  return out;
}
