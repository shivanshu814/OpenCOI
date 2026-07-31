import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  daysUntil,
  earliestExpirationFromPolicies,
  pickChaseTemplate,
  shouldEscalate,
} from "./cadence";
import { renderChaseEmail } from "./render";
import { CHASE_TEMPLATE_KEYS } from "./templates";

describe("chase cadence", () => {
  it("picks expiry_30 when 25 days out and nothing sent", () => {
    const now = new Date("2026-07-01T12:00:00Z");
    const key = pickChaseTemplate({
      reason: "expiry",
      earliestExpirationDate: "2026-07-26",
      lastTemplateKey: null,
      lastSentAt: null,
      attempts: 0,
      now,
    });
    assert.equal(key, "expiry_30");
  });

  it("picks expiry_14 when 10 days out (tightest window)", () => {
    const now = new Date("2026-07-01T12:00:00Z");
    const key = pickChaseTemplate({
      reason: "expiry",
      earliestExpirationDate: "2026-07-11",
      lastTemplateKey: null,
      lastSentAt: null,
      attempts: 0,
      now,
    });
    assert.equal(key, "expiry_14");
  });

  it("does not re-send same window", () => {
    const now = new Date("2026-07-01T12:00:00Z");
    const key = pickChaseTemplate({
      reason: "expiry",
      earliestExpirationDate: "2026-07-11",
      lastTemplateKey: "expiry_14",
      lastSentAt: "2026-06-28T12:00:00Z",
      attempts: 1,
      now,
    });
    assert.equal(key, null);
  });

  it("advances from expiry_30 to expiry_14", () => {
    const now = new Date("2026-07-01T12:00:00Z");
    const key = pickChaseTemplate({
      reason: "expiry",
      earliestExpirationDate: "2026-07-11",
      lastTemplateKey: "expiry_30",
      lastSentAt: "2026-06-15T12:00:00Z",
      attempts: 1,
      now,
    });
    assert.equal(key, "expiry_14");
  });

  it("post-expiry weekly with cooldown", () => {
    const now = new Date("2026-08-20T12:00:00Z");
    assert.equal(
      pickChaseTemplate({
        reason: "expiry",
        earliestExpirationDate: "2026-08-01",
        lastTemplateKey: null,
        lastSentAt: null,
        attempts: 0,
        now,
      }),
      "post_expiry_weekly",
    );
    assert.equal(
      pickChaseTemplate({
        reason: "expiry",
        earliestExpirationDate: "2026-08-01",
        lastTemplateKey: "post_expiry_weekly",
        lastSentAt: "2026-08-18T12:00:00Z",
        attempts: 1,
        now,
      }),
      null,
    );
  });

  it("missing_docs uses doc_request", () => {
    assert.equal(
      pickChaseTemplate({
        reason: "missing_docs",
        earliestExpirationDate: null,
        lastTemplateKey: null,
        lastSentAt: null,
        attempts: 0,
      }),
      "doc_request",
    );
  });

  it("escalates after 3 attempts", () => {
    assert.equal(shouldEscalate(3), true);
    assert.equal(shouldEscalate(2), false);
  });

  it("daysUntil and earliest expiration", () => {
    assert.equal(daysUntil("2026-07-11", new Date("2026-07-01T12:00:00Z")), 10);
    assert.equal(
      earliestExpirationFromPolicies([
        { expiration_date: "2026-09-01" },
        { expiration_date: "2026-08-15" },
      ]),
      "2026-08-15",
    );
  });
});

describe("chase templates EN/ES", () => {
  const vars = {
    vendorName: "Sunshine Roofing LLC",
    orgName: "Demo PM",
    expirationDate: "2026-08-15",
    daysUntilExpiry: 23,
    intakeEmail: "abc@in.getcertshield.app",
    portalUrl: "https://getcertshield.vercel.app/portal/test-token",
    agentName: "Harbor Insurance",
    physicalAddress: "CertShield · US",
  };

  for (const key of CHASE_TEMPLATE_KEYS) {
    it(`renders ${key} in en and es`, () => {
      for (const locale of ["en", "es"] as const) {
        const rendered = renderChaseEmail({
          templateKey: key,
          locale,
          vars,
        });
        assert.ok(rendered.subject.length > 5);
        assert.ok(rendered.text.includes(vars.vendorName) || key === "escalation_customer");
        assert.ok(rendered.html.includes("<p"));
        assert.ok(
          rendered.text.includes("not legal") ||
          rendered.text.includes("no es asesoría") ||
          rendered.text.includes("Document review") ||
          rendered.text.includes("Asistencia de revisión"),
        );
      }
    });
  }
});
