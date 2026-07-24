import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FREE_DAILY_AUDIT_CAP,
  checkDailyCap,
  isPaidPlan,
  startOfUtcDay,
} from "./limits";

describe("free-audit daily cap", () => {
  it("treats orgs with a plan as paid", () => {
    assert.equal(isPaidPlan("pro"), true);
    assert.equal(isPaidPlan("business", "active"), true);
  });

  it("treats active-ish statuses as paid even without a plan string", () => {
    assert.equal(isPaidPlan(null, "active"), true);
    assert.equal(isPaidPlan(null, "trialing"), true);
    assert.equal(isPaidPlan(null, "past_due"), true);
  });

  it("treats no plan + canceled/none as unpaid", () => {
    assert.equal(isPaidPlan(null), false);
    assert.equal(isPaidPlan(null, "canceled"), false);
    assert.equal(isPaidPlan(undefined, undefined), false);
  });

  it("allows submissions under the cap and blocks at the cap", () => {
    assert.equal(checkDailyCap(0).allowed, true);
    assert.equal(checkDailyCap(FREE_DAILY_AUDIT_CAP - 1).allowed, true);
    assert.equal(checkDailyCap(FREE_DAILY_AUDIT_CAP).allowed, false);
    assert.equal(checkDailyCap(FREE_DAILY_AUDIT_CAP + 5).allowed, false);
  });

  it("reports remaining accurately and never negative", () => {
    assert.equal(checkDailyCap(3).remaining, FREE_DAILY_AUDIT_CAP - 3);
    assert.equal(checkDailyCap(999).remaining, 0);
  });

  it("computes UTC day start", () => {
    const iso = startOfUtcDay(new Date("2026-07-24T18:30:00.000Z"));
    assert.equal(iso, "2026-07-24T00:00:00.000Z");
  });
});
