import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APP_ORIGIN, MARKETING_ORIGIN, hostRedirect } from "./hosts";

describe("hostRedirect", () => {
  it("sends product paths on the marketing host to the app host", () => {
    assert.equal(
      hostRedirect("www.getcertshield.app", "/app", ""),
      `${APP_ORIGIN}/app`,
    );
    assert.equal(
      hostRedirect("getcertshield.app", "/app/vendors", ""),
      `${APP_ORIGIN}/app/vendors`,
    );
    assert.equal(
      hostRedirect("www.getcertshield.app", "/login", ""),
      `${APP_ORIGIN}/login`,
    );
  });

  it("preserves the query string (the ?next= after an auth bounce)", () => {
    assert.equal(
      hostRedirect("www.getcertshield.app", "/login", "?next=%2Fapp%2Fbilling"),
      `${APP_ORIGIN}/login?next=%2Fapp%2Fbilling`,
    );
  });

  it("sends marketing paths on the app host back to marketing", () => {
    assert.equal(
      hostRedirect("app.getcertshield.app", "/", ""),
      `${MARKETING_ORIGIN}/`,
    );
    assert.equal(
      hostRedirect("app.getcertshield.app", "/pricing", ""),
      `${MARKETING_ORIGIN}/pricing`,
    );
  });

  it("serves each host its own paths without redirecting", () => {
    assert.equal(hostRedirect("app.getcertshield.app", "/app", ""), null);
    assert.equal(hostRedirect("app.getcertshield.app", "/login", ""), null);
    assert.equal(hostRedirect("www.getcertshield.app", "/", ""), null);
    assert.equal(hostRedirect("www.getcertshield.app", "/pricing", ""), null);
  });

  /**
   * The important one. Redirecting these would break things outside our
   * control: webhook POSTs lose their body across a 308 on some clients, and
   * portal/e-sign links are already sitting in vendors' inboxes.
   */
  it("never redirects shared paths, on either host", () => {
    for (const host of ["www.getcertshield.app", "app.getcertshield.app"]) {
      assert.equal(hostRedirect(host, "/api/webhooks/paddle", ""), null);
      assert.equal(hostRedirect(host, "/api/inngest", ""), null);
      assert.equal(hostRedirect(host, "/portal/abc123", ""), null);
      assert.equal(hostRedirect(host, "/auth/callback", "?code=xyz"), null);
      assert.equal(hostRedirect(host, "/sign/doc", ""), null);
      assert.equal(hostRedirect(host, "/confirm/token", ""), null);
    }
  });

  it("leaves unknown hosts alone so previews and localhost still work", () => {
    assert.equal(hostRedirect("localhost:3000", "/app", ""), null);
    assert.equal(
      hostRedirect("certshield-abc123-shivanshu.vercel.app", "/app", ""),
      null,
    );
    assert.equal(hostRedirect(null, "/app", ""), null);
  });

  it("ignores port and case in the host header", () => {
    assert.equal(
      hostRedirect("WWW.GetCertShield.app:443", "/app", ""),
      `${APP_ORIGIN}/app`,
    );
  });
});
