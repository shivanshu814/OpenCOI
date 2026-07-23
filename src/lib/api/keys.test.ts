import { createHash, createHmac, timingSafeEqual } from "crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashApiKey, mintApiKey, signWebhookBody } from "../api/keys";

describe("E4 API keys & webhook signing", () => {
  it("mints cs_live keys with stable hash", () => {
    const m = mintApiKey();
    assert.ok(m.raw.startsWith("cs_live_"));
    assert.equal(hashApiKey(m.raw), m.hash);
    assert.equal(
      m.hash,
      createHash("sha256").update(m.raw, "utf8").digest("hex"),
    );
  });

  it("signs webhook bodies with HMAC", () => {
    const body = JSON.stringify({ event: "document.published" });
    const sig = signWebhookBody("whsec_test", body);
    const expected = createHmac("sha256", "whsec_test")
      .update(body, "utf8")
      .digest("hex");
    assert.ok(
      timingSafeEqual(Buffer.from(sig), Buffer.from(expected)),
    );
  });
});
