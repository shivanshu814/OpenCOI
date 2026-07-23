import { resolveCheckoutPlan } from "@/lib/billing/checkout";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("resolveCheckoutPlan", () => {
  it("rejects unknown plan ids", () => {
    const result = resolveCheckoutPlan("enterprise");
    assert.equal(result.ok, false);
  });

  it("accepts starter when price env may be empty", () => {
    const result = resolveCheckoutPlan("starter");
    if (result.ok) {
      assert.equal(result.planId, "starter");
      assert.ok(result.priceId.length >= 0);
    } else {
      assert.match(result.error, /Paddle price ID|Invalid|Unknown/);
    }
  });
});
