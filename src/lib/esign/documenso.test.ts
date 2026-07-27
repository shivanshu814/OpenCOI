import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  createAgreementSigning,
  isDocumensoConfigured,
  normalizeDocumensoBaseUrl,
} from "./documenso";

const ENV_KEYS = [
  "DOCUMENSO_API_KEY",
  "DOCUMENSO_API_URL",
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

const PDF_BASE64 = Buffer.from("%PDF-1.4\n% test\n").toString("base64");

const BASE_INPUT = {
  title: "Hold-harmless / indemnification",
  signerEmail: "ops@acmeplumbing.com",
  signerName: "Acme Plumbing",
  pdfBase64: PDF_BASE64,
};

type Call = { url: string; method: string; body: unknown };

/**
 * Replaces fetch with a scripted responder and records every call, so a test
 * can assert the PDF really was uploaded and the document really was sent.
 */
function mockFetch(
  handler: (url: string, init: RequestInit | undefined) => Response,
): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, method: init?.method ?? "GET", body: init?.body });
    return handler(url, init);
  }) as typeof globalThis.fetch;
  return calls;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function configure(url = "https://sign.certshield.com") {
  process.env.DOCUMENSO_API_KEY = "api_test_key";
  process.env.DOCUMENSO_API_URL = url;
}

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.NEXT_PUBLIC_APP_URL = "https://app.certshield.com";
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("normalizeDocumensoBaseUrl", () => {
  it("keeps a plain https origin", () => {
    assert.equal(
      normalizeDocumensoBaseUrl("https://app.documenso.com"),
      "https://app.documenso.com",
    );
  });

  it("strips a configured /api/v1 suffix so paths cannot double up", () => {
    assert.equal(
      normalizeDocumensoBaseUrl("https://app.documenso.com/api/v1/"),
      "https://app.documenso.com",
    );
    assert.equal(
      normalizeDocumensoBaseUrl("https://app.documenso.com/api"),
      "https://app.documenso.com",
    );
  });

  it("rejects a value with no scheme rather than guessing https", () => {
    assert.equal(normalizeDocumensoBaseUrl("app.documenso.com"), null);
  });

  it("rejects http — vendor-facing links must not be downgraded", () => {
    assert.equal(normalizeDocumensoBaseUrl("http://app.documenso.com"), null);
  });

  it("rejects empty and whitespace", () => {
    assert.equal(normalizeDocumensoBaseUrl(undefined), null);
    assert.equal(normalizeDocumensoBaseUrl("   "), null);
  });
});

describe("createAgreementSigning — unconfigured", () => {
  it("returns the local demo signing page", async () => {
    const result = await createAgreementSigning(BASE_INPUT);
    assert.equal(result.ok, true);
    assert.equal(result.demo, true);
    assert.match(result.signingUrl, /^https:\/\/app\.certshield\.com\/sign\/demo\?/);
    assert.ok(result.documentId.length > 0);
  });

  it("treats a malformed DOCUMENSO_API_URL as unconfigured", async () => {
    process.env.DOCUMENSO_API_KEY = "api_test_key";
    process.env.DOCUMENSO_API_URL = "sign.certshield.com"; // no scheme
    assert.equal(isDocumensoConfigured(), false);

    const result = await createAgreementSigning(BASE_INPUT);
    assert.equal(result.demo, true);
    assert.match(result.signingUrl, /\/sign\/demo\?/);
  });
});

describe("createAgreementSigning — configured, bad response", () => {
  it("never fabricates a URL when the payload lacks id/recipients", async () => {
    configure();
    // res.ok is true but the shape is wrong — the exact case that used to mint
    // `https://<base>/sign/` with an empty id and store a guaranteed 404.
    mockFetch(() => json({ ok: true }));

    const result = await createAgreementSigning(BASE_INPUT);
    assert.equal(result.ok, false);
    assert.equal(result.signingUrl, "");
    assert.equal(result.documentId, "");
    assert.match(result.error ?? "", /documentId/);
    assert.doesNotMatch(result.error ?? "", /sign\/$/);
  });

  it("surfaces the API's own error message on a non-2xx create", async () => {
    configure();
    mockFetch(() => json({ message: "Invalid recipient email" }, 400));

    const result = await createAgreementSigning(BASE_INPUT);
    assert.equal(result.ok, false);
    assert.equal(result.signingUrl, "");
    assert.match(result.error ?? "", /Invalid recipient email/);
    assert.match(result.error ?? "", /400/);
  });

  it("does not crash when the response body is an HTML error page", async () => {
    configure();
    mockFetch(
      () =>
        new Response("<html><body>404 Not Found</body></html>", {
          status: 404,
          headers: { "Content-Type": "text/html" },
        }),
    );

    const result = await createAgreementSigning(BASE_INPUT);
    assert.equal(result.ok, false);
    assert.equal(result.signingUrl, "");
    assert.match(result.error ?? "", /404/);
  });

  it("fails when no PDF is supplied instead of creating an empty draft", async () => {
    configure();
    const calls = mockFetch(() => json({}));

    const result = await createAgreementSigning({
      title: BASE_INPUT.title,
      signerEmail: BASE_INPUT.signerEmail,
      signerName: BASE_INPUT.signerName,
    });
    assert.equal(result.ok, false);
    assert.equal(result.signingUrl, "");
    assert.match(result.error ?? "", /PDF/i);
    assert.equal(calls.length, 0, "should not touch the API without a file");
  });

  it("reports a failed send instead of returning a draft-only link", async () => {
    configure();
    mockFetch((url) => {
      if (url.endsWith("/api/v1/documents")) {
        return json({
          uploadUrl: "https://s3.example.com/presigned",
          documentId: 42,
          recipients: [
            {
              recipientId: 1,
              token: "tok_abc",
              signingUrl: "https://sign.certshield.com/sign/tok_abc",
            },
          ],
        });
      }
      if (url.includes("/send")) {
        return json({ message: "Document has no fields" }, 400);
      }
      return new Response(null, { status: 200 });
    });

    // A created-but-unsent Documenso document is a DRAFT and its signing page
    // 404s, so this must not be reported as a working link.
    const result = await createAgreementSigning(BASE_INPUT);
    assert.equal(result.ok, false);
    assert.equal(result.signingUrl, "");
    assert.match(result.error ?? "", /Document has no fields/);
  });

  it("reports a failed PDF upload", async () => {
    configure();
    mockFetch((url) => {
      if (url.endsWith("/api/v1/documents")) {
        return json({
          uploadUrl: "https://s3.example.com/presigned",
          documentId: 42,
          recipients: [{ token: "tok_abc", signingUrl: "https://x/sign/tok_abc" }],
        });
      }
      if (url.startsWith("https://s3.example.com")) {
        return new Response("AccessDenied", { status: 403 });
      }
      return json({});
    });

    const result = await createAgreementSigning(BASE_INPUT);
    assert.equal(result.ok, false);
    assert.equal(result.signingUrl, "");
    assert.match(result.error ?? "", /403/);
  });
});

describe("createAgreementSigning — configured, good response", () => {
  it("runs create → upload → send and returns the real signing URL", async () => {
    configure();
    const calls = mockFetch((url) => {
      if (url.endsWith("/api/v1/documents")) {
        return json({
          uploadUrl: "https://s3.example.com/presigned?sig=abc",
          documentId: 4242,
          recipients: [
            {
              recipientId: 7,
              name: "Acme Plumbing",
              email: "ops@acmeplumbing.com",
              token: "tok_real_123",
              role: "SIGNER",
              signingUrl: "https://sign.certshield.com/sign/tok_real_123",
            },
          ],
        });
      }
      return json({ ok: true });
    });

    const result = await createAgreementSigning(BASE_INPUT);
    assert.equal(result.ok, true);
    assert.equal(result.demo, false);
    assert.equal(result.documentId, "4242");
    assert.equal(
      result.signingUrl,
      "https://sign.certshield.com/sign/tok_real_123",
    );

    assert.equal(calls.length, 3);
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].url, "https://sign.certshield.com/api/v1/documents");
    assert.equal(calls[1].method, "PUT");
    assert.equal(calls[1].url, "https://s3.example.com/presigned?sig=abc");
    assert.equal(calls[2].method, "POST");
    assert.equal(
      calls[2].url,
      "https://sign.certshield.com/api/v1/documents/4242/send",
    );
  });

  it("composes the URL from the real token when signingUrl is missing", async () => {
    configure();
    mockFetch((url) => {
      if (url.endsWith("/api/v1/documents")) {
        return json({
          uploadUrl: "https://s3.example.com/presigned",
          documentId: 9,
          recipients: [{ recipientId: 1, token: "tok_only" }],
        });
      }
      return json({ ok: true });
    });

    const result = await createAgreementSigning(BASE_INPUT);
    assert.equal(result.ok, true);
    assert.equal(
      result.signingUrl,
      "https://sign.certshield.com/sign/tok_only",
    );
  });

  it("does not double up the path when the base already ends in /api/v1", async () => {
    configure("https://sign.certshield.com/api/v1");
    const calls = mockFetch((url) => {
      if (url.endsWith("/api/v1/documents")) {
        return json({
          uploadUrl: "https://s3.example.com/presigned",
          documentId: 5,
          recipients: [{ token: "t", signingUrl: "https://sign.certshield.com/sign/t" }],
        });
      }
      return json({ ok: true });
    });

    const result = await createAgreementSigning(BASE_INPUT);
    assert.equal(result.ok, true);
    assert.equal(calls[0].url, "https://sign.certshield.com/api/v1/documents");
    assert.doesNotMatch(calls[0].url, /api\/v1\/api\/v1/);
  });
});
