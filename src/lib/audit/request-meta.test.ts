import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientMetaFromHeaders } from "./request-meta";

describe("clientMetaFromHeaders", () => {
  it("prefers first x-forwarded-for hop", () => {
    const h = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "user-agent": "Mozilla/5.0 Test",
    });
    const meta = clientMetaFromHeaders(h);
    assert.equal(meta.ip_address, "203.0.113.10");
    assert.equal(meta.user_agent, "Mozilla/5.0 Test");
  });

  it("falls back to x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "198.51.100.7" });
    assert.equal(clientMetaFromHeaders(h).ip_address, "198.51.100.7");
  });

  it("returns nulls when missing", () => {
    const meta = clientMetaFromHeaders(new Headers());
    assert.equal(meta.ip_address, null);
    assert.equal(meta.user_agent, null);
  });
});
