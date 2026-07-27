import type { SupabaseClient } from "@supabase/supabase-js";

/** Private bucket shared with COI uploads (migration 002). */
export const AGREEMENT_BUCKET = "cois";

/** 10 MB — Documenso rejects very large uploads and the bucket caps at 20 MB. */
export const MAX_AGREEMENT_BYTES = 10 * 1024 * 1024;

export type AgreementTemplate = {
  path: string;
  name: string;
  uploadedAt: string | null;
};

/**
 * Object path inside the org's own folder — the storage policy scopes on the
 * first segment, so the org id must lead and the user-supplied name must not
 * be able to add segments or dot-dot sequences of its own.
 */
export function agreementTemplatePath(orgId: string, fileName: string): string {
  const safe =
    fileName
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      // Separators are already gone, but "../.." leaves its dots behind and a
      // traversal-looking key is not something to hand to a storage backend.
      .replace(/\.{2,}/g, ".")
      .replace(/^[.\-]+|[.\-]+$/g, "")
      .slice(0, 80) || "agreement.pdf";
  return `${orgId}/agreements/${safe}`;
}

export type LoadedAgreement =
  | { ok: true; base64: string; name: string }
  | { ok: false; error: string };

/**
 * Read the org's uploaded agreement and return it as base64 for Documenso.
 *
 * Returns a typed failure rather than throwing or substituting a placeholder:
 * an org with no template must produce an honest "upload your agreement
 * first", not a signable document nobody wrote.
 */
export async function loadAgreementPdfBase64(
  supabase: SupabaseClient,
  org: { agreement_template_path?: string | null; agreement_template_name?: string | null },
): Promise<LoadedAgreement> {
  const path = org.agreement_template_path?.trim();
  if (!path) {
    return {
      ok: false,
      error:
        "No agreement template uploaded yet. Add your own signed-off agreement PDF in Workspace settings, then send it for signature.",
    };
  }

  const { data, error } = await supabase.storage
    .from(AGREEMENT_BUCKET)
    .download(path);

  if (error || !data) {
    return {
      ok: false,
      error: `Agreement template could not be read from storage (${error?.message ?? "not found"}). Re-upload it in Workspace settings.`,
    };
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  if (bytes.byteLength === 0) {
    return { ok: false, error: "The stored agreement template is empty." };
  }

  return {
    ok: true,
    base64: Buffer.from(bytes).toString("base64"),
    name: org.agreement_template_name?.trim() || "Agreement.pdf",
  };
}

/** Cheap sniff so a renamed .doc cannot reach Documenso as a "PDF". */
export function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.length > 4 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 // F
  );
}
