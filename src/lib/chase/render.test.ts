import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderChaseEmail } from "./render";
import { getChaseTemplate } from "./templates";
import type { ChaseTemplateVars } from "./types";

const vars: ChaseTemplateVars = {
  vendorName: "Roof Pros <LLC>",
  orgName: "Riverside & Co",
  expirationDate: "2026-08-15",
  daysUntilExpiry: 19,
  intakeEmail: "abc@in.certshield.test",
  portalUrl: "https://getcertshield.vercel.app/portal/tok123",
  agentName: null,
  physicalAddress: "CertShield · US operations",
};

describe("renderChaseEmail", () => {
  it("keeps the plain-text body byte-identical to the template", () => {
    const rendered = renderChaseEmail({
      templateKey: "expiry_14",
      locale: "en",
      vars,
    });
    assert.equal(rendered.text, getChaseTemplate("expiry_14", "en").text(vars));
    assert.equal(
      rendered.subject,
      getChaseTemplate("expiry_14", "en").subject(vars),
    );
  });

  it("surfaces the portal link as a CTA button and keeps it in the body", () => {
    const { html } = renderChaseEmail({
      templateKey: "expiry_14",
      locale: "en",
      vars,
    });
    assert.match(html, /^<!DOCTYPE html>/);
    assert.ok(
      html.includes(`href="${vars.portalUrl}"`),
      "portal URL used as button href",
    );
    // Button href + body text + fallback line.
    const hits = html.split(vars.portalUrl).length - 1;
    assert.ok(hits >= 3, `expected portal URL 3+ times, saw ${hits}`);
    assert.match(html, /Open your portal \(no login\)/);
  });

  it("escapes vendor and org names in the HTML body", () => {
    const { html } = renderChaseEmail({
      templateKey: "doc_request",
      locale: "en",
      vars,
    });
    assert.doesNotMatch(html, /<LLC>/);
    assert.match(html, /Roof Pros &lt;LLC&gt;/);
    assert.match(html, /Riverside &amp; Co/);
    assert.match(html, /Sent on behalf of Riverside &amp; Co via CertShield/);
  });

  it("keeps Spanish text and Spanish CTA for the es locale", () => {
    const rendered = renderChaseEmail({
      templateKey: "expiry_7",
      locale: "es",
      vars,
    });
    assert.equal(rendered.text, getChaseTemplate("expiry_7", "es").text(vars));
    assert.match(rendered.text, /vence/);
    assert.match(rendered.html, /sin contraseña/);
    assert.match(rendered.html, /Enviado en nombre de/);
  });

  it("omits the CTA when the text has no URL", () => {
    const noPortal = { ...vars, portalUrl: "", intakeEmail: "" };
    const { html, text } = renderChaseEmail({
      templateKey: "escalation_customer",
      locale: "en",
      vars: noPortal,
    });
    assert.doesNotMatch(text, /https?:\/\//);
    assert.doesNotMatch(html, /Open your portal/);
    assert.doesNotMatch(html, /Paste this/);
  });

  it("uses sanitized org branding when provided", () => {
    const { html } = renderChaseEmail({
      templateKey: "expiry_30",
      locale: "en",
      vars,
      brand: {
        name: "Riverside & Co",
        color: "#3355ff",
        logoUrl: "javascript:alert(1)",
      },
    });
    assert.match(html, /background-color:#3355ff/);
    assert.doesNotMatch(html, /<img/);
    assert.doesNotMatch(html, /javascript:/);
  });
});
