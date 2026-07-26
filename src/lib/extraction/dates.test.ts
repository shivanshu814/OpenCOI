import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isIsoDate, normalizeIsoDate } from "./dates";

describe("normalizeIsoDate (Appendix A YYYY-MM-DD)", () => {
  it("passes through ISO dates", () => {
    assert.equal(normalizeIsoDate("2027-01-01"), "2027-01-01");
  });

  it("pads loose ISO parts", () => {
    assert.equal(normalizeIsoDate("2027-1-1"), "2027-01-01");
  });

  it("drops a trailing time component", () => {
    assert.equal(normalizeIsoDate("2027-01-01T00:00:00Z"), "2027-01-01");
  });

  it("converts ACORD US MM/DD/YYYY (the roofer-sample bug)", () => {
    assert.equal(normalizeIsoDate("01/01/2027"), "2027-01-01");
    assert.equal(normalizeIsoDate("12/31/2026"), "2026-12-31");
  });

  it("converts M/D/YYYY and MM-DD-YYYY", () => {
    assert.equal(normalizeIsoDate("1/5/2027"), "2027-01-05");
    assert.equal(normalizeIsoDate("01-05-2027"), "2027-01-05");
  });

  it("expands 2-digit years to 20YY", () => {
    assert.equal(normalizeIsoDate("01/01/27"), "2027-01-01");
  });

  it("converts YYYY/MM/DD", () => {
    assert.equal(normalizeIsoDate("2027/01/01"), "2027-01-01");
  });

  it("converts month-name formats", () => {
    assert.equal(normalizeIsoDate("January 1, 2027"), "2027-01-01");
    assert.equal(normalizeIsoDate("Jan 1 2027"), "2027-01-01");
    assert.equal(normalizeIsoDate("1 Jan 2027"), "2027-01-01");
  });

  it("returns null for null/empty", () => {
    assert.equal(normalizeIsoDate(null), null);
    assert.equal(normalizeIsoDate(""), null);
    assert.equal(normalizeIsoDate("   "), null);
  });

  it("never invents a date — unrecognized strings pass through unchanged", () => {
    assert.equal(normalizeIsoDate("upon renewal"), "upon renewal");
    assert.equal(normalizeIsoDate("13/45/2027"), "13/45/2027");
  });
});

describe("isIsoDate", () => {
  it("accepts strict ISO only", () => {
    assert.equal(isIsoDate("2027-01-01"), true);
    assert.equal(isIsoDate("01/01/2027"), false);
    assert.equal(isIsoDate(null), false);
  });
});
