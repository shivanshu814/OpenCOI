import { createClient } from "@supabase/supabase-js";

/** Service-role client for Inngest jobs / internal review ops. Never expose to browser. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Same reasoning as the request-scoped client: service-role reads back
      // freshly written rows (extraction results, verdicts), so a cached
      // fetch response would hand a job the state it just replaced.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
