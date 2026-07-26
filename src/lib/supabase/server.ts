import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env missing. Copy web/.env.example → web/.env.local");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    global: {
      /**
       * Opt every Supabase read out of Next's Data Cache.
       *
       * Supabase queries go over `fetch`, so Next is free to serve a cached
       * response when a Server Component re-renders. That made mutations look
       * like they had not saved: the write succeeded, `router.refresh()` re-ran
       * the page, and the cached fetch replayed the *old* rows — so the only
       * way to see a new vendor or a saved setting was a manual browser
       * reload. The framework documents exactly this ("refresh() could
       * re-produce the same result if fetch requests are cached").
       *
       * Live, per-tenant, RLS-scoped rows are never safely cacheable across
       * requests anyway — two orgs must not share a cached response.
       */
      fetch: (input, init) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware will refresh sessions.
        }
      },
    },
  });
}
