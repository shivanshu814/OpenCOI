/**
 * Sample COI PDFs for upload testing (served from /samples/…).
 * Regenerate: npx tsx scripts/generate-sample-cois.ts
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
    id: "gl-roofer",
    href: "/samples/sample-acord-25-gl-roofer.pdf",
    fileName: "sample-acord-25-gl-roofer.pdf",
    label: "GL roofer (pass-shaped)",
    hint: "Sunshine Roofing · $1M/$2M · expires 2027-01-01",
  },
  {
    id: "gl-wc-plumber",
    href: "/samples/sample-acord-25-gl-wc-plumber.pdf",
    fileName: "sample-acord-25-gl-wc-plumber.pdf",
    label: "GL + WC plumber",
    hint: "Bay Plumbing · GL + workers' comp lines",
  },
  {
    id: "gl-expiring",
    href: "/samples/sample-acord-25-gl-expiring.pdf",
    fileName: "sample-acord-25-gl-expiring.pdf",
    label: "GL landscaper (expiring)",
    hint: "GreenPath · near-term expiration for EXPIRING checks",
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
