/** Seed a throwaway load-test org, print its id. Cleaned up by cleanup.ts. */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim()]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SLUG = "zz-perf-bench-temp";
const N_VENDORS = 1000;
const N_DOCS = 1500;

async function main() {
  await db.from("orgs").delete().eq("slug", SLUG);
  const { data: org, error } = await db.from("orgs")
    .insert({ name: "ZZ Perf Bench (temp)", slug: SLUG, intake_token: "zzbenchtemp0001" }).select("id").single();
  if (error) throw error;
  const orgId = org.id as string;
  console.log("orgId", orgId);

  const vendorIds: string[] = [];
  const statuses = ["compliant", "expiring", "non_compliant", "missing_docs", "in_review"];
  for (let o = 0; o < N_VENDORS; o += 200) {
    const rows = Array.from({ length: Math.min(200, N_VENDORS - o) }, (_, i) => ({
      org_id: orgId, name: `Bench Vendor ${String(o + i + 1).padStart(4, "0")}`,
      email: `bench+${o + i}@example.com`, trade: ["Roofer", "Plumber", "Electrician"][(o + i) % 3],
      status: statuses[(o + i) % 5],
    }));
    const { data, error: e } = await db.from("vendors").insert(rows).select("id");
    if (e) throw e;
    vendorIds.push(...data.map((r) => r.id as string));
  }
  console.log("vendors", vendorIds.length);

  const { data: prop } = await db.from("properties")
    .insert({ org_id: orgId, name: "Bench Tower", certificate_holder_name: "Bench LLC" })
    .select("id").single();
  const propertyId = prop!.id as string;
  for (let o = 0; o < vendorIds.length; o += 200) {
    await db.from("property_vendors").insert(
      vendorIds.slice(o, o + 200).map((v) => ({ org_id: orgId, property_id: propertyId, vendor_id: v })),
    );
  }
  console.log("property links done");

  const docIds: string[] = [];
  const docStatuses = ["in_internal_review", "published", "accepted", "checked"];
  for (let o = 0; o < N_DOCS; o += 200) {
    const rows = Array.from({ length: Math.min(200, N_DOCS - o) }, (_, i) => {
      const k = o + i;
      return {
        org_id: orgId, vendor_id: vendorIds[k % vendorIds.length],
        storage_path: `${orgId}/bench/${k}.pdf`, file_name: `bench-${k}.pdf`,
        status: docStatuses[k % 4],
      };
    });
    const { data, error: e } = await db.from("documents").insert(rows).select("id");
    if (e) throw e;
    docIds.push(...data.map((r) => r.id as string));
  }
  console.log("documents", docIds.length);

  for (let o = 0; o < docIds.length; o += 200) {
    const slice = docIds.slice(o, o + 200);
    await db.from("extractions").insert(slice.map((d, i) => ({
      org_id: orgId, document_id: d,
      payload: { insurers: [{ name: "Bench Mutual", naic: "12345" }], policies: [], note: "x".repeat(400) },
      model_version: "bench-1", prompt_version: "v1", overall_confidence: 0.95,
      cost_usd: 0.01, latency_ms: 1200 + i,
    })));
    await db.from("compliance_checks").insert(slice.map((d, i) => ({
      org_id: orgId, document_id: d, vendor_id: vendorIds[(o + i) % vendorIds.length],
      lines: [{ id: "gl", label: "GL each occurrence", verdict: "PASS", reason: "ok" }],
      overall_verdict: ["PASS", "FAIL", "MISSING", "EXPIRING"][i % 4],
      published_at: new Date().toISOString(),
    })));
  }
  console.log("extractions + checks done");

  for (let o = 0; o < 2000; o += 200) {
    await db.from("audit_events").insert(Array.from({ length: 200 }, (_, i) => ({
      org_id: orgId, actor_type: "system", actor_id: "bench",
      entity_type: (o + i) % 2 ? "document" : "vendor",
      entity_id: (o + i) % 2 ? docIds[(o + i) % docIds.length] : vendorIds[(o + i) % vendorIds.length],
      action: "bench_event", after_state: { status: "ok" },
    })));
  }
  console.log("audit events done");
  fs.writeFileSync("/tmp/bench-org-id", orgId);
  console.log("SEEDED", orgId);
}
main().catch((e) => { console.error(e); process.exit(1); });
