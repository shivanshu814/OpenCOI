import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  insuredNameMismatchSignal,
  policyReuseSignals,
} from "./signals";

describe("B7 fraud risk signals", () => {
  it("flags weak insured vs vendor name match", () => {
    const s = insuredNameMismatchSignal({
      insuredName: "Completely Different Inc",
      vendorName: "Acme Roofing LLC",
      similarity: 0.1,
    });
    assert.ok(s);
    assert.equal(s?.code, "insured_name_mismatch");
    assert.equal(s?.severity, "high");
  });

  it("skips when names are similar enough", () => {
    const s = insuredNameMismatchSignal({
      insuredName: "Acme Roofing LLC",
      vendorName: "Acme Roofing",
      similarity: 0.9,
    });
    assert.equal(s, null);
  });

  it("emits policy reuse signals", () => {
    const signals = policyReuseSignals({
      policyNumbers: ["GL-1"],
      otherVendorPolicyHits: [
        { vendorName: "Other LLC", policyNumber: "GL-1" },
      ],
    });
    assert.equal(signals.length, 1);
    assert.equal(signals[0]?.code, "policy_number_reused");
  });
});
