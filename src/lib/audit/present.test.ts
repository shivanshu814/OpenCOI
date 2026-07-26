import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractWhy, summarizeState } from "./present";

describe("audit present helpers", () => {
  it("summarizes after_state keys", () => {
    const s = summarizeState({ name: "Acme", status: "compliant", nested: { a: 1 } });
    assert.ok(s?.includes("name: Acme"));
    assert.ok(s?.includes("status: compliant"));
    assert.ok(s?.includes("nested: {…}"));
  });

  it("extracts why from reason or after_state", () => {
    assert.equal(extractWhy("manual note", null), "manual note");
    assert.equal(
      extractWhy(null, { reason: "limit too low" }),
      "limit too low",
    );
    assert.equal(extractWhy(null, { foo: 1 }), null);
  });

  it("redacts sensitive keys for non-admin summary", () => {
    const s = summarizeState(
      { name: "X", tin: "123", api_key: "secret" },
      { forAdmin: false },
    );
    assert.ok(s?.includes("name: X"));
    assert.ok(!s?.includes("123"));
  });
});
