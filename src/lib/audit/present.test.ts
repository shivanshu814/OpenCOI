import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractWhy,
  formatAbsoluteTimestamp,
  formatRelativeTime,
  formatTimestampDetailed,
  summarizeState,
} from "./present";

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

  it("formatAbsoluteTimestamp never throws and includes date parts", () => {
    const d = new Date("2026-07-26T14:30:00.000Z");
    const s = formatAbsoluteTimestamp(d);
    assert.equal(typeof s, "string");
    assert.ok(s.length > 0);
    assert.ok(!s.includes("Invalid option"));
    // US en-US medium-ish: month name or numeric + year
    assert.match(s, /2026|Jul/);
  });

  it("formatTimestampDetailed returns absolute + relative without throwing", () => {
    const ts = formatTimestampDetailed("2026-07-26T14:30:00.000Z");
    assert.ok(ts.absolute.length > 0);
    assert.ok(ts.relative.length > 0);
    assert.ok(ts.timezone.length > 0);
  });

  it("formatRelativeTime handles recent and invalid dates", () => {
    assert.equal(formatRelativeTime(new Date()), "Just now");
    assert.equal(formatRelativeTime(new Date(NaN)), "Invalid date");
  });
});
