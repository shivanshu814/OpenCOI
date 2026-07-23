/**
 * A5 — Documenso e-sign. Without DOCUMENSO_API_KEY → demo signing URLs.
 */

import { appBaseUrl } from "@/lib/app-url";

export function isDocumensoConfigured(): boolean {
  return Boolean(
    process.env.DOCUMENSO_API_KEY?.trim() &&
    process.env.DOCUMENSO_API_URL?.trim(),
  );
}

export type CreateSigningRequest = {
  title: string;
  signerEmail: string;
  signerName: string;
  /** Optional PDF as base64 — Documenso upload when configured. */
  pdfBase64?: string;
};

export type CreateSigningResult = {
  ok: boolean;
  demo: boolean;
  documentId: string;
  signingUrl: string;
  error?: string;
};

export async function createAgreementSigning(
  input: CreateSigningRequest,
): Promise<CreateSigningResult> {
  if (!isDocumensoConfigured()) {
    const demoId = `demo_doc_${Date.now()}`;
    return {
      ok: true,
      demo: true,
      documentId: demoId,
      signingUrl: `${appBaseUrl()}/sign/demo?title=${encodeURIComponent(input.title)}&email=${encodeURIComponent(input.signerEmail)}`,
    };
  }

  const base = process.env.DOCUMENSO_API_URL!.replace(/\/$/, "");
  const key = process.env.DOCUMENSO_API_KEY!.trim();

  try {
    // Minimal Documenso cloud-compatible create; adjust field names if API drifts.
    const res = await fetch(`${base}/api/v1/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: input.title,
        recipients: [
          {
            email: input.signerEmail,
            name: input.signerName,
            role: "SIGNER",
          },
        ],
      }),
    });
    const data = (await res.json()) as {
      id?: string | number;
      uploadUrl?: string;
      recipients?: { signingUrl?: string }[];
      message?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        demo: false,
        documentId: "",
        signingUrl: "",
        error: data.message ?? `Documenso HTTP ${res.status}`,
      };
    }
    const documentId = String(data.id ?? "");
    const signingUrl =
      data.recipients?.[0]?.signingUrl ??
      `${base}/sign/${documentId}`;
    return { ok: true, demo: false, documentId, signingUrl };
  } catch (e) {
    return {
      ok: false,
      demo: false,
      documentId: "",
      signingUrl: "",
      error: e instanceof Error ? e.message : "Documenso request failed",
    };
  }
}
