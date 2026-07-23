import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBlockedOutboundEmail, mapResendError } from "./resend";

describe("Resend outbound guards", () => {
  it("blocks example.com fixtures", () => {
    assert.match(
      isBlockedOutboundEmail("api-smoke@example.com") ?? "",
      /example\.com/,
    );
  });

  it("allows real inboxes", () => {
    assert.equal(isBlockedOutboundEmail("ops@roofpros.com"), null);
  });

  it("maps Resend sandbox errors", () => {
    assert.match(
      mapResendError(
        "Invalid `to` field. Please use our testing email address instead of domains like `example.com`.",
      ),
      /test mode/i,
    );
  });
});
