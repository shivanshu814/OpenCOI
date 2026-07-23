#!/usr/bin/env npx tsx
/**
 * Load / scale smoke: insert up to N vendors via service role (destructive — use a throwaway org).
 *
 * Usage:
 *   LOAD_TEST_ORG_ID=<uuid> LOAD_TEST_N=1000 npx tsx scripts/load-test-1k-vendors.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */

import { createClient } from "@supabase/supabase-js";

const n = Number(process.env.LOAD_TEST_N ?? "1000");
const orgId = process.env.LOAD_TEST_ORG_ID?.trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

async function main() {
  if (!orgId || !url || !key) {
    console.error(
      "Set LOAD_TEST_ORG_ID, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }
  if (!Number.isFinite(n) || n < 1 || n > 5000) {
    console.error("LOAD_TEST_N must be 1–5000");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const batchSize = 100;
  let inserted = 0;
  const t0 = Date.now();

  for (let offset = 0; offset < n; offset += batchSize) {
    const size = Math.min(batchSize, n - offset);
    const rows = Array.from({ length: size }, (_, i) => {
      const idx = offset + i + 1;
      return {
        org_id: orgId,
        name: `LoadTest Vendor ${idx}`,
        email: `loadtest+${idx}@example.com`,
        trade: idx % 3 === 0 ? "Roofer" : "General",
        status: "missing_docs",
      };
    });
    const { error } = await supabase.from("vendors").insert(rows);
    if (error) {
      console.error("insert failed at", offset, error.message);
      process.exit(1);
    }
    inserted += size;
    console.log(`inserted ${inserted}/${n}`);
  }

  const listT0 = Date.now();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, status")
    .eq("org_id", orgId)
    .order("name")
    .limit(1000);
  if (error) {
    console.error("list failed", error.message);
    process.exit(1);
  }
  const listMs = Date.now() - listT0;

  console.log(
    JSON.stringify(
      {
        inserted,
        list_count: data?.length ?? 0,
        insert_ms: Date.now() - t0,
        list_1k_ms: listMs,
        ok: listMs < 5000,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
