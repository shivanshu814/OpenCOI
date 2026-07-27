/**
 * Tiny IndexedDB cache for workspace panels — no dependency, fail-soft.
 *
 * Purpose is first paint, not offline: a panel that already showed you data
 * shows it again instantly on the next visit while the network revalidates in
 * the background, instead of flashing a skeleton every single time.
 *
 * Tenant safety is the reason every entry carries a `scope` (the org id) and
 * why sign-out wipes the database. IndexedDB survives sign-out and is shared
 * by every account that uses this browser profile, so an un-scoped cache
 * would be one shared computer away from showing one customer another
 * customer's vendor list. Nothing secret is ever written here — see the
 * excluded-table list in migration 024 for the same reasoning applied to
 * Realtime.
 */

const DB_NAME = "certshield-cache";
const DB_VERSION = 1;
const STORE = "resources";

export type CacheEntry<T> = {
  data: T;
  /** epoch ms — callers decide whether the entry is too old to paint. */
  storedAt: number;
};

type StoredRow = CacheEntry<unknown> & { id: string; scope: string };

function available(): boolean {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (!available()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("scope", "scope", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    // Private browsing, quota policy, or a blocked upgrade — cache is optional.
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });

  return dbPromise;
}

function rowId(scope: string, key: string): string {
  return `${scope}::${key}`;
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore | null {
  try {
    return db.transaction(STORE, mode).objectStore(STORE);
  } catch {
    return null;
  }
}

export async function readCache<T>(
  scope: string,
  key: string,
): Promise<CacheEntry<T> | null> {
  const db = await openDb();
  if (!db) return null;
  const store = tx(db, "readonly");
  if (!store) return null;

  return new Promise((resolve) => {
    const req = store.get(rowId(scope, key));
    req.onsuccess = () => {
      const row = req.result as StoredRow | undefined;
      if (!row || row.scope !== scope) {
        resolve(null);
        return;
      }
      resolve({ data: row.data as T, storedAt: row.storedAt });
    };
    req.onerror = () => resolve(null);
  });
}

export async function writeCache<T>(
  scope: string,
  key: string,
  data: T,
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const store = tx(db, "readwrite");
  if (!store) return;
  try {
    store.put({
      id: rowId(scope, key),
      scope,
      data,
      storedAt: Date.now(),
    } satisfies StoredRow);
  } catch {
    // Structured-clone failure (a Date, a Map, a function in the payload) or
    // quota — the panel still works, it just re-fetches next time.
  }
}

/** Drop one entry — used when a mutation makes the cached copy wrong. */
export async function dropCache(scope: string, key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const store = tx(db, "readwrite");
  if (!store) return;
  try {
    store.delete(rowId(scope, key));
  } catch {
    // Non-fatal.
  }
}

/** Wipe everything. Called on sign-out so the next account starts clean. */
export async function clearAllCache(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const store = tx(db, "readwrite");
  if (!store) return;
  try {
    store.clear();
  } catch {
    // Non-fatal.
  }
}
