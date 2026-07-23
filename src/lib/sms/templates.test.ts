import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderChaseSms, smsKeyFromChaseTemplate } from "./templates";

describe("SMS chase templates", () => {
  it("includes STOP language EN/ES", () => {
    const en = renderChaseSms({
      templateKey: "expiry_7",
      locale: "en",
      vars: {
        vendorName: "Acme",
        orgName: "Oak PM",
        portalUrl: "https://example.com/p",
        expirationDate: "2026-08-01",
        daysUntilExpiry: 7,
      },
    });
    assert.match(en, /STOP/);
    assert.match(en, /example\.com/);

    const es = renderChaseSms({
      templateKey: "doc_request",
      locale: "es",
      vars: {
        vendorName: "Acme",
        orgName: "Oak PM",
        portalUrl: "https://example.com/p",
        expirationDate: null,
        daysUntilExpiry: null,
      },
    });
    assert.match(es, /STOP/);
  });

  it("maps chase keys to SMS", () => {
    assert.equal(smsKeyFromChaseTemplate("expiry_30"), "expiry_30");
    assert.equal(smsKeyFromChaseTemplate("escalation_customer"), null);
  });
});
