import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatOverrideReason,
  resolveCustomerDecision,
} from "./customer-decision";

describe("customer decision (Appendix B)", () => {
  it("accept → accepted + vendor from verdict", () => {
    const r = resolveCustomerDecision({ action: "accept" }, "FAIL");
    assert.equal(r.customer_decision, "accepted");
    assert.equal(r.document_status, "accepted");
    assert.equal(r.vendor_status, "non_compliant");
    assert.equal(r.routes_to_internal_review, false);
    assert.equal(r.reason, null);
  });

  it("waive override → overridden + compliant vendor", () => {
    const r = resolveCustomerDecision(
      { action: "override", reason_code: "requirement_waived" },
      "FAIL",
    );
    assert.equal(r.customer_decision, "overridden");
    assert.equal(r.document_status, "overridden");
    assert.equal(r.vendor_status, "compliant");
    assert.match(r.reason ?? "", /waived/i);
  });

  it("document supersedes keeps verdict-derived vendor status", () => {
    const r = resolveCustomerDecision(
      { action: "override", reason_code: "document_supersedes" },
      "EXPIRING",
    );
    assert.equal(r.document_status, "overridden");
    assert.equal(r.vendor_status, "expiring");
  });

  it("extraction error dispute → disputed → in_internal_review", () => {
    const r = resolveCustomerDecision(
      { action: "override", reason_code: "extraction_error_dispute" },
      "PASS",
    );
    assert.equal(r.customer_decision, "disputed");
    assert.equal(r.intermediate_status, "disputed");
    assert.equal(r.document_status, "in_internal_review");
    assert.equal(r.routes_to_internal_review, true);
    assert.equal(r.vendor_status, "in_review");
  });

  it("other requires text", () => {
    assert.throws(() => formatOverrideReason("other", "  "), /requires reason/);
    const r = resolveCustomerDecision(
      {
        action: "override",
        reason_code: "other",
        reason_text: "Lender exception letter on file",
      },
      "MISSING",
    );
    assert.equal(r.customer_decision, "overridden");
    assert.match(r.reason ?? "", /Lender exception/);
  });
});
