import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
    const r = evaluateCarriersAgainstFloor(
      [{ name: "Amerisure", naic: "10111" }],
      "A-",
    );
    assert.equal(r.anyBelow, true);
    assert.equal(r.allMeet, false);
  });
});
