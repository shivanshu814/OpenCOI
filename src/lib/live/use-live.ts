"use client";

import { onLiveEvent } from "@/lib/live/bus";
import { dropCache, readCache, writeCache } from "@/lib/live/idb";
import type { LiveTable } from "@/lib/live/tables";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Re-render the current server route when one of `tables` changes.
 *
 * Server Components own most of the workspace, so the cheapest way to make a
 * screen live is to re-run it. Refreshes are coalesced (a bulk import fires
 * one event per row) and deferred while the tab is hidden, with a single
 * catch-up refresh on return.
 */
export function useLiveRefresh(
  tables: readonly LiveTable[] | null,
  { debounceMs = 250 }: { debounceMs?: number } = {},
): void {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending = false;

    const run = () => {
      if (document.visibilityState !== "visible") {
        pending = true;
        return;
      }
      pending = false;
      router.refresh();
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, debounceMs);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && pending) run();
    };

    document.addEventListener("visibilitychange", onVisible);
    const off = onLiveEvent(tables, schedule);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) clearTimeout(timer);
      off();
    };
  }, [router, tables, debounceMs]);
}

/**
 * Run `handler` on every matching live event.
 *
 * The subscription is keyed on the table NAMES, not the array's identity, so
 * the ordinary call site `useLiveEvent(["orgs"], …)` does not tear down and
 * re-open the subscription on every render — which would also re-run any
 * refetch the handler triggers, forever.
 */
export function useLiveEvent(
  tables: readonly LiveTable[] | null,
  handler: () => void,
): void {
  // Kept in a ref so a new inline handler on every render does not tear down
  // and re-open the subscription. Assigned in an effect, never during render.
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  }, [handler]);

  const key = tables ? [...tables].sort().join(",") : "*";
  useEffect(() => {
    const list =
      key === "*" ? null : (key.split(",").filter(Boolean) as LiveTable[]);
    return onLiveEvent(list, () => ref.current());
  }, [key]);
}

export type CachedResource<T> = {
  data: T | null;
  /** True only when there is genuinely nothing to paint yet. */
  loading: boolean;
  /** True while revalidating on top of data already on screen. */
  refreshing: boolean;
  /** True when what you are looking at came from cache, not this fetch. */
  stale: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Optimistic local write — updates the screen without a round trip. */
  mutate: (next: T | ((prev: T | null) => T)) => void;
};

/**
 * Fetch-with-cache for client panels.
 *
 * The point is to delete the skeleton on every visit after the first: a
 * cached copy paints immediately while the network revalidates underneath,
 * and Realtime pushes invalidate it the moment the data actually changes.
 *
 * `maxAgeMs` bounds how old a cached copy may be before it is ignored for
 * first paint. Keep it SHORT for anything a customer might act on — this app
 * must never present a stale compliance verdict as if it were current — and
 * remember `stale` is exposed precisely so the surface can say so.
 */
export function useCachedResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  {
    scope,
    tables = null,
    maxAgeMs = 5 * 60_000,
    enabled = true,
  }: {
    /** Org id. Namespaces the cache so accounts never see each other's data. */
    scope: string | null;
    tables?: readonly LiveTable[] | null;
    maxAgeMs?: number;
    enabled?: boolean;
  },
): CachedResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same reasoning as useLiveEvent: callers pass an inline fetcher, and
  // re-subscribing on every render would refetch forever.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Guards a late response from overwriting a newer one (or an unmounted view).
  const runIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!enabled) return;
    const runId = ++runIdRef.current;
    setRefreshing(true);
    try {
      const fresh = await fetcherRef.current();
      if (!mountedRef.current || runId !== runIdRef.current) return;
      setData(fresh);
      setStale(false);
      setError(null);
      if (scope) void writeCache(scope, key, fresh);
    } catch (e) {
      if (!mountedRef.current || runId !== runIdRef.current) return;
      setError(e instanceof Error ? e.message : "Could not load");
    } finally {
      if (mountedRef.current && runId === runIdRef.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, [enabled, key, scope]);

  // First paint: cached copy if it is fresh enough, then always revalidate.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void (async () => {
      if (scope) {
        const cached = await readCache<T>(scope, key);
        if (
          !cancelled &&
          cached &&
          Date.now() - cached.storedAt <= maxAgeMs &&
          // A revalidation that already landed wins over the cached copy.
          runIdRef.current === 0
        ) {
          setData(cached.data);
          setStale(true);
          setLoading(false);
        }
      }
      if (!cancelled) await load();
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, key, scope, maxAgeMs, load]);

  // Realtime invalidation — the row changed, so the cached copy is wrong now.
  useLiveEvent(tables, () => {
    if (scope) void dropCache(scope, key);
    void load();
  });

  const mutate = useCallback(
    (next: T | ((prev: T | null) => T)) => {
      setData((prev) => {
        const value =
          typeof next === "function"
            ? (next as (p: T | null) => T)(prev)
            : next;
        if (scope) void writeCache(scope, key, value);
        return value;
      });
      setStale(false);
    },
    [key, scope],
  );

  return { data, loading, refreshing, stale, error, refetch: load, mutate };
}
