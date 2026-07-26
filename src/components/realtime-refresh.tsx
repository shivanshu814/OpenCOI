"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Fail-soft Supabase Realtime listener (free, inbuilt).
 *
 * Subscribes to Postgres changes on `documents` (extraction pipeline status,
 * new intake, publish decisions) and refreshes the current server-rendered
 * route so review queue / dashboard update without manual reload.
 *
 * Guarantees:
 * - RLS is enforced by Supabase Realtime — the browser only receives rows the
 *   signed-in user can already read (org-scoped).
 * - Fail-soft by design: if Realtime is unreachable, the table is not in the
 *   `supabase_realtime` publication, or the subscription errors, NOTHING
 *   breaks — existing polling (review detail) and manual refresh still work.
 * - Refreshes are debounced and skipped while the tab is hidden (a pending
 *   refresh runs once on return) to keep free-tier message/refresh volume low.
 */
export function RealtimeRefresh() {
  const router = useRouter();
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      timerRef.current = setTimeout(doRefresh, 1500);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && pendingRef.current) {
        doRefresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const channel = supabase
      .channel("documents-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        scheduleRefresh,
      )
      .subscribe(); // non-SUBSCRIBED statuses are ignored — polling covers us

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
