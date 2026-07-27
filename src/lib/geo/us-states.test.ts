import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FALLBACK_US_STATES,
  isValidZip,
  normalizeStateCode,
  stateName,
  toStateItems,
} from "./us-states";

describe("US state normalization", () => {
  it("accepts codes in any case", () => {
    assert.equal(normalizeStateCode("PA"), "PA");
    assert.equal(normalizeStateCode("pa"), "PA");
    assert.equal(normalizeStateCode(" ca "), "CA");
  });

  it("accepts full names", () => {
    assert.equal(normalizeStateCode("Pennsylvania"), "PA");
    assert.equal(normalizeStateCode("pennsylvania"), "PA");
    assert.equal(normalizeStateCode("District of Columbia"), "DC");
    assert.equal(normalizeStateCode("Puerto Rico"), "PR");
  });

  it("rejects typos and non-states", () => {
    assert.equal(normalizeStateCode("penn"), null);
    assert.equal(normalizeStateCode("XX"), null);
    assert.equal(normalizeStateCode("P"), null);
  });

  it("returns null for empty and non-string input", () => {
    assert.equal(normalizeStateCode(""), null);
    assert.equal(normalizeStateCode("   "), null);
    assert.equal(normalizeStateCode(null), null);
    assert.equal(normalizeStateCode(undefined), null);
    assert.equal(normalizeStateCode(42), null);
  });

  it("covers 50 states + DC + territories in the fallback list", () => {
    assert.equal(FALLBACK_US_STATES.length, 56);
    assert.equal(stateName("pa"), "Pennsylvania");
    assert.equal(stateName("ZZ"), null);
  });

  it("builds select items as CODE — Name", () => {
    const items = toStateItems(FALLBACK_US_STATES);
    assert.equal(items.length, FALLBACK_US_STATES.length);
    const pa = items.find((i) => i.value === "PA");
    assert.deepEqual(pa, { value: "PA", label: "PA — Pennsylvania" });
  });
});

describe("US ZIP validation", () => {
  it("accepts 5-digit and ZIP+4", () => {
    assert.equal(isValidZip("19107"), true);
    assert.equal(isValidZip("19107-1234"), true);
    assert.equal(isValidZip(" 19107 "), true);
  });

  it("rejects everything else", () => {
    assert.equal(isValidZip("1910"), false);
    assert.equal(isValidZip("191071"), false);
    assert.equal(isValidZip("19107-12"), false);
    assert.equal(isValidZip("abcde"), false);
    assert.equal(isValidZip(19107), false);
    assert.equal(isValidZip(null), false);
  });
});
