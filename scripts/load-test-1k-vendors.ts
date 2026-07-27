#!/usr/bin/env npx tsx
/**
 * Load / scale smoke: insert up to N vendors via service role (destructive — use a throwaway org).
 *
 * Usage:
 *   LOAD_TEST_ORG_ID=<uuid> LOAD_TEST_N=1000 npx tsx scripts/load-test-1k-vendors.ts
 *
 * Hot-path benchmark (read-only, inserts nothing):
 *   LOAD_TEST_ORG_ID=<uuid> LOAD_TEST_MODE=bench npx tsx scripts/load-test-1k-vendors.ts
 *
 * The bench mode times the query *shapes* the app's hot paths issue, so a
 * regression that reintroduces an N+1 or drops an index shows up as a number
 * rather than as "the app feels slow". It reports median wall-clock and the
 * round-trip count per path; round trips are the figure to watch, because they
 * are what the app controls and they scale with network latency to Supabase.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 * Note: the service role bypasses RLS, so bench timings exclude per-row policy
 * evaluation and are a floor, not a production figure.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const n = Number(process.env.LOAD_TEST_N ?? "1000");
const orgId = process.env.LOAD_TEST_ORG_ID?.trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const mode = process.env.LOAD_TEST_MODE?.trim() ?? "seed";
const reps = Number(process.env.LOAD_TEST_REPS ?? "5");

type BenchRow = {
  path: string;
  round_trips: number;
  median_ms: number;
  rows: number;
};

/** Median of `reps` timed runs, after one discarded warm-up. */
async function timed(
  path: string,
  round_trips: number,
  fn: () => Promise<number>,
): Promise<BenchRow> {
  await fn();
  const runs: number[] = [];
  let rows = 0;
  for (let i = 0; i < reps; i++) {
    const t0 = Date.now();
    rows = await fn();
    runs.push(Date.now() - t0);
  }
  runs.sort((a, b) => a - b);
  return { path, round_trips, median_ms: runs[Math.floor(runs.length / 2)], rows };
}

/**
 * Times the shapes behind the dashboard, review queue, vendors list, vendor
 * detail, reports and audit pages — matching what `src/lib/data`,
 * `src/lib/audit/list.ts` and `src/lib/reports/*load*.ts` actually issue.
 */
async function bench(db: SupabaseClient, org: string) {
  const DOC_COLS =
    "id, org_id, vendor_id, file_name, storage_path, status, created_at";
  const AUDIT_COLS =
    "id, org_id, actor_type, actor_id, actor_email, entity_type, entity_id, action, before_state, after_state, reason, ip_address, user_agent, created_at";

  const { data: anyDoc } = await db
    .from("documents").select("vendor_id").eq("org_id", org).limit(1);
  const vendorId = anyDoc?.[0]?.vendor_id as string | undefined;

  const out: BenchRow[] = [];

  // Review queue / awaiting-decision: one page of documents, then the latest
  // extraction + check for all of them in two batched reads (not two per row).
  out.push(await timed("review queue (batched hydrate)", 3, async () => {
    const { data: docs } = await db.from("documents").select(DOC_COLS)
      .eq("org_id", org).eq("status", "in_internal_review")
      .order("created_at", { ascending: true }).limit(200);
    const ids = (docs ?? []).map((d) => d.id as string);
    if (!ids.length) return 0;
    await Promise.all([
      db.from("extractions").select("document_id, payload")
        .eq("org_id", org).in("document_id", ids)
        .order("created_at", { ascending: false }),
      db.from("compliance_checks")
        .select("document_id, lines, overall_verdict, customer_decision, customer_decision_reason")
        .eq("org_id", org).in("document_id", ids)
        .order("created_at", { ascending: false }),
    ]);
    return ids.length;
  }));

  out.push(await timed("vendors page (page + 5 status counts)", 6, async () => {
    const statuses = ["compliant", "expiring", "non_compliant", "missing_docs", "in_review"];
    const [page] = await Promise.all([
      db.from("vendors").select("id, org_id, name, email, trade, status", { count: "exact" })
        .eq("org_id", org).order("name").range(0, 49),
      ...statuses.map((s) => db.from("vendors").select("id", { count: "exact", head: true })
        .eq("org_id", org).eq("status", s)),
    ]);
    return page.data?.length ?? 0;
  }));

  out.push(await timed("vendors page (status filter + name sort)", 1, async () => {
    const { data } = await db.from("vendors")
      .select("id, org_id, name, email, trade, status", { count: "exact" })
      .eq("org_id", org).eq("status", "compliant").order("name").range(0, 49);
    return data?.length ?? 0;
  }));

  out.push(await timed("vendor picker (500, no exact count)", 1, async () => {
    const { data } = await db.from("vendors")
      .select("id, org_id, name, email, trade, status")
      .eq("org_id", org).order("name").range(0, 499);
    return data?.length ?? 0;
  }));

  if (vendorId) {
    out.push(await timed("vendor detail audit trail", 3, async () => {
      const [{ data: docs }] = await Promise.all([
        db.from("documents").select("id").eq("org_id", org).eq("vendor_id", vendorId)
          .order("created_at", { ascending: false }).limit(300),
        db.from("audit_events").select(AUDIT_COLS).eq("org_id", org)
          .eq("entity_type", "vendor").eq("entity_id", vendorId)
          .order("created_at", { ascending: false }).limit(80),
      ]);
      const ids = (docs ?? []).map((d) => d.id as string);
      if (ids.length) {
        await db.from("audit_events").select(AUDIT_COLS).eq("org_id", org)
          .eq("entity_type", "document").in("entity_id", ids)
          .order("created_at", { ascending: false }).limit(80);
      }
      return ids.length;
    }));

    out.push(await timed("compliance report load", 4, async () => {
      const [, , { data: doc }] = await Promise.all([
        db.from("vendors").select("id, name, email, trade, status")
          .eq("id", vendorId).eq("org_id", org).maybeSingle(),
        db.from("orgs").select("brand_primary_color").eq("id", org).maybeSingle(),
        db.from("documents").select("id, file_name, status")
          .eq("org_id", org).eq("vendor_id", vendorId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (doc) {
        await db.from("compliance_checks").select("lines, overall_verdict")
          .eq("org_id", org).eq("document_id", doc.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
      }
      return doc ? 1 : 0;
    }));
  }

  out.push(await timed("reports page (owner rows)", 4, async () => {
    const [, { data: links }] = await Promise.all([
      db.from("properties")
        .select("id, name, city, state, owner_report_email, owner_report_enabled")
        .eq("org_id", org).order("name").limit(500),
      db.from("property_vendors").select("property_id, vendor_id").eq("org_id", org),
    ]);
    const vids = [...new Set((links ?? []).map((l) => l.vendor_id as string))];
    if (!vids.length) return 0;
    await Promise.all([
      db.from("vendors").select("id, status").eq("org_id", org).in("id", vids),
      db.from("documents").select("vendor_id").eq("org_id", org).in("vendor_id", vids),
    ]);
    return vids.length;
  }));

  out.push(await timed("audit trail page (150)", 1, async () => {
    const { data } = await db.from("audit_events").select(AUDIT_COLS)
      .eq("org_id", org).order("created_at", { ascending: false }).limit(150);
    return data?.length ?? 0;
  }));

  console.log(JSON.stringify({ org, reps, paths: out }, null, 2));
  console.table(out);
}

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
    // Match the app: never let a cached fetch stand in for a live read.
    global: { fetch: (i, x) => fetch(i, { ...x, cache: "no-store" }) },
  });

  // Read-only: benchmarks an org that already has data. Inserts nothing, so it
  // is safe to point at any org you are allowed to read.
  if (mode === "bench") {
    await bench(supabase, orgId);
    return;
  }

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
