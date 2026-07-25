import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { phoneLast10, phoneMatchOrFilter } from "./phone-match";

describe("phone-match", () => {
  it("extracts last 10 digits", () => {
    assert.equal(phoneLast10("+1 (555) 123-4567"), "5551234567");
    assert.equal(phoneLast10("555"), null);
  });

  it("builds an or-filter of common variants", () => {
    const filter = phoneMatchOrFilter("+15551234567");
    assert.ok(filter);
    assert.ok(filter.includes("phone.eq.+15551234567"));
    assert.ok(filter.includes("phone.eq.5551234567"));
  });
});
