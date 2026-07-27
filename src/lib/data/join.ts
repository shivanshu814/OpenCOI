/**
 * In-memory join and capping helpers.
 *
 * These exist so a page costs a fixed number of database round trips instead of
 * one per row. The pattern throughout `src/lib/data`, `src/lib/audit` and
 * `src/lib/reports` is now:
 *
 *   1. fetch the parent rows (capped),
 *   2. fetch every child row for those parents in ONE `.in(...)` query,
 *   3. join them here.
 *
 * Everything in this file is pure and synchronous — no Supabase client, no
 * session — which is exactly why it is the part worth unit-testing. The
 * database round trips are integration surface; the grouping logic is where a
 * silent correctness bug (wrong "latest" row, a dropped parent) would hide.
 */

/**
 * Index rows by key, keeping the **first** row seen per key.
 *
 * Callers order their query newest-first, so "first seen" is "most recent".
 * That contract is deliberate and load-bearing: it is what replaces N separate
 * `.order(created_at desc).limit(1)` queries with one batched read. Passing
 * rows in the wrong order would silently attach a stale compliance check to a
 * document, so callers must order explicitly rather than rely on insertion
 * order from Postgres.
 */
export function firstByKey<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T> {
  const out = new Map<K, T>();
  for (const row of rows) {
    const k = key(row);
    if (!out.has(k)) out.set(k, row);
  }
  return out;
}

/** Count rows per key — replaces "one count query per parent". */
export function countByKey<T, K>(
  rows: readonly T[],
  key: (row: T) => K,
): Map<K, number> {
  const out = new Map<K, number>();
  for (const row of rows) {
    const k = key(row);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

/** Group rows into buckets per key, preserving input order within a bucket. */
export function groupByKey<T, K>(
  rows: readonly T[],
  key: (row: T) => K,
): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = out.get(k);
    if (bucket) bucket.push(row);
    else out.set(k, [row]);
  }
  return out;
}

/** Distinct values in first-seen order — for building `.in(...)` filters. */
export function uniqueKeys<T, K>(rows: readonly T[], key: (row: T) => K): K[] {
  const seen = new Set<K>();
  const out: K[] = [];
  for (const row of rows) {
    const k = key(row);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

/**
 * A list that knows it was capped.
 *
 * It is still a plain array — `.map`, `.length`, spreading and every existing
 * caller keep working unchanged — with the cap metadata hung off it. That
 * matters because CLAUDE.md forbids showing a customer a partial list as if it
 * were complete: a UI that renders 200 of 900 review items and says nothing is
 * telling the reviewer their queue is clear when it is not. `truncated` gives
 * the page something honest to render ("showing the first 200 of 900").
 */
export type CappedList<T> = T[] & {
  /** Rows actually returned (never greater than `cap`). */
  readonly returned: number;
  /** The ceiling applied to this query. */
  readonly cap: number;
  /** True when the cap was hit, so more rows may exist beyond it. */
  readonly truncated: boolean;
};

/**
 * Tag an array with its cap.
 *
 * `truncated` is inferred from hitting the cap exactly. Callers therefore ask
 * the database for `cap` rows, not `cap + 1`: a list that happens to contain
 * exactly `cap` rows is reported as possibly-truncated. Over-reporting is the
 * safe direction — the page shows "first N" on a list that was in fact
 * complete, rather than hiding rows and claiming completeness.
 */
export function capped<T>(rows: T[], cap: number): CappedList<T> {
  return Object.assign(rows, {
    returned: rows.length,
    cap,
    truncated: rows.length >= cap,
  }) as CappedList<T>;
}
