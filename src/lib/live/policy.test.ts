import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CACHE_POLICIES, TIER_MAX_AGE, type CacheTier } from "./policy";
import { LIVE_TABLES } from "./tables";
import { projectForDisk } from "./use-live";

const policies = Object.entries(CACHE_POLICIES);

describe("cache policy registry", () => {
  it("is exactly the set of resources cleared for client persistence", () => {
    // Pinned deliberately. Adding a policy has to fail this test first, so
    // whoever adds one reads the rules above it: nothing verdict-bearing
    // (checks, documents, reports, extractions) and nothing secret (raw API
    // keys, webhook secrets, portal tokens, encrypted TINs) may be cached.
    assert.deepEqual(Object.keys(CACHE_POLICIES).sort(), [
      "agreementTemplate",
      "geoStates",
      "integrations",
      "orgSettings",
      "propertyAccess",
      "vendorOnboarding",
    ]);
  });

  it("gives every policy a unique cache key", () => {
    const keys = policies.map(([, p]) => p.key);
    assert.equal(new Set(keys).size, keys.length);
  });

  it("keeps every TTL within its tier's ceiling", () => {
    for (const [name, p] of policies) {
      assert.ok(
        p.maxAgeMs <= TIER_MAX_AGE[p.tier as CacheTier],
        `${name} exceeds the ${p.tier} ceiling`,
      );
      assert.ok(p.maxAgeMs > 0, `${name} must have a positive TTL`);
    }
  });

  it("only names tables the app actually subscribes to", () => {
    // A policy listing a table missing from LIVE_TABLES would never be
    // invalidated by Realtime — it would just quietly serve stale data
    // until its TTL expired.
    for (const [name, p] of policies) {
      for (const table of p.tables ?? []) {
        assert.ok(
          (LIVE_TABLES as readonly string[]).includes(table),
          `${name} listens to ${table}, which is not a live table`,
        );
      }
    }
  });

  it("requires org scope for anything that is not public data", () => {
    for (const [name, p] of policies) {
      if (p.scope === "public") {
        // Public entries are shared across accounts on one browser, so they
        // must carry no tenant data at all. Only reference data qualifies.
        assert.equal(p.tier, "reference", `${name} is public but not reference`);
      }
    }
  });

  it("never persists the vendor tax block", () => {
    // tin_last4 is masked and low severity, but a tax identifier written to
    // a disk that outlives the session is not a trade worth making for a
    // half-second of paint.
    assert.deepEqual(CACHE_POLICIES.vendorOnboarding.persistDrops, ["tax"]);
  });
});

describe("projectForDisk", () => {
  it("blanks the dropped field and keeps the rest", () => {
    const out = projectForDisk(
      { tax: { tin_masked: "***-**-1234" }, licenses: [1], agreements: [2] },
      ["tax"],
    );
    assert.equal(out.tax, null);
    assert.deepEqual(out.licenses, [1]);
    assert.deepEqual(out.agreements, [2]);
  });

  it("does not mutate the in-memory value", () => {
    // The screen keeps the full response; only the disk copy is trimmed.
    const live = { tax: { tin_masked: "***-**-1234" }, licenses: [] };
    projectForDisk(live, ["tax"]);
    assert.notEqual(live.tax, null);
  });

  it("passes anything else through untouched", () => {
    assert.deepEqual(projectForDisk({ a: 1 }, undefined), { a: 1 });
    assert.deepEqual(projectForDisk({ a: 1 }, []), { a: 1 });
    assert.equal(projectForDisk(null, ["tax"]), null);
    assert.equal(projectForDisk("plain", ["tax"]), "plain");
  });
});
