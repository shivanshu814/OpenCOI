/**
 * Generate sample ACORD-style COI PDFs into public/samples/ for upload testing.
 * Run: npx tsx scripts/generate-sample-cois.ts
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Sample = {
  file: string;
  title: string;
  insured: string;
  trade: string;
  glOcc: string;
  glAgg: string;
  effective: string;
  expiration: string;
  policy: string;
  naic: string;
  carrier: string;
  holder: string;
  extra?: string[];
};

const samples: Sample[] = [
  {
    file: "sample-acord-25-gl-roofer.pdf",
    title: "CERTIFICATE OF LIABILITY INSURANCE (sample ACORD 25)",
    insured: "Sunshine Roofing LLC",
    trade: "Roofer",
    glOcc: "1,000,000",
    glAgg: "2,000,000",
    effective: "01/01/2026",
    expiration: "01/01/2027",
    policy: "GL-998877",
    naic: "12345",
    carrier: "Example Mutual Insurance Co",
    holder: "Demo Property Management LLC",
    extra: [
      "DESCRIPTION: Roofing ops. Additional Insured: Certificate Holder (CG 20 10 12/19).",
      "Products-Comp/Op Agg: 2,000,000 | Med Exp: 5,000",
    ],
  },
  {
    file: "sample-acord-25-gl-wc-plumber.pdf",
    title: "CERTIFICATE OF LIABILITY INSURANCE (sample ACORD 25)",
    insured: "Bay Plumbing Co",
    trade: "Plumber",
    glOcc: "1,000,000",
    glAgg: "2,000,000",
    effective: "01/01/2026",
    expiration: "12/31/2026",
    policy: "GL-445566",
    naic: "25674",
    carrier: "Travelers Indemnity Company",
    holder: "Oak Street LLC",
    extra: [
      "WORKERS COMPENSATION: WC-778899 | Each Accident 1,000,000 | Disease Policy 1,000,000",
      "Effective 01/01/2026 | Expiration 12/31/2026 | NAIC 25674",
    ],
  },
  {
    file: "sample-acord-25-gl-expiring.pdf",
    title: "CERTIFICATE OF LIABILITY INSURANCE (sample ACORD 25)",
    insured: "GreenPath Landscaping",
    trade: "Landscaper",
    glOcc: "1,000,000",
    glAgg: "2,000,000",
    effective: "08/01/2025",
    expiration: "08/15/2026",
    policy: "GL-112233",
    naic: "20443",
    carrier: "Hartford Fire Insurance Company",
    holder: "Demo Property Management LLC",
    extra: [
      "NOTE (sample): Near-term expiration - expect EXPIRING in checks.",
      "Damage To Premises: 100,000 | Med Exp: 5,000",
    ],
  },
];

async function build(s: Sample): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([612, 792]);
  let y = 750;
  const left = 48;
  const draw = (text: string, size = 10, useBold = false) => {
    page.drawText(text.slice(0, 95), {
      x: left,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= size + 8;
  };
  draw("ACORD", 14, true);
  draw(s.title, 11, true);
  y -= 6;
  draw(
    "THIS CERTIFICATE IS ISSUED AS A MATTER OF INFORMATION ONLY (SAMPLE FOR TESTING).",
    8,
  );
  y -= 4;
  draw("PRODUCER: Harbor Insurance Agency | Maria Lopez | 305-555-0142", 10);
  draw(`INSURED: ${s.insured} (${s.trade})`, 10, true);
  draw(`INSURER A: ${s.carrier} | NAIC #: ${s.naic}`, 10);
  y -= 4;
  draw("COVERAGES - GENERAL LIABILITY", 11, true);
  draw(`Policy Number: ${s.policy}`, 10);
  draw(
    `Policy Effective Date: ${s.effective} | Policy Expiration Date: ${s.expiration}`,
    10,
  );
  draw(`Each Occurrence: $${s.glOcc}`, 10);
  draw(`General Aggregate: $${s.glAgg}`, 10);
  draw("Additional Insured: Y | Waiver of Subrogation: N", 10);
  y -= 4;
  for (const line of s.extra ?? []) draw(line, 9);
  y -= 6;
  draw(`CERTIFICATE HOLDER: ${s.holder}`, 10, true);
  draw(
    "CANCELLATION: Should any of the above described policies be cancelled...",
    8,
  );
  y -= 10;
  draw(
    "CertShield sample PDF - for product testing only. Not a real certificate.",
    8,
  );
  return Buffer.from(await doc.save());
}

async function main() {
  const outDir = join(process.cwd(), "public", "samples");
  mkdirSync(outDir, { recursive: true });
  for (const s of samples) {
    const buf = await build(s);
    writeFileSync(join(outDir, s.file), buf);
    console.log("wrote", s.file, buf.length, "bytes");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
