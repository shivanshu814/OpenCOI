/**
 * Hot-path benchmark: runs the BEFORE query shape and the AFTER query shape for
 * each path against a seeded org, using a real authenticated JWT so RLS applies.
 */
import fs from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim()]; }),
);
const orgId = fs.readFileSync("/tmp/bench-org-id", "utf8").trim();
const jwt = fs.readFileSync("/tmp/bench-jwt", "utf8").trim();
const db: SupabaseClient = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` }, fetch: (i, x) => fetch(i, { ...x, cache: "no-store" }) } },
);

const REPS = Number(process.env.BENCH_REPS ?? "5");
type Res = { path: string; variant: string; ms: number; queries: number; rows: number };
const out: Res[] = [];

async function time(path: string, variant: string, fn: () => Promise<{ queries: number; rows: number }>) {
  await fn(); // warm
  const runs: number[] = [];
  let last = { queries: 0, rows: 0 };
  for (let i = 0; i < REPS; i++) {
    const t = Date.now();
    last = await fn();
    runs.push(Date.now() - t);
  }
  runs.sort((a, b) => a - b);
  out.push({ path, variant, ms: runs[Math.floor(runs.length / 2)], ...last });
}

// ---------------------------------------------------------------- review queue
const REVIEW_COLS = "id, org_id, vendor_id, file_name, storage_path, status, created_at";

async function reviewQueueBefore() {
  const { data: docs } = await db.from("documents").select(REVIEW_COLS)
    .eq("org_id", orgId).eq("status", "in_internal_review").order("created_at", { ascending: true });
  let q = 1;
  await Promise.all((docs ?? []).map(async (d) => {
    await Promise.all([
      db.from("extractions").select("payload").eq("document_id", d.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("compliance_checks").select("lines, overall_verdict, customer_decision, customer_decision_reason")
        .eq("document_id", d.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    q += 2;
  }));
  return { queries: q, rows: docs?.length ?? 0 };
}

async function reviewQueueAfter() {
  const { data: docs } = await db.from("documents").select(REVIEW_COLS)
    .eq("org_id", orgId).eq("status", "in_internal_review")
    .order("created_at", { ascending: true }).limit(200);
  const ids = (docs ?? []).map((d) => d.id as string);
  if (ids.length) {
    await Promise.all([
      db.from("extractions").select("document_id, payload").eq("org_id", orgId)
        .in("document_id", ids).order("created_at", { ascending: false }),
      db.from("compliance_checks")
        .select("document_id, lines, overall_verdict, customer_decision, customer_decision_reason")
        .eq("org_id", orgId).in("document_id", ids).order("created_at", { ascending: false }),
    ]);
  }
  return { queries: ids.length ? 3 : 1, rows: ids.length };
}

// ------------------------------------------------------------ vendors page
async function vendorsPageBefore() {
  const statuses = ["compliant", "expiring", "non_compliant", "missing_docs", "in_review"];
  await Promise.all([
    db.from("vendors").select("id, org_id, name, email, trade, status", { count: "exact" })
      .eq("org_id", orgId).order("name").range(0, 49),
    ...statuses.map((s) => db.from("vendors").select("id", { count: "exact", head: true })
      .eq("org_id", orgId).eq("status", s)),
  ]);
  return { queries: 6, rows: 50 };
}
async function vendorsPageStatusFilterBefore() {
  const { data } = await db.from("vendors").select("id, org_id, name, email, trade, status", { count: "exact" })
    .eq("org_id", orgId).eq("status", "compliant").order("name").range(0, 49);
  return { queries: 1, rows: data?.length ?? 0 };
}

// ------------------------------------------------------------ vendor picker
async function vendorPickerWithCount() {
  const { data } = await db.from("vendors").select("id, org_id, name, email, trade, status", { count: "exact" })
    .eq("org_id", orgId).order("name").range(0, 499);
  return { queries: 1, rows: data?.length ?? 0 };
}
async function vendorPickerNoCount() {
  const { data } = await db.from("vendors").select("id, org_id, name, email, trade, status")
    .eq("org_id", orgId).order("name").range(0, 499);
  return { queries: 1, rows: data?.length ?? 0 };
}

// ------------------------------------------------------------ vendor detail
async function vendorAuditBefore(vendorId: string) {
  const SEL = "id, org_id, actor_type, actor_id, actor_email, entity_type, entity_id, action, before_state, after_state, reason, ip_address, user_agent, created_at";
  const { data: docs } = await db.from("documents").select("id").eq("org_id", orgId).eq("vendor_id", vendorId);
  await db.from("audit_events").select(SEL).eq("org_id", orgId)
    .eq("entity_type", "vendor").eq("entity_id", vendorId).order("created_at", { ascending: false }).limit(80);
  const ids = (docs ?? []).map((d) => d.id as string);
  if (ids.length) {
    await db.from("audit_events").select(SEL).eq("org_id", orgId)
      .eq("entity_type", "document").in("entity_id", ids).order("created_at", { ascending: false }).limit(80);
  }
  return { queries: ids.length ? 3 : 2, rows: ids.length };
}
async function vendorAuditAfter(vendorId: string) {
  const SEL = "id, org_id, actor_type, actor_id, actor_email, entity_type, entity_id, action, before_state, after_state, reason, ip_address, user_agent, created_at";
  const [{ data: docs }] = await Promise.all([
    db.from("documents").select("id").eq("org_id", orgId).eq("vendor_id", vendorId).limit(500),
    db.from("audit_events").select(SEL).eq("org_id", orgId)
      .eq("entity_type", "vendor").eq("entity_id", vendorId).order("created_at", { ascending: false }).limit(80),
  ]);
  const ids = (docs ?? []).map((d) => d.id as string);
  if (ids.length) {
    await db.from("audit_events").select(SEL).eq("org_id", orgId)
      .eq("entity_type", "document").in("entity_id", ids).order("created_at", { ascending: false }).limit(80);
  }
  return { queries: ids.length ? 3 : 2, rows: ids.length };
}

// ------------------------------------------------------------ owner reports
async function ownerRowsBefore() {
  const { data: props } = await db.from("properties")
    .select("id, name, city, state, owner_report_email, owner_report_enabled").eq("org_id", orgId).order("name");
  const pids = (props ?? []).map((p) => p.id as string);
  const { data: links } = await db.from("property_vendors").select("property_id, vendor_id")
    .eq("org_id", orgId).in("property_id", pids);
  const vids = [...new Set((links ?? []).map((l) => l.vendor_id as string))];
  await Promise.all([
    db.from("vendors").select("id, status").eq("org_id", orgId).in("id", vids),
    db.from("documents").select("vendor_id").eq("org_id", orgId).in("vendor_id", vids),
  ]);
  return { queries: 4, rows: vids.length };
}
async function ownerRowsAfter() {
  const [{ data: props }, { data: links }] = await Promise.all([
    db.from("properties").select("id, name, city, state, owner_report_email, owner_report_enabled")
      .eq("org_id", orgId).order("name").limit(500),
    db.from("property_vendors").select("property_id, vendor_id").eq("org_id", orgId),
  ]);
  const vids = [...new Set((links ?? []).map((l) => l.vendor_id as string))];
  await Promise.all([
    db.from("vendors").select("id, status").eq("org_id", orgId).in("id", vids),
    db.from("documents").select("vendor_id").eq("org_id", orgId).in("vendor_id", vids),
  ]);
  void props;
  return { queries: 4, rows: vids.length };
}

// ------------------------------------------------------------ audit trail page
async function auditPage() {
  const SEL = "id, org_id, actor_type, actor_id, actor_email, entity_type, entity_id, action, before_state, after_state, reason, ip_address, user_agent, created_at";
  const { data } = await db.from("audit_events").select(SEL).eq("org_id", orgId)
    .order("created_at", { ascending: false }).limit(150);
  return { queries: 1, rows: data?.length ?? 0 };
}
async function auditPageActionFilter() {
  const SEL = "id, org_id, actor_type, actor_id, actor_email, entity_type, entity_id, action, before_state, after_state, reason, ip_address, user_agent, created_at";
  const { data } = await db.from("audit_events").select(SEL).eq("org_id", orgId)
    .eq("action", "bench_event").order("created_at", { ascending: false }).limit(150);
  return { queries: 1, rows: data?.length ?? 0 };
}

// ------------------------------------------------------------ report load
async function reportLoadBefore(vendorId: string) {
  await Promise.all([
    db.from("vendors").select("id, name, email, trade, status").eq("id", vendorId).eq("org_id", orgId).maybeSingle(),
    db.from("orgs").select("brand_primary_color").eq("id", orgId).maybeSingle(),
  ]);
  const { data: doc } = await db.from("documents").select("id, file_name, status")
    .eq("org_id", orgId).eq("vendor_id", vendorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (doc) {
    await db.from("compliance_checks").select("lines, overall_verdict").eq("document_id", doc.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
  }
  return { queries: doc ? 4 : 3, rows: 1 };
}
async function reportLoadAfter(vendorId: string) {
  const [, , { data: doc }] = await Promise.all([
    db.from("vendors").select("id, name, email, trade, status").eq("id", vendorId).eq("org_id", orgId).maybeSingle(),
    db.from("orgs").select("brand_primary_color").eq("id", orgId).maybeSingle(),
    db.from("documents").select("id, file_name, status")
      .eq("org_id", orgId).eq("vendor_id", vendorId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (doc) {
    await db.from("compliance_checks").select("lines, overall_verdict").eq("org_id", orgId).eq("document_id", doc.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
  }
  return { queries: doc ? 4 : 3, rows: 1 };
}

// ------------------------------------------------------------ published gaps
async function publishedGaps(vendorId: string) {
  const { data } = await db.from("compliance_checks").select("lines, published_at")
    .eq("org_id", orgId).eq("vendor_id", vendorId).not("published_at", "is", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return { queries: 1, rows: data ? 1 : 0 };
}

async function main() {
  const { data: v } = await db.from("vendors").select("id").eq("org_id", orgId).order("name").limit(1);
  const vendorId = v![0].id as string;
  const { data: busy } = await db.from("documents").select("vendor_id").eq("org_id", orgId).limit(1);
  const busyVendor = busy![0].vendor_id as string;

  await time("review queue (dashboard + /app/review)", process.argv[2] ?? "before", reviewQueueBefore);
  await time("review queue (dashboard + /app/review)", "after ", reviewQueueAfter);
  await time("vendors page (list + 5 status counts)", "current", vendorsPageBefore);
  await time("vendors page (status filter + name sort)", "current", vendorsPageStatusFilterBefore);
  await time("vendor picker 500 (with exact count)", "before", vendorPickerWithCount);
  await time("vendor picker 500 (no count)", "after ", vendorPickerNoCount);
  await time("vendor detail audit trail", "before", () => vendorAuditBefore(busyVendor));
  await time("vendor detail audit trail", "after ", () => vendorAuditAfter(busyVendor));
  await time("reports page (owner rows)", "before", ownerRowsBefore);
  await time("reports page (owner rows)", "after ", ownerRowsAfter);
  await time("audit trail page (150)", "current", auditPage);
  await time("audit trail page (action filter)", "current", auditPageActionFilter);
  await time("compliance report load", "before", () => reportLoadBefore(busyVendor));
  await time("compliance report load", "after ", () => reportLoadAfter(busyVendor));
  await time("portal published gaps", "current", () => publishedGaps(busyVendor));

  console.log("\n" + JSON.stringify(out, null, 1));
  const label = process.env.BENCH_LABEL ?? "run";
  fs.writeFileSync(`/tmp/bench-${label}.json`, JSON.stringify(out, null, 1));
  console.table(out);
}
main().catch((e) => { console.error(e); process.exit(1); });
