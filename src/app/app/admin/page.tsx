import { canAdminSensitive } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import {
  FIXTURE_GOLDEN_CASES,
  MONTH3_ACCURACY_GATE,
  scoreGoldenSet,
} from "@/lib/golden/accuracy";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminMetricsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Admin metrics</h1>
        <p className="text-muted-foreground text-sm">
          Demo mode — connect Supabase for live AI cost / queue metrics.
        </p>
        <FixtureAccuracyCard />
      </div>
    );
  }

  const session = await getSessionOrg();
  if (!session) redirect("/login");
  if (!canAdminSensitive(session.role)) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Admin metrics</h1>
        <p className="text-muted-foreground text-sm">Admins only.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [
    { count: vendors },
    { count: inReview },
    { count: published },
    { data: extractions },
    { count: golden },
  ] = await Promise.all([
    supabase
      .from("vendors")
      .select("*", { count: "exact", head: true })
      .eq("org_id", session.orgId),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("org_id", session.orgId)
      .eq("status", "in_internal_review"),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("org_id", session.orgId)
      .eq("status", "published"),
    supabase
      .from("extractions")
      .select("cost_usd, latency_ms, overall_confidence, model_version")
      .eq("org_id", session.orgId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("golden_set_cases")
      .select("*", { count: "exact", head: true })
      .eq("org_id", session.orgId),
  ]);

  const rows = extractions ?? [];
  const cost = rows.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
  const avgLatency =
    rows.length === 0
      ? 0
      : Math.round(
          rows.reduce((s, r) => s + Number(r.latency_ms ?? 0), 0) / rows.length,
        );
  const avgConf =
    rows.length === 0
      ? 0
      : rows.reduce((s, r) => s + Number(r.overall_confidence ?? 0), 0) /
        rows.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin metrics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Founder / Admin ops view for {session.orgName}. Until Month 3, 100% of
          verdicts still pass internal review before publish.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Vendors" value={String(vendors ?? 0)} />
        <Metric label="In internal review" value={String(inReview ?? 0)} />
        <Metric label="Published docs" value={String(published ?? 0)} />
        <Metric label="Golden-set cases" value={String(golden ?? 0)} />
        <Metric label="AI cost (last 100)" value={`$${cost.toFixed(4)}`} />
        <Metric label="Avg latency (ms)" value={String(avgLatency)} />
        <Metric
          label="Avg confidence"
          value={`${Math.round(avgConf * 100)}%`}
        />
        <Metric
          label="Models seen"
          value={String(
            new Set(rows.map((r) => r.model_version).filter(Boolean)).size,
          )}
        />
      </div>

      <FixtureAccuracyCard />

      <p className="text-muted-foreground text-xs">
        <Link href="/security" className="underline">
          Security page
        </Link>{" "}
        · Document review assistance — not legal, insurance, or professional
        advice.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function FixtureAccuracyCard() {
  const result = scoreGoldenSet(FIXTURE_GOLDEN_CASES);
  const pct = Math.round(result.accuracy * 100);
  const gate = Math.round(MONTH3_ACCURACY_GATE * 100);
  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-sm font-medium">Golden-set fixture accuracy</h2>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        CI harness on seeded date/limit fixtures. Month 3 SCALE gate is ≥{gate}%
        on a 100-cert real ACORD corpus (charging already allowed under 100%
        internal review).
      </p>
      <p className="mt-3 text-3xl font-semibold tabular-nums">
        {pct}%
        <span className="text-muted-foreground text-sm font-normal">
          {" "}
          ({result.matched}/{result.total} fields)
        </span>
      </p>
    </div>
  );
}
