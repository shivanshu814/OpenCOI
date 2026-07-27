import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  capped,
  countByKey,
  firstByKey,
  groupByKey,
  uniqueKeys,
} from "./join";

type Check = { document_id: string; verdict: string; created_at: string };

const CHECKS: Check[] = [
  // Newest-first, as every batched caller orders them.
  { document_id: "doc_a", verdict: "PASS", created_at: "2026-03-01" },
  { document_id: "doc_b", verdict: "FAIL", created_at: "2026-02-20" },
  { document_id: "doc_a", verdict: "FAIL", created_at: "2026-01-15" },
  { document_id: "doc_a", verdict: "MISSING", created_at: "2025-12-01" },
];

describe("firstByKey", () => {
  it("keeps the first row per key and ignores later ones", () => {
    const latest = firstByKey(CHECKS, (c) => c.document_id);
    assert.equal(latest.size, 2);
    assert.equal(latest.get("doc_a")?.verdict, "PASS");
    assert.equal(latest.get("doc_b")?.verdict, "FAIL");
  });

  it("attaches the newest check, not an older one — a stale verdict is the harm", () => {
    // Same rows, oldest-first: proves the helper honours input order rather
    // than sniffing a date field, so callers must order their query.
    const wrongOrder = [...CHECKS].reverse();
    assert.equal(
      firstByKey(wrongOrder, (c) => c.document_id).get("doc_a")?.verdict,
      "MISSING",
    );
  });

  it("returns an empty map for no rows", () => {
    assert.equal(firstByKey([], (c: Check) => c.document_id).size, 0);
  });

  it("looks up a key that has no rows as undefined, not a throw", () => {
    assert.equal(
      firstByKey(CHECKS, (c) => c.document_id).get("doc_missing"),
      undefined,
    );
  });
});

describe("countByKey", () => {
  it("counts rows per key", () => {
    const counts = countByKey(CHECKS, (c) => c.document_id);
    assert.equal(counts.get("doc_a"), 3);
    assert.equal(counts.get("doc_b"), 1);
  });

  it("reports absent keys as undefined so callers can default to 0", () => {
    const counts = countByKey(CHECKS, (c) => c.document_id);
    assert.equal(counts.get("doc_zzz") ?? 0, 0);
  });

  it("handles an empty input", () => {
    assert.equal(countByKey([], (c: Check) => c.document_id).size, 0);
  });
});

describe("groupByKey", () => {
  it("buckets rows and preserves input order inside a bucket", () => {
    const groups = groupByKey(CHECKS, (c) => c.document_id);
    assert.deepEqual(
      groups.get("doc_a")?.map((c) => c.verdict),
      ["PASS", "FAIL", "MISSING"],
    );
    assert.equal(groups.get("doc_b")?.length, 1);
  });
});

describe("uniqueKeys", () => {
  it("dedupes in first-seen order", () => {
    assert.deepEqual(
      uniqueKeys(CHECKS, (c) => c.document_id),
      ["doc_a", "doc_b"],
    );
  });

  it("returns [] for no rows so callers can skip the `.in()` query entirely", () => {
    assert.deepEqual(uniqueKeys([], (c: Check) => c.document_id), []);
  });
});

describe("capped", () => {
  it("stays a real array so existing callers are unaffected", () => {
    const list = capped([1, 2, 3], 10);
    assert.ok(Array.isArray(list));
    assert.equal(list.length, 3);
    assert.deepEqual(
      list.map((n) => n * 2),
      [2, 4, 6],
    );
    assert.deepEqual([...list], [1, 2, 3]);
  });

  it("reports a short list as complete", () => {
    const list = capped([1, 2, 3], 10);
    assert.equal(list.truncated, false);
    assert.equal(list.returned, 3);
    assert.equal(list.cap, 10);
  });

  it("flags a list that filled the cap — never silently truncates", () => {
    const list = capped([1, 2, 3], 3);
    assert.equal(list.truncated, true);
    assert.equal(list.returned, 3);
  });

  it("errs toward over-reporting truncation rather than hiding rows", () => {
    // Exactly `cap` rows may or may not be the whole set; claiming "showing
    // first N" on a complete list is harmless, the reverse is not.
    assert.equal(capped([1, 2], 2).truncated, true);
  });

  it("treats an empty list as complete", () => {
    const list = capped<number>([], 50);
    assert.equal(list.truncated, false);
    assert.equal(list.returned, 0);
  });
});
