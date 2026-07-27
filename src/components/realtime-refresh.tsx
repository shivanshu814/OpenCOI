"use client";

import { emitLiveEvent } from "@/lib/live/bus";
import { clearAllCache } from "@/lib/live/idb";
import { LIVE_TABLES, type LiveTable } from "@/lib/live/tables";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** How long to wait for SUBSCRIBED before assuming Realtime is unavailable. */
const SUBSCRIBE_GRACE_MS = 8_000;
/** Safety-net poll when Realtime never connects (proxy, offline, quota). */
const FALLBACK_POLL_MS = 30_000;
/** Coalesce bursts — a CSV import fires one event per row. */
const REFRESH_DEBOUNCE_MS = 250;

/**
 * The workspace's single Realtime connection.
 *
 * One channel carries every table in `LIVE_TABLES` (migration 024) and
 * republishes onto the in-process bus, so any number of live panels cost one
 * socket rather than one each. It also re-runs the current Server Component
 * route, which is what actually makes the server-rendered screens live.
 *
 * Guarantees:
 * - RLS is enforced by Realtime, so the browser only receives rows the
 *   signed-in user could already read. Subscribing widens liveness, never
 *   visibility.
 * - Fail-soft: if Realtime is unreachable or a table is missing from the
 *   publication, a 30s poll takes over so a screen cannot sit stale forever.
 *   Nothing throws and nothing blocks render.
 * - Refreshes pause while the tab is hidden and catch up once on return.
 */
export function RealtimeRefresh({ scope }: { scope?: string | null }) {
  const router = useRouter();
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Signing in as a different org must not inherit the previous org's cached
  // panels. IndexedDB outlives the session, so this is a real boundary.
  const lastScopeRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const previous = lastScopeRef.current;
    lastScopeRef.current = scope ?? null;
    if (previous !== undefined && previous !== (scope ?? null)) {
      void clearAllCache();
    }
  }, [scope]);

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return; // demo/misconfigured — silently skip
    }

    const doRefresh = () => {
      if (document.visibilityState !== "visible") {
        pendingRef.current = true;
        return;
      }
      pendingRef.current = false;
      router.refresh();
    };

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(doRefresh, REFRESH_DEBOUNCE_MS);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && pendingRef.current) {
        doRefresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    let channel = supabase.channel("workspace-live");
    for (const table of LIVE_TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            | { id?: string }
            | undefined;
          emitLiveEvent({
            table: table as LiveTable,
            type: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            id: row?.id ?? null,
          });
          scheduleRefresh();
        },
      );
    }

    let connected = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startFallbackPoll = () => {
      if (pollTimer || connected) return;
      pollTimer = setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, FALLBACK_POLL_MS);
    };

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        connected = true;
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        return;
      }
      // CHANNEL_ERROR / TIMED_OUT — the screen must not silently freeze just
      // because the socket did.
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        connected = false;
        startFallbackPoll();
      }
    });

    const graceTimer = setTimeout(() => {
      if (!connected) startFallbackPoll();
    }, SUBSCRIBE_GRACE_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timerRef.current) clearTimeout(timerRef.current);
      clearTimeout(graceTimer);
      if (pollTimer) clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
