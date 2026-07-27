import type { LiveEvent, LiveTable } from "@/lib/live/tables";

/**
 * Process-local fan-out for Realtime events.
 *
 * One Supabase channel serves the whole tab (see `RealtimeProvider`) and
 * republishes here. Every component that wants live data listens to this bus
 * instead of opening its own socket — Supabase bills and rate-limits per
 * connection, and a dashboard with a dozen live cards would otherwise open a
 * dozen of them.
 */
type Listener = (event: LiveEvent) => void;

const listeners = new Set<{ tables: Set<LiveTable> | null; fn: Listener }>();

/**
 * Subscribe to changes. `tables` of null means "every table".
 * Returns an unsubscribe function.
 */
export function onLiveEvent(
  tables: readonly LiveTable[] | null,
  fn: Listener,
): () => void {
  const entry = {
    tables: tables ? new Set(tables) : null,
    fn,
  };
  listeners.add(entry);
  return () => {
    listeners.delete(entry);
  };
}

export function emitLiveEvent(event: LiveEvent): void {
  for (const entry of listeners) {
    if (entry.tables && !entry.tables.has(event.table)) continue;
    try {
      entry.fn(event);
    } catch {
      // A broken listener must never take down the shared channel.
    }
  }
}

/** Test/diagnostic helper — how many live listeners are attached. */
export function liveListenerCount(): number {
  return listeners.size;
}
