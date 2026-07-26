import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  carrierDatasetInfo,
  evaluateCarriersAgainstFloor,
  lookupCarrierRating,
  ratingMeetsMinimum,
} from "./ratings";

describe("B6 carrier ratings", () => {
  it("looks up Travelers by NAIC", () => {
    assert.equal(lookupCarrierRating("25674"), "A+");
    assert.equal(lookupCarrierRating("25-674"), "A+");
  });

  it("A- meets default floor A-", () => {
    assert.equal(ratingMeetsMinimum("A-", "A-"), true);
    assert.equal(ratingMeetsMinimum("B+", "A-"), false);
  });

  it("flags unknown NAIC as unknown, not below", () => {
    const r = evaluateCarriersAgainstFloor(
      [{ name: "Mystery Mutual", naic: "99999" }],
      "A-",
    );
    assert.equal(r.anyUnknown, true);
    assert.equal(r.anyBelow, false);
    assert.equal(r.allMeet, false);
  });

  it("fails when a known carrier is below floor", () => {
    // Raise the floor rather than reach for a low-rated carrier: the dataset
    // is real AM Best data and happens to contain none. The previous version
    // of this test leaned on a hand-written "example mid-tier" entry — the
    // invented rating that has since been removed, because a fabricated value
    // produces a wrong FAIL against a real vendor.
    const r = evaluateCarriersAgainstFloor(
      [{ name: "Progressive Casualty", naic: "23469" }], // A- in the dataset
      "A++",
    );
    assert.equal(r.anyBelow, true);
    assert.equal(r.allMeet, false);
    assert.equal(r.results[0].reason, "rated");
  });

  it("carries real dataset provenance", () => {
    const info = carrierDatasetInfo(new Date("2026-07-26T00:00:00Z"));
    assert.ok(info.carrierCount >= 50, "dataset should hold the known carriers");
    assert.match(info.asOf, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(info.source.length > 0);
    assert.equal(info.stale, false);
  });

  it("stops asserting verdicts once the snapshot is stale", () => {
    // A rating snapshot cannot see a downgrade that happened after it was
    // taken, so past the freshness window every carrier must route to review
    // instead of being passed or failed on old data.
    const info = carrierDatasetInfo(new Date("2030-01-01T00:00:00Z"));
    assert.equal(info.stale, true);
  });
});
