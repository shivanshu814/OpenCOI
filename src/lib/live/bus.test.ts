import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emitLiveEvent, liveListenerCount, onLiveEvent } from "./bus";
import { LIVE_TABLES, type LiveEvent } from "./tables";

function event(table: LiveEvent["table"]): LiveEvent {
  return { table, type: "UPDATE", id: "row-1" };
}

describe("live event bus", () => {
  it("delivers only the tables a listener asked for", () => {
    const seen: string[] = [];
    const off = onLiveEvent(["vendors"], (e) => seen.push(e.table));

    emitLiveEvent(event("vendors"));
    emitLiveEvent(event("documents"));
    emitLiveEvent(event("vendors"));

    off();
    assert.deepEqual(seen, ["vendors", "vendors"]);
  });

  it("delivers every table when the filter is null", () => {
    const seen: string[] = [];
    const off = onLiveEvent(null, (e) => seen.push(e.table));

    emitLiveEvent(event("vendors"));
    emitLiveEvent(event("orgs"));

    off();
    assert.deepEqual(seen, ["vendors", "orgs"]);
  });

  it("stops delivering after unsubscribe and leaks no listeners", () => {
    const before = liveListenerCount();
    let calls = 0;
    const off = onLiveEvent(["documents"], () => {
      calls += 1;
    });
    assert.equal(liveListenerCount(), before + 1);

    emitLiveEvent(event("documents"));
    off();
    emitLiveEvent(event("documents"));

    assert.equal(calls, 1);
    assert.equal(liveListenerCount(), before);
  });

  it("keeps the shared channel alive when one listener throws", () => {
    // A single broken panel must not stop every other live surface in the tab.
    const seen: string[] = [];
    const offBad = onLiveEvent(null, () => {
      throw new Error("panel blew up");
    });
    const offGood = onLiveEvent(null, (e) => seen.push(e.table));

    assert.doesNotThrow(() => emitLiveEvent(event("vendors")));

    offBad();
    offGood();
    assert.deepEqual(seen, ["vendors"]);
  });

  it("never subscribes to tables carrying secrets", () => {
    // Realtime payloads copy column values out of Postgres, so a table with
    // key/token material must not be in the publication list (migration 024
    // documents the same exclusions).
    for (const forbidden of [
      "api_keys",
      "outbound_webhooks",
      "vendor_portal_tokens",
      "vendor_tax_profiles",
    ]) {
      assert.equal(
        (LIVE_TABLES as readonly string[]).includes(forbidden),
        false,
        `${forbidden} must not be a live table`,
      );
    }
  });
});
