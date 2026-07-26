/**
 * Sample COI PDFs for upload testing (served from /samples/…).
 *
 * These are **real ACORD 25 documents** — the specimen forms US property
 * managers and public authorities actually hand to vendors — not synthetic
 * PDFs drawn by a script. The generated ones were replaced because they were
 * pixel-clean single-layer text and told us nothing about how the extractor
 * behaves on the real thing: multi-edition layouts (2009/2010/2016), AcroForm
 * field values, scanner artefacts, and annotation layers.
 *
 * Important: every publicly available ACORD sample is a *specimen*. None
 * carries a genuine insured, carrier, or policy number — they use instructional
 * stand-ins ("Your Insurance Company", "MM/DD/YY", "XYZ-123"). That makes them
 * excellent **negative tests**: a correct extraction returns nulls and routes
 * to review, and `lib/extraction/placeholders.ts` enforces exactly that.
 *
 * A genuine filled certificate is still required for the Month-3 ≥98% accuracy
 * gate (docs/11) — that has to come from a real customer, redacted.
 */

export type SampleCoi = {
  id: string;
  /** Public URL path */
  href: string;
  /** Suggested filename when attaching */
  fileName: string;
  label: string;
  hint: string;
};

export const SAMPLE_COIS: SampleCoi[] = [
  {
    id: "acord-25-dasny-demo",
    href: "/samples/acord-25-dasny-demo.pdf",
    fileName: "acord-25-dasny-demo.pdf",
    label: "ACORD 25 · filled demo (DASNY)",
    hint: "GL $2M/$4M, auto, umbrella, WC · real certificate holder + AI wording",
  },
  {
    id: "acord-25-nyc-handout",
    href: "/samples/acord-25-nyc-vendor-handout.pdf",
    fileName: "acord-25-nyc-vendor-handout.pdf",
    label: "ACORD 25 · NYC vendor handout",
    hint: "Blank specimen with $1M/$2M printed — expect MISSING + review",
  },
  {
    id: "acord-25-2009-specimen",
    href: "/samples/acord-25-2009-specimen.pdf",
    fileName: "acord-25-2009-specimen.pdf",
    label: "ACORD 25 (2009) · agency specimen",
    hint: "Older layout, 2 pages · GL $1M each occurrence, $50K rented premises",
  },
  {
    id: "acord-25-2010-consultant",
    href: "/samples/acord-25-2010-consultant-template.pdf",
    fileName: "acord-25-2010-consultant-template.pdf",
    label: "ACORD 25 (2010) · consultant template",
    hint: "2010/05 edition · GL $1M/$2M requirement template",
  },
  {
    id: "acord-25-2009-exhibitor",
    href: "/samples/acord-25-2009-exhibitor-sample.pdf",
    fileName: "acord-25-2009-exhibitor-sample.pdf",
    label: "ACORD 25 (2009) · annotated exhibitor sample",
    hint: "Highlight + typewriter annotation layers — OCR robustness case",
  },
  {
    id: "acord-25-2016-blank",
    href: "/samples/acord-25-2016-blank.pdf",
    fileName: "acord-25-2016-blank.pdf",
    label: "ACORD 25 (2016) · blank",
    hint: "Current edition, no data · nothing may be invented from it",
  },
  {
    id: "acord-25-2016-fillable",
    href: "/samples/acord-25-2016-fillable.pdf",
    fileName: "acord-25-2016-fillable.pdf",
    label: "ACORD 25 (2016) · empty fillable",
    hint: "AcroForm with 129 empty fields · form-field parsing case",
  },
];

/** Fetch a sample PDF and return a File ready for FormData upload. */
export async function loadSampleCoiFile(sample: SampleCoi): Promise<File> {
  const res = await fetch(sample.href);
  if (!res.ok) {
    throw new Error(`Could not load sample (${res.status})`);
  }
  const blob = await res.blob();
  return new File([blob], sample.fileName, {
    type: "application/pdf",
    lastModified: Date.now(),
  });
}
