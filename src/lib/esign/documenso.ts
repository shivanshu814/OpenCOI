/**
 * A5 — Documenso e-sign.
 *
 * Without DOCUMENSO_API_KEY / DOCUMENSO_API_URL we hand back a demo signing URL
 * that points at our own `/sign/demo` page. With them configured we drive the
 * real Documenso v1 flow:
 *
 *   1. POST   {base}/api/v1/documents            -> { uploadUrl, documentId, recipients[] }
 *   2. PUT    {uploadUrl}  (the PDF bytes)       -> stores the file
 *   3. POST   {base}/api/v1/documents/{id}/fields -> places a SIGNATURE for the signer
 *   4. POST   {base}/api/v1/documents/{id}/send  -> moves DRAFT -> PENDING, emails signers
 *
 * Step 3 is required: Documenso refuses to send when a SIGNER has no signature
 * field ("Signers must have at least one signature field"). Step 4 is what
 * makes `/sign/<token>` resolve. A document that was created but never
 * uploaded-to and never sent stays a DRAFT, and Documenso 404s its signing
 * page — which is exactly how an earlier implementation produced dead links.
 *
 * Honesty rule (CLAUDE.md): we NEVER invent a signing URL. If the API response
 * does not carry a real per-recipient signing URL or token, this returns
 * `ok: false` with the API's own error text so the caller stores nothing and
 * surfaces the failure. A stored URL that 404s is worse than a visible error.
 */

import { appBaseUrl } from "@/lib/app-url";

export type DocumensoConfig = {
  /** Origin only, no `/api/v1` suffix, no trailing slash. */
  base: string;
  key: string;
};

/**
 * Accepts either the origin (`https://app.documenso.com`) or the API root
 * (`https://app.documenso.com/api/v1`) and normalizes to the origin, so a
 * configured suffix cannot produce `/api/v1/api/v1/documents`.
 *
 * A URL without a scheme, or one that is not https, is treated as
 * unconfigured — building `https://` onto a guess would only move the failure
 * downstream into a link we email to a vendor.
 */
export function normalizeDocumensoBaseUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null; // no scheme, or otherwise unparseable
  }
  if (parsed.protocol !== "https:") return null;

  const path = parsed.pathname.replace(/\/+$/, "").replace(/\/api(\/v\d+)?$/i, "");
  return `${parsed.origin}${path}`;
}

export function documensoConfig(): DocumensoConfig | null {
  const key = process.env.DOCUMENSO_API_KEY?.trim();
  if (!key) return null;
  const base = normalizeDocumensoBaseUrl(process.env.DOCUMENSO_API_URL);
  if (!base) return null;
  return { base, key };
}

export function isDocumensoConfigured(): boolean {
  return documensoConfig() !== null;
}

export type CreateSigningRequest = {
  title: string;
  signerEmail: string;
  signerName: string;
  /** The agreement PDF as base64. Required whenever Documenso is configured. */
  pdfBase64?: string;
};

/**
 * Discriminated so a failure literally cannot carry a URL: on `ok: false` both
 * `documentId` and `signingUrl` are typed as `""`, and `error` is always present.
 */
export type CreateSigningResult =
  | {
    ok: true;
    demo: boolean;
    documentId: string;
    signingUrl: string;
    error?: undefined;
  }
  | {
    ok: false;
    demo: false;
    documentId: "";
    signingUrl: "";
    error: string;
  };

function failure(error: string): CreateSigningResult {
  return { ok: false, demo: false, documentId: "", signingUrl: "", error };
}

/** Documenso error bodies vary by layer (ts-rest, next, S3); dig out real text. */
function errorText(body: unknown, status: number, step: string): string {
  if (typeof body === "string" && body.trim()) {
    return `Documenso ${step} failed (HTTP ${status}): ${body.trim().slice(0, 300)}`;
  }
  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    const message = rec.message ?? rec.error ?? rec.detail;
    if (typeof message === "string" && message.trim()) {
      return `Documenso ${step} failed (HTTP ${status}): ${message.trim().slice(0, 300)}`;
    }
  }
  return `Documenso ${step} failed (HTTP ${status})`;
}

/** Never throws on an HTML/empty body — a 404 page must not look like a crash. */
async function readBody(res: Response): Promise<unknown> {
  const raw = await res.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

type CreateDocumentResponse = {
  uploadUrl?: unknown;
  documentId?: unknown;
  recipients?: unknown;
};

type ParsedRecipient = {
  recipientId: number;
  token: string;
  signingUrl: string;
};

function parseRecipient(value: unknown): ParsedRecipient | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const rawId = rec.recipientId ?? rec.id;
  const recipientId =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string" && /^\d+$/.test(rawId.trim())
        ? Number(rawId.trim())
        : NaN;
  if (!Number.isFinite(recipientId) || recipientId <= 0) return null;
  const token = typeof rec.token === "string" ? rec.token.trim() : "";
  const signingUrl =
    typeof rec.signingUrl === "string" ? rec.signingUrl.trim() : "";
  if (!token && !signingUrl) return null;
  return { recipientId, token, signingUrl };
}

function decodeBase64Pdf(base64: string): ArrayBuffer | null {
  try {
    const bytes = Buffer.from(base64.replace(/\s+/g, ""), "base64");
    // Copy into a standalone ArrayBuffer: Node's Buffer is a view over a
    // shared pool, so passing it straight to fetch can send neighbouring bytes.
    return bytes.byteLength > 0 ? new Uint8Array(bytes).buffer : null;
  } catch {
    return null;
  }
}

export async function createAgreementSigning(
  input: CreateSigningRequest,
): Promise<CreateSigningResult> {
  const config = documensoConfig();

  if (!config) {
    const demoId = `demo_doc_${Date.now()}`;
    return {
      ok: true,
      demo: true,
      documentId: demoId,
      signingUrl: `${appBaseUrl()}/sign/demo?title=${encodeURIComponent(input.title)}&email=${encodeURIComponent(input.signerEmail)}`,
    };
  }

  // Documenso signs a file, not a title. Without one the document would be an
  // empty DRAFT whose signing page 404s, so fail loudly instead.
  if (!input.pdfBase64?.trim()) {
    return failure(
      "No agreement PDF was supplied. Documenso needs the agreement file to create a signable document.",
    );
  }
  const pdf = decodeBase64Pdf(input.pdfBase64);
  if (!pdf) {
    return failure("The agreement PDF could not be decoded (invalid base64).");
  }

  const { base, key } = config;

  try {
    // 1 — create the document shell and claim an upload slot.
    const createRes = await fetch(`${base}/api/v1/documents`, {
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
    const createBody = await readBody(createRes);
    if (!createRes.ok) {
      return failure(errorText(createBody, createRes.status, "document create"));
    }

    const created = (createBody ?? {}) as CreateDocumentResponse;
    const documentId =
      typeof created.documentId === "number" ||
        (typeof created.documentId === "string" && created.documentId.trim())
        ? String(created.documentId).trim()
        : "";
    const uploadUrl =
      typeof created.uploadUrl === "string" ? created.uploadUrl.trim() : "";
    const recipient = Array.isArray(created.recipients)
      ? parseRecipient(created.recipients[0])
      : null;

    // `res.ok` can be true while the payload is a different shape entirely
    // (wrong host, v2 envelope API, a proxy's success page). Anything missing
    // here means we do not have a real link — say so rather than guess one.
    const missing = [
      documentId ? null : "documentId",
      uploadUrl ? null : "uploadUrl",
      recipient ? null : "recipients[0].recipientId+signingUrl/token",
    ].filter((m): m is string => m !== null);
    if (missing.length > 0) {
      return failure(
        `Documenso create returned HTTP ${createRes.status} without ${missing.join(", ")} — refusing to guess a signing URL. Check DOCUMENSO_API_URL points at a Documenso instance exposing the v1 API.`,
      );
    }

    if (!recipient) {
      return failure("Documenso returned no recipient for the signer.");
    }
    // Documenso builds signingUrl from its OWN webapp URL, so prefer what it
    // sent. The token fallback is a real token from the API, not a fabrication.
    const signingUrl = /^https?:\/\//i.test(recipient.signingUrl)
      ? recipient.signingUrl
      : recipient.token
        ? `${base}/sign/${recipient.token}`
        : "";
    if (!signingUrl) {
      return failure(
        "Documenso returned a recipient without a usable signing URL or token.",
      );
    }

    // 2 — upload the PDF to the presigned URL.
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: pdf,
    });
    if (!uploadRes.ok) {
      const uploadBody = await readBody(uploadRes);
      return failure(errorText(uploadBody, uploadRes.status, "PDF upload"));
    }

    // 3 — place a signature field. Without this, send returns 400:
    // "Signers must have at least one signature field."
    // Percentages are of page size; bottom-left-ish matches a typical signature
    // line on a one-page agreement / specimen.
    const fieldRes = await fetch(
      `${base}/api/v1/documents/${encodeURIComponent(documentId)}/fields`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "SIGNATURE",
          recipientId: recipient.recipientId,
          pageNumber: 1,
          pageX: 10,
          pageY: 78,
          pageWidth: 35,
          pageHeight: 8,
          fieldMeta: {},
        }),
      },
    );
    if (!fieldRes.ok) {
      const fieldBody = await readBody(fieldRes);
      return failure(errorText(fieldBody, fieldRes.status, "signature field"));
    }

    // 4 — send it. Until this succeeds the document is a DRAFT and the signing
    // page 404s, so a failure here must NOT be reported as a working link.
    const sendRes = await fetch(
      `${base}/api/v1/documents/${encodeURIComponent(documentId)}/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sendEmail: true }),
      },
    );
    if (!sendRes.ok) {
      const sendBody = await readBody(sendRes);
      return failure(errorText(sendBody, sendRes.status, "document send"));
    }

    return { ok: true, demo: false, documentId, signingUrl };
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Documenso request failed",
    );
  }
}
