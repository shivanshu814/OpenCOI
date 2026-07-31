/**
 * Read back what the automated 12-hourly job has recorded.
 *
 * The job writes to `seo_snapshots`, which has RLS enabled and **no policies**
 * — deliberately, see migration 026 — so it is unreadable from the app, from
 * the Supabase dashboard's anon views, and from any client. The service role is
 * the only thing that can see it, which makes this script the way to answer
 * "is the automation actually running?".
 *
 * Reading the trend is the point. A single snapshot tells you almost nothing;
 * two tell you whether a deploy broke indexability.
 *
 * Run:  npm run seo:snapshots        # last 10 runs
 *       npm run seo:snapshots -- 1   # just the latest, in full
 */

import { createClient } from "@supabase/supabase-js";

import { today, writeReport } from "./lib";

type Snapshot = {
  id: string;
  captured_at: string;
  site_url: string;
  urls_total: number;
  urls_ok: number;
  urls_broken: number;
  urls_noindex: number;
  missing_title: number;
  missing_description: number;
  missing_canonical: number;
  perf_score: number | null;
  seo_score: number | null;
  lcp_ms: number | null;
  cls: string | null;
  gsc_clicks: number | null;
  gsc_impressions: number | null;
  gsc_avg_position: string | null;
  indexnow_submitted: number;
  indexnow_ok: boolean;
  content_hash: string | null;
  problems: string[];
  skipped: { check: string; reason: string }[];
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.log(
      "\n⊘ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set.\n" +
        "  The table is service-role-only by design (migration 026), so the\n" +
        "  anon key cannot read it — that is not a misconfiguration.\n",
    );
    process.exitCode = 1;
    return;
  }

  const limit = Number(process.argv[2]) || 10;
  const db = createClient(url, key);
  const { data, error } = await db
    .from("seo_snapshots")
    .select("*")
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.log(`\n❌ ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const rows = (data ?? []) as Snapshot[];
  if (rows.length === 0) {
    console.log(
      "\n⚪ No snapshots yet.\n" +
        "  The job runs at 06:00 and 18:00 UTC. To run it now, send the Inngest\n" +
        "  event `seo/monitor.run` (add `{ \"force\": true }` to push IndexNow\n" +
        "  even when content has not changed).\n",
    );
    return;
  }

  const latest = rows[0];
  console.log(`\n📊 SEO snapshots — ${rows.length} run(s), newest first\n`);
  console.log(`   latest: ${latest.captured_at}`);
  console.log(`   site:   ${latest.site_url}`);
  console.log(
    `   urls:   ${latest.urls_ok}/${latest.urls_total} ok · ${latest.urls_broken} broken · ${latest.urls_noindex} noindex`,
  );
  console.log(
    `   missing: ${latest.missing_title} title · ${latest.missing_description} desc · ${latest.missing_canonical} canonical`,
  );
  console.log(
    `   indexnow: ${latest.indexnow_ok ? `${latest.indexnow_submitted} submitted` : "FAILED"}`,
  );
  console.log(
    `   vitals: perf ${latest.perf_score ?? "—"} · seo ${latest.seo_score ?? "—"} · LCP ${latest.lcp_ms ?? "—"}ms · CLS ${latest.cls ?? "—"}`,
  );
  console.log(
    `   gsc:    ${latest.gsc_clicks === null ? "not measured" : `${latest.gsc_clicks} clicks · ${latest.gsc_impressions} impressions · pos ${latest.gsc_avg_position ?? "—"}`}`,
  );
  if (latest.problems?.length) {
    console.log(`   problems:`);
    for (const p of latest.problems) console.log(`     ❌ ${p}`);
  }
  if (latest.skipped?.length) {
    // Not an error. This is the column that distinguishes "the key is not
    // wired" from "the metric genuinely went to zero".
    console.log(`   not measured:`);
    for (const s of latest.skipped) console.log(`     ⊘ ${s.check}: ${s.reason}`);
  }

  const lines = [
    `# SEO snapshots`,
    ``,
    `_${today()} · ${rows.length} run(s)_`,
    ``,
    `| captured | ok/total | broken | noindex | perf | seo | LCP | IndexNow | GSC clicks | problems |`,
    `| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |`,
    ...rows.map(
      (r) =>
        `| ${r.captured_at.slice(0, 16).replace("T", " ")} | ${r.urls_ok}/${r.urls_total} | ${r.urls_broken} | ${r.urls_noindex} | ` +
        `${r.perf_score ?? "—"} | ${r.seo_score ?? "—"} | ${r.lcp_ms ?? "—"} | ` +
        `${r.indexnow_ok ? (r.indexnow_submitted || "unchanged") : "FAIL"} | ${r.gsc_clicks ?? "—"} | ${r.problems?.length ?? 0} |`,
    ),
    ``,
  ];

  console.log(`\n   report → ${await writeReport(`snapshots-${today()}.md`, lines.join("\n"))}\n`);
}

// Top-level await is unavailable: package.json has no "type": "module", so tsx
// transforms these to CJS. `void` marks the floating promise as deliberate.
void main();
