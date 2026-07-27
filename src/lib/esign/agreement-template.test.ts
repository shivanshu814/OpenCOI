import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  agreementTemplatePath,
  loadAgreementPdfBase64,
  looksLikePdf,
  MAX_AGREEMENT_BYTES,
} from "./agreement-template";

const ORG = "11111111-2222-3333-4444-555555555555";

describe("agreementTemplatePath", () => {
  it("keeps the file inside the org's own storage folder", () => {
    // The bucket policy scopes on the first path segment, so a path that did
    // not start with the org id would be reaching into another tenant.
    assert.equal(
      agreementTemplatePath(ORG, "agreement.pdf"),
      `${ORG}/agreements/agreement.pdf`,
    );
  });

  it("strips traversal and separators out of the file name", () => {
    const path = agreementTemplatePath(ORG, "../../etc/passwd");
    assert.equal(path.startsWith(`${ORG}/agreements/`), true);
    assert.equal(path.includes(".."), false);
    assert.equal(path.split("/").length, 3);
  });

  it("replaces unsafe characters and caps the length", () => {
    const path = agreementTemplatePath(ORG, `${"a".repeat(200)} hold harmless!.pdf`);
    const name = path.split("/")[2];
    assert.equal(name.length <= 80, true);
    assert.match(name, /^[a-zA-Z0-9._-]+$/);
  });

  it("falls back to a usable name when nothing survives sanitising", () => {
    assert.equal(
      agreementTemplatePath(ORG, "///"),
      `${ORG}/agreements/agreement.pdf`,
    );
  });
});

describe("looksLikePdf", () => {
  it("accepts a real PDF header", () => {
    assert.equal(looksLikePdf(new TextEncoder().encode("%PDF-1.7\n...")), true);
  });

  it("rejects a renamed non-PDF", () => {
    // Trusting the extension or the browser-supplied MIME type would let a
    // .docx reach Documenso as a "PDF" and fail deep in the signing flow.
    assert.equal(looksLikePdf(new TextEncoder().encode("PKzip")), false);
    assert.equal(looksLikePdf(new Uint8Array([])), false);
    assert.equal(looksLikePdf(new Uint8Array([0x25, 0x50])), false);
  });
});

describe("loadAgreementPdfBase64", () => {
  function fakeSupabase(download: () => Promise<{ data: Blob | null; error: { message: string } | null }>) {
    return {
      storage: { from: () => ({ download }) },
    } as never;
  }

  it("fails honestly when no template is configured", async () => {
    const result = await loadAgreementPdfBase64(
      fakeSupabase(async () => ({ data: null, error: null })),
      { agreement_template_path: null },
    );
    assert.equal(result.ok, false);
    assert.match(result.ok === false ? result.error : "", /No agreement template/i);
  });

  it("fails honestly when storage cannot return the file", async () => {
    const result = await loadAgreementPdfBase64(
      fakeSupabase(async () => ({ data: null, error: { message: "not found" } })),
      { agreement_template_path: `${ORG}/agreements/a.pdf` },
    );
    assert.equal(result.ok, false);
    assert.match(result.ok === false ? result.error : "", /storage/i);
  });

  it("rejects an empty stored file rather than signing nothing", async () => {
    const result = await loadAgreementPdfBase64(
      fakeSupabase(async () => ({ data: new Blob([]), error: null })),
      { agreement_template_path: `${ORG}/agreements/a.pdf` },
    );
    assert.equal(result.ok, false);
  });

  it("returns base64 for a stored PDF", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 hello");
    const result = await loadAgreementPdfBase64(
      fakeSupabase(async () => ({ data: new Blob([bytes]), error: null })),
      {
        agreement_template_path: `${ORG}/agreements/a.pdf`,
        agreement_template_name: "Hold harmless.pdf",
      },
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(
        Buffer.from(result.base64, "base64").toString("utf8"),
        "%PDF-1.7 hello",
      );
      assert.equal(result.name, "Hold harmless.pdf");
    }
  });
});

describe("size cap", () => {
  it("is 10 MB, under the bucket's 20 MB limit", () => {
    assert.equal(MAX_AGREEMENT_BYTES, 10 * 1024 * 1024);
    assert.equal(MAX_AGREEMENT_BYTES < 20971520, true);
  });
});
