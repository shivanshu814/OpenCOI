import {
  CardLiveAccent,
  LiveBadge,
  LiveDot,
} from "@/components/live-activity";
import { PageHeader } from "@/components/page-header";
import { ScoreRing } from "@/components/product-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { canAdminSensitive } from "@/lib/auth/roles";
import { carrierDatasetInfo } from "@/lib/carriers/ratings";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import {
  FIXTURE_GOLDEN_CASES,
  MONTH3_ACCURACY_GATE,
  scoreCorrectionCorpus,
  scoreGoldenSet,
  type GoldenSetCorrectionRow,
} from "@/lib/golden/accuracy";
import { formatDate } from "@/lib/ui/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import {
  Banknote,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Cpu,
  FileText,
  FlaskConical,
  Gauge,
  Send,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const GATE_PCT = Math.round(MONTH3_ACCURACY_GATE * 100);

export default async function AdminMetricsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ops dashboard"
          description="Your behind-the-scenes control room — pipeline health, what the AI costs, and how close you are to the Month 3 accuracy gate."
          audience="You (founder) & org admins"
          nextStep="Connect Supabase to see live pipeline and AI-cost numbers."
          help="Ops-only view. Until the Month 3 accuracy gate, 100% of verdicts still pass your review before they go live. Document review assistance — not legal, insurance, or professional advice."
          live
          liveLabel="Demo"
        />
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-5">
            <LiveDot tone="warn" />
            <p className="text-muted-foreground text-sm">
              Demo mode — the live pipeline, AI-cost, and accuracy numbers appear
              once Supabase is wired. The engineering self-check below still runs.
            </p>
          </CardContent>
        </Card>
        <GateCard corrections={[]} correctionCount={0} />
        <EngineeringSelfCheck />
      </div>
    );
  }

  const session = await getSessionOrg();
  if (!session) redirect("/login");
  if (!canAdminSensitive(session.role)) {
    return (
      <PageHeader
        title="Ops dashboard"
        description="Behind-the-scenes metrics for pipeline health, AI cost, and the Month 3 accuracy gate."
        audience="Founder / org admins only"
        nextStep="Ask an admin if you need access to this view."
        live={false}
      />
    );
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
  const rows = extractions ?? [];
  const reads = rows.length;
  const cost = rows.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
  const avgLatency =
    reads === 0
      ? 0
      : Math.round(rows.reduce((s, r) => s + Number(r.latency_ms ?? 0), 0) / reads);
  const avgConf =
    reads === 0
      ? 0
      : rows.reduce((s, r) => s + Number(r.overall_confidence ?? 0), 0) / reads;
  const modelsUsed = new Set(
    rows.map((r) => r.model_version).filter(Boolean),
  ).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ops dashboard"
        description={`Your behind-the-scenes control room for ${session.orgName} — where every COI sits, what the AI costs, and how close you are to the Month 3 accuracy gate.`}
        audience="You (founder) & org admins"
        nextStep={
          inReview && inReview > 0 ? (
            <>
              Clear the{" "}
              <Link
                href="/app/review"
                className="text-foreground underline-offset-2 hover:underline"
              >
                review queue
              </Link>{" "}
              — every verdict is yours to approve.
            </>
          ) : (
            "Watch AI cost and grow the accuracy gate with real corrections."
          )
        }
        help="Until the Month 3 accuracy gate, 100% of verdicts still pass your review before they go live — CertShield never auto-approves. Document review assistance — not legal, insurance, or professional advice."
        live
      />

      {/* Pipeline health — where every COI is right now */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Pipeline health</h2>
          <LiveBadge label="Live" tone="ok" />
          <span className="text-muted-foreground text-xs">
            Where every COI sits, from vendor to a verdict your customer can see.
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Users className="size-4" strokeWidth={2} />}
            tone="brand"
            label="Vendors tracked"
            value={vendors ?? 0}
            hint="Contractors & suppliers in this workspace"
          />
          <StatCard
            icon={<ClipboardCheck className="size-4" strokeWidth={2} />}
            tone={inReview && inReview > 0 ? "info" : "ok"}
            label="Waiting for your approval"
            value={inReview ?? 0}
            hint="COIs read by AI — you approve before publish"
            href="/app/review"
            cta="Open review queue"
          />
          <StatCard
            icon={<CheckCircle2 className="size-4" strokeWidth={2} />}
            tone="ok"
            label="Published & live"
            value={published ?? 0}
            hint="Verdicts your customers can already see"
          />
        </div>
      </section>

      {/* Month 3 accuracy gate — the centerpiece, honest */}
      <GateCard corrections={corrections} correctionCount={corrections.length} />

      <CarrierDatasetCard />

      {/* What the AI is doing — cost / speed / confidence */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">What the AI is doing</h2>
          <LiveBadge label="Logged" tone="info" />
          <span className="text-muted-foreground text-xs">
            Cost, speed, confidence, and model version are recorded on every
            read — no hidden AI spend.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<Banknote className="size-4" strokeWidth={2} />}
            tone="brand"
            label="AI cost"
            value={`$${cost.toFixed(4)}`}
            hint={reads > 0 ? `Across your last ${reads} reads` : "No reads yet"}
          />
          <StatCard
            icon={<Gauge className="size-4" strokeWidth={2} />}
            tone="info"
            label="Avg. speed"
            value={reads > 0 ? `${avgLatency} ms` : "—"}
            hint="Time to read one certificate"
          />
          <StatCard
            icon={<Target className="size-4" strokeWidth={2} />}
            tone={avgConf >= 0.9 ? "ok" : "warn"}
            label="Avg. confidence"
            value={reads > 0 ? `${Math.round(avgConf * 100)}%` : "—"}
            hint="Below 90% always goes to your review"
          />
          <StatCard
            icon={<Cpu className="size-4" strokeWidth={2} />}
            tone="brand"
            label="AI models used"
            value={modelsUsed}
            hint="Pinned & version-logged per read"
          />
        </div>
      </section>

      {/* Engineering self-check — de-emphasized, collapsible */}
      <EngineeringSelfCheck />
    </div>
  );
}

const TONE_STYLES: Record<
  string,
  { icon: string; value: string; dot: "brand" | "ok" | "warn" | "info" }
> = {
  brand: { icon: "bg-brand-muted text-brand", value: "text-foreground", dot: "brand" },
  ok: {
    icon: "status-surface status-ok",
    value: "text-foreground",
    dot: "ok",
  },
  warn: {
    icon: "status-surface status-warn",
    value: "text-foreground",
    dot: "warn",
  },
  info: { icon: "bg-sky-50 text-sky-700", value: "text-foreground", dot: "info" },
};

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "brand",
  href,
  cta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint: string;
  tone?: "brand" | "ok" | "warn" | "info";
  href?: string;
  cta?: string;
}) {
  const t = TONE_STYLES[tone] ?? TONE_STYLES.brand;
  const active = value !== 0 && value !== "—";
  return (
    <Card className="gap-0 overflow-hidden py-0 transition-shadow hover:shadow-sm">
      <CardLiveAccent />
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              t.icon,
            )}
          >
            {icon}
          </span>
          {active ? <LiveDot tone={t.dot} ping={false} /> : null}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-foreground/90 mt-0.5 text-sm font-medium">
            {label}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
            {hint}
          </p>
        </div>
        {href && cta ? (
          <Link
            href={href}
            className="text-brand mt-auto inline-flex items-center gap-1 text-xs font-semibold underline-offset-4 hover:underline"
          >
            {cta}
            <ChevronRight className="size-3.5" strokeWidth={2.5} />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Month 3 accuracy gate. Measured ONLY on real human review corrections
 * (golden_set_cases) over date/limit fields. Never fabricates ≥98% — shows an
 * honest "not measurable yet" state until real ACORD corrections exist.
 */
function GateCard({
  corrections,
  correctionCount,
}: {
  corrections: GoldenSetCorrectionRow[];
  correctionCount: number;
}) {
  const result = scoreCorrectionCorpus(corrections);
  const measurable = result.total > 0;
  const pct = Math.round(result.accuracy * 100);
  const met = measurable && pct >= GATE_PCT;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardLiveAccent />
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
        {/* Left: status visual */}
        <div className="flex items-center gap-4 sm:w-64 sm:shrink-0">
          {measurable ? (
            <ScoreRing score={pct} size="lg" />
          ) : (
            <span className="bg-muted text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-full">
              <Target className="size-7" strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Target className="text-brand size-4" strokeWidth={2} />
              <h2 className="text-sm font-semibold">Month 3 accuracy gate</h2>
            </div>
            {measurable ? (
              <LiveBadge
                className="mt-1.5"
                label={met ? `Gate met · ≥${GATE_PCT}%` : `Below ${GATE_PCT}% gate`}
                tone={met ? "ok" : "warn"}
              />
            ) : (
              <LiveBadge
                className="mt-1.5"
                label="Not measurable yet"
                tone="info"
              />
            )}
          </div>
        </div>

        {/* Right: plain-language meaning + next step */}
        <div className="min-w-0 flex-1 space-y-3">
          {measurable ? (
            <>
              <p className="text-sm">
                The AI is getting{" "}
                <span className="font-semibold tabular-nums">{pct}%</span> of
                dates &amp; dollar limits right on the certificates you&apos;ve
                corrected ({result.matched} of {result.total} checked). The goal
                is <span className="font-semibold">≥{GATE_PCT}%</span>.
              </p>
              <GateMeter pct={pct} />
            </>
          ) : (
            <p className="text-sm">
              No score yet — this only becomes real once you&apos;ve corrected
              some certificates. Add real ACORD corrections in the review queue
              and this fills in automatically. We&apos;ll never show a fake
              number here.
            </p>
          )}

          <div className="bg-muted/50 text-muted-foreground rounded-lg px-3 py-2.5 text-xs leading-relaxed">
            <span className="text-foreground font-medium">
              What this means:
            </span>{" "}
            hitting ≥{GATE_PCT}% is what lets you safely review fewer
            certificates by hand — it is <strong>not</strong> a launch blocker.
            You can charge today because every verdict already passes your review
            before it goes live.{" "}
            {correctionCount > 0 ? (
              <span className="text-foreground/80">
                {correctionCount} correction
                {correctionCount === 1 ? "" : "s"} captured so far.
              </span>
            ) : null}
          </div>

          <Button
            variant="outline"
            size="sm"
            render={<Link href="/app/review" />}
          >
            <Send className="size-3.5" strokeWidth={2} />
            {measurable ? "Add more corrections" : "Add ACORD corrections"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Simple progress bar with a marker at the ≥98% gate line. */
function GateMeter({ pct }: { pct: number }) {
  const met = pct >= GATE_PCT;
  return (
    <div className="space-y-1">
      <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            met ? "bg-[var(--status-ok)]" : "bg-[var(--status-warn)]",
          )}
          style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
        />
      </div>
      <div className="text-muted-foreground relative h-3 text-[10px]">
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${GATE_PCT}%` }}
        >
          ▲ ≥{GATE_PCT}% gate
        </span>
      </div>
    </div>
  );
}

/**
 * Fixture harness — a CI self-check that runs the scorer over hand-authored
 * ACORD fixtures to catch code drift. NOT a measurement of real model accuracy
 * (that is the gate card above). De-emphasized behind a collapsible.
 */
function EngineeringSelfCheck() {
  const result = scoreGoldenSet(FIXTURE_GOLDEN_CASES);
  const pct = Math.round(result.accuracy * 100);
  return (
    <Collapsible className="group/eng">
      <Card className="gap-0 py-0">
        <CollapsibleTrigger className="hover:bg-muted/40 flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors">
          <span className="flex items-center gap-2.5">
            <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
              <FlaskConical className="size-4" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                Engineering self-check
              </span>
              <span className="text-muted-foreground block text-xs">
                Automated code test — not real model accuracy
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <LiveBadge
              label={pct === 100 ? "Passing" : `${pct}%`}
              tone={pct === 100 ? "ok" : "warn"}
            />
            <ChevronRight className="text-muted-foreground size-4 transition-transform group-data-open/eng:rotate-90" />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="text-muted-foreground space-y-2 border-t px-4 py-4 text-xs leading-relaxed">
            <p>
              Our test suite runs the accuracy scorer over{" "}
              {result.total} seeded date &amp; limit fields from hand-authored
              ACORD examples, every time we ship code. It caught{" "}
              <span className="text-foreground font-medium tabular-nums">
                {result.matched}/{result.total}
              </span>{" "}
              this run. This is a guard against bugs in the scoring code — it
              does <strong>not</strong> reflect how accurate the AI is on your
              real certificates. That honest number lives in the Month 3
              accuracy gate above.
            </p>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * B6 provenance — how many carriers we can rate, from what, and how fresh.
 *
 * Surfaced because an unknown or stale carrier silently changes a verdict
 * into a review hand-off. Ops needs to see that happening rather than wonder
 * why carrier checks stopped concluding.
 */
function CarrierDatasetCard() {
  const info = carrierDatasetInfo();

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Carrier ratings data (B6)</h2>
        <LiveBadge
          label={info.stale ? "Refresh due" : "Fresh"}
          tone={info.stale ? "warn" : "ok"}
        />
        <span className="text-muted-foreground text-xs">
          An unrated carrier is always a review signal — never an automatic
          fail.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<ShieldCheck className="size-4" strokeWidth={2} />}
          tone="brand"
          label="Carriers we can rate"
          value={info.carrierCount}
          hint="Everything else routes to human review"
        />
        <StatCard
          icon={<Clock className="size-4" strokeWidth={2} />}
          tone={info.stale ? "warn" : "ok"}
          label="Snapshot age"
          value={`${info.ageDays}d`}
          hint={`Taken ${formatDate(info.asOf)}`}
        />
        <StatCard
          icon={<FileText className="size-4" strokeWidth={2} />}
          tone={info.stale ? "warn" : "ok"}
          label="Verdict authority"
          value={info.stale ? "Review only" : "Active"}
          hint={
            info.stale
              ? "Too old to fail a carrier — all route to review"
              : "Ratings can conclude a carrier check"
          }
        />
      </div>

      <p className="text-muted-foreground max-w-3xl text-xs leading-relaxed">
        Source: {info.source}. Refresh by replacing{" "}
        <code className="font-mono">src/lib/carriers/am-best-ratings.json</code>{" "}
        with a licensed AM Best export — never hand-write a rating, since an
        invented value produces a wrong FAIL against a real vendor&apos;s real
        carrier.
      </p>
    </section>
  );
}
