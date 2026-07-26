import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { canAdminSensitive } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import {
  FIXTURE_GOLDEN_CASES,
  MONTH3_ACCURACY_GATE,
  scoreCorrectionCorpus,
  scoreGoldenSet,
  type GoldenSetCorrectionRow,
} from "@/lib/golden/accuracy";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminMetricsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin metrics"
          description="Demo mode — connect Supabase for live AI cost / queue metrics."
          live
          liveLabel="Demo"
        />
        <FixtureAccuracyCard />
      </div>
    );
  }

  const session = await getSessionOrg();
  if (!session) redirect("/login");
  if (!canAdminSensitive(session.role)) {
    return <PageHeader title="Admin metrics" description="Admins only." />;
  }

  const supabase = await createClient();
  const [
    { count: vendors },
    { count: inReview },
    { count: published },
    { data: extractions },
    { data: goldenRows },
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
      .select("field_path, before_value, after_value")
      .eq("org_id", session.orgId)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const corrections = (goldenRows ?? []) as GoldenSetCorrectionRow[];
  const golden = corrections.length;
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
    <div className="space-y-6">
      <PageHeader
        title="Admin metrics"
        description={`Founder / Admin ops view for ${session.orgName}. Until Month 3, 100% of verdicts still pass internal review before publish.`}
        live
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div
          className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r"
          aria-hidden
        />
        <CardHeader className="border-b pt-4">
          <CardTitle className="text-sm font-semibold">
            Document pipeline
          </CardTitle>
          <CardDescription className="text-xs">
            Org-scoped counts across the verification flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-4 sm:px-5">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
            <Metric label="Vendors" value={String(vendors ?? 0)} />
            <Metric label="In internal review" value={String(inReview ?? 0)} />
            <Metric label="Published docs" value={String(published ?? 0)} />
            <Metric label="Golden-set cases" value={String(golden ?? 0)} />
          </dl>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b pt-4">
          <CardTitle className="text-sm font-semibold">
            AI extraction ops
          </CardTitle>
          <CardDescription className="text-xs">
            Last {rows.length || 100} extractions — cost, latency, confidence,
            and model versions are logged on every call.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-4 sm:px-5">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
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
          </dl>
        </CardContent>
      </Card>

      <CorrectionAccuracyCard corrections={corrections} />

      <FixtureAccuracyCard />

      <p className="text-muted-foreground text-xs">
        <Link href="/security" className="underline-offset-4 hover:underline">
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
    <div>
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function CorrectionAccuracyCard({
  corrections,
}: {
  corrections: GoldenSetCorrectionRow[];
}) {
  const result = scoreCorrectionCorpus(corrections);
  const gate = Math.round(MONTH3_ACCURACY_GATE * 100);
  const measurable = result.total > 0;
  const pct = Math.round(result.accuracy * 100);
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b pt-4">
        <CardTitle className="text-sm font-semibold">
          Month 3 gate — real correction accuracy
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Measured only on real human review corrections (golden_set_cases) over
          date/limit fields. The ≥{gate}% gate is what reduces internal review —
          it is <strong>not</strong> a launch blocker (charging is allowed today
          because 100% of verdicts pass internal review before publish).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 py-4 sm:px-5">
        {measurable ? (
          <p className="text-3xl font-semibold tabular-nums">
            {pct}%
            <span className="text-muted-foreground text-sm font-normal">
              {" "}
              ({result.matched}/{result.total} gate fields)
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Not yet measurable — no labeled corrections. Add real ACORD
            corrections via the review queue to start scoring the gate.
          </p>
        )}
        <p className="text-muted-foreground text-xs">Gate: ≥{gate}%</p>
      </CardContent>
    </Card>
  );
}

function FixtureAccuracyCard() {
  const result = scoreGoldenSet(FIXTURE_GOLDEN_CASES);
  const pct = Math.round(result.accuracy * 100);
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b pt-4">
        <CardTitle className="text-sm font-semibold">
          Fixture harness (scorer self-check)
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          CI runs the scorer over seeded date/limit fixtures to catch code drift.
          These are hand-authored — <strong>not</strong> a measurement of real
          model accuracy. Real accuracy is the card above.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 py-4 sm:px-5">
        <p className="text-3xl font-semibold tabular-nums">
          {pct}%
          <span className="text-muted-foreground text-sm font-normal">
            {" "}
            ({result.matched}/{result.total} fixture fields)
          </span>
        </p>
        <p className="text-muted-foreground text-xs">Seeded fixtures</p>
      </CardContent>
    </Card>
  );
}
