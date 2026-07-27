/**
 * Agreement PDFs for A5 e-sign wiring tests (served from /samples/…).
 *
 * CertShield never drafts hold-harmless / indemnification language
 * (docs/08 §3 — not legal advice). The specimen below is instructional
 * only: it lets an admin exercise Documenso without a real attorney PDF.
 * Real vendor signing must use the customer's own lawyer-reviewed upload.
 */

export type SampleAgreement = {
  id: string;
  href: string;
  fileName: string;
  label: string;
  hint: string;
};

export const SAMPLE_AGREEMENTS: SampleAgreement[] = [
  {
    id: "esign-specimen",
    href: "/samples/agreement-esign-specimen.pdf",
    fileName: "agreement-esign-specimen.pdf",
    label: "E-sign specimen (wiring test)",
    hint: "Not a real hold-harmless — use only to verify signing links",
  },
];
