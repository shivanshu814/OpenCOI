import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * One Supabase client per request, not per call site.
 *
 * `createServerClient` is not free — it reads the cookie store and builds the
 * auth, postgrest, storage and realtime sub-clients — and a single page render
 * calls this from the session lookup, the data layer, the report loader and
 * every server action it touches. React's `cache()` scopes the memo to one
 * request, so two orgs can never share an instance and a mutation is never
 * served a client holding pre-mutation cookies.
 *
 * Outside a request scope (scripts, background jobs) React's `cache` simply
 * does not memoize and every caller gets a fresh client — identical to the
 * previous behaviour, so nothing depends on the optimization being available.
 *
 * This is request-scoped memoization, NOT response caching: see the `no-store`
 * note below, which still applies to every query made through the client.
 */
export const createClient = cache(async function createClient() {
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
});
