import { DownloadReportButton } from "@/components/download-report-button";
import { IntakeEmailCard } from "@/components/intake-email-card";
import { SendChaseButton } from "@/components/send-chase-button";
import { VendorStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionOrg } from "@/lib/auth/session";
import {
  listAwaitingCustomerDecision,
  listReviewQueue,
  listVendors,
} from "@/lib/data/documents";
import { dashboardCounts } from "@/lib/data/types";
import { DEMO_INTAKE_EMAIL } from "@/lib/email/intake-address";
import {
  portfolioComplianceScore,
  vendorComplianceScore,
} from "@/lib/scores/compute";
import Link from "next/link";

const STATUS_SEGMENTS = [
  { key: "compliant", label: "Compliant", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  { key: "expiring", label: "Expiring", bar: "bg-amber-400", dot: "bg-amber-400" },
  { key: "non_compliant", label: "Non-compliant", bar: "bg-red-500", dot: "bg-red-500" },
  { key: "missing_docs", label: "Missing docs", bar: "bg-slate-400", dot: "bg-slate-400" },
  { key: "in_review", label: "In review", bar: "bg-sky-500", dot: "bg-sky-500" },
] as const;

function QueueList({
  title,
  hint,
  empty,
  rows,
  action,
}: {
  title: string;
  hint: string;
  empty: string;
  rows: { id: string; primary: string; secondary: string }[];
  action: string;
}) {
  return (
    <Card className="min-w-0 gap-0 py-0">
      <CardHeader className="gap-0.5 border-b px-4 py-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">{hint}</CardDescription>
        <CardAction className="text-muted-foreground text-xs tabular-nums">
          {rows.length}
        </CardAction>
      </CardHeader>
      <CardContent className="divide-y px-0">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.primary}</p>
              <p className="text-muted-foreground truncate text-xs">
                {row.secondary}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/app/review/${row.id}`} />}
            >
              {action}
            </Button>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            {empty}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [vendors, reviewQueue, awaitingDecision, session] = await Promise.all([
    listVendors(),
    listReviewQueue(),
    listAwaitingCustomerDecision(),
    getSessionOrg(),
  ]);
  const counts = dashboardCounts(vendors);
  const portfolio = portfolioComplianceScore(vendors);
  const attention = vendors.filter((v) => v.status !== "compliant");
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const intakeEmail = session?.intakeEmail ?? DEMO_INTAKE_EMAIL;
  const intakeDemo = !session?.intakeEmail;
  const totalVendors = vendors.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Needs attention today
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Chase runs by email + SMS (opt-in) — you approve every verdict.
          </p>
        </div>
        <Button render={<Link href="/app/upload" />}>Upload COI</Button>
      </div>

      {/* Portfolio health band */}
      <Card>
        <CardContent>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Portfolio compliance
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {portfolio.score}
              <span className="text-muted-foreground text-base font-normal">
                /100
              </span>
            </p>
          </div>
          <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">
            Average across {portfolio.counted} vendors — screenshot-ready for
            owner meetings.
          </p>
        </div>

        {totalVendors > 0 ? (
          <>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full">
              {STATUS_SEGMENTS.filter((s) => counts[s.key] > 0).map((s) => (
                <div
                  key={s.key}
                  className={s.bar}
                  style={{ width: `${(counts[s.key] / totalVendors) * 100}%` }}
                  title={`${s.label}: ${counts[s.key]}`}
                />
              ))}
            </div>
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {STATUS_SEGMENTS.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5 text-xs">
                  <span className={`size-2 rounded-full ${s.dot}`} />
                  <dt className="text-muted-foreground">{s.label}</dt>
                  <dd className="font-medium tabular-nums">{counts[s.key]}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="text-muted-foreground mt-4 text-sm">
            No vendors yet — add your first vendor or upload a COI to see
            portfolio health here.
          </p>
        )}
        </CardContent>
      </Card>

      <IntakeEmailCard email={intakeEmail} demo={intakeDemo} />

      <div className="grid gap-4 lg:grid-cols-2">
        <QueueList
          title="Internal review queue"
          hint="Until the Month 3 accuracy gate, every verdict passes founder review before publish."
          empty="Queue empty."
          action="Review"
          rows={reviewQueue.map((doc) => ({
            id: doc.id,
            primary: vendorById.get(doc.vendor_id)?.name ?? "Vendor",
            secondary: doc.file_name,
          }))}
        />
        <QueueList
          title="Awaiting your approval"
          hint="Published verdicts — accept or override (you are always the final approver)."
          empty="Nothing waiting on you."
          action="Decide"
          rows={awaitingDecision.map((doc) => ({
            id: doc.id,
            primary: vendorById.get(doc.vendor_id)?.name ?? "Vendor",
            secondary: doc.file_name,
          }))}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Vendors needing attention</h2>
          <Link
            href="/app/vendors"
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          >
            All vendors
          </Link>
        </div>
        <Card className="gap-0 py-0">
          <CardContent className="divide-y px-0">
          {attention.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/app/vendors/${v.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {v.name}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {[v.trade, `score ${vendorComplianceScore(v.status)}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <VendorStatusBadge status={v.status} />
                <DownloadReportButton vendorId={v.id} />
                {v.email ? (
                  <SendChaseButton vendorId={v.id} vendorName={v.name} />
                ) : null}
              </div>
            </div>
          ))}
          {attention.length === 0 ? (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
              All vendors compliant.
            </p>
          ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
