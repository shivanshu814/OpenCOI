import { DownloadReportButton } from "@/components/download-report-button";
import { GettingStarted } from "@/components/getting-started";
import { IntakeEmailCard } from "@/components/intake-email-card";
import {
  AnimatedStatusBar,
  CardLiveAccent,
  LiveBadge,
  LiveDot,
  PageLiveStrip,
} from "@/components/live-activity";
import {
  ContentSurface,
  PageFrame,
  PageHeader,
  PageSecondary,
} from "@/components/page-frame";
import { ScoreRing } from "@/components/product-preview";
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
import { isEmailInboundConfigured } from "@/lib/config";
import {
  portfolioComplianceScore,
  vendorComplianceScore,
} from "@/lib/scores/compute";
import Link from "next/link";

const STATUS_SEGMENTS = [
  {
    key: "compliant",
    label: "Compliant",
    bar: "bg-[var(--status-ok)]",
    dot: "bg-[var(--status-ok)]",
  },
  {
    key: "expiring",
    label: "Expiring",
    bar: "bg-[var(--status-warn)]",
    dot: "bg-[var(--status-warn)]",
  },
  {
    key: "non_compliant",
    label: "Non-compliant",
    bar: "bg-[var(--status-bad)]",
    dot: "bg-[var(--status-bad)]",
  },
  {
    key: "missing_docs",
    label: "Missing docs",
    bar: "bg-[var(--status-neutral)]",
    dot: "bg-[var(--status-neutral)]",
  },
  {
    key: "in_review",
    label: "In review",
    bar: "bg-sky-500",
    dot: "bg-sky-500",
  },
] as const;

function QueueList({
  title,
  hint,
  empty,
  rows,
  action,
  liveTone = "info" as const,
}: {
  title: string;
  hint: string;
  empty: string;
  rows: { id: string; primary: string; secondary: string }[];
  action: string;
  liveTone?: "info" | "warn" | "ok" | "brand";
}) {
  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <CardLiveAccent />
      <CardHeader className="gap-0.5 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {rows.length > 0 ? (
            <LiveBadge label="Active" tone={liveTone} />
          ) : null}
        </div>
        <CardDescription className="text-xs">{hint}</CardDescription>
        <CardAction className="text-muted-foreground flex items-center gap-1.5 text-xs tabular-nums">
          {rows.length > 0 ? <LiveDot tone={liveTone} /> : null}
          {rows.length}
        </CardAction>
      </CardHeader>
      <CardContent className="divide-y px-0">
        {rows.length > 0 ? (
          <div
            className="text-muted-foreground bg-muted/40 hidden items-center gap-x-3 border-b px-4 py-1.5 text-[11px] font-medium tracking-wide uppercase sm:grid sm:grid-cols-[minmax(0,1fr)_auto]"
            aria-hidden
          >
            <span>Document</span>
            <span>Action</span>
          </div>
        ) : null}
        {rows.map((row) => (
          <div
            key={row.id}
            className="hover:bg-muted/40 grid items-center gap-3 px-4 py-2.5 transition-colors sm:grid-cols-[minmax(0,1fr)_auto]"
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
              className="justify-self-start sm:justify-self-end"
              render={<Link href={`/app/review/${row.id}`} />}
            >
              {action}
            </Button>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="text-muted-foreground flex items-center justify-center gap-2 px-4 py-8 text-center text-sm">
            <LiveDot tone="ok" ping={false} />
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
  const intakeLive = isEmailInboundConfigured();
  const intakeEmail =
    intakeLive && session?.intakeEmail ? session.intakeEmail : null;
  const totalVendors = vendors.length;

  return (
    <PageFrame>
      <div className="space-y-2">
        <PageHeader
          title="Needs attention today"
          description="Your daily compliance pulse — who needs a chase, a review, or your approval."
          audience="Property managers & ops leads"
          nextStep={
            totalVendors === 0 ? (
              <>
                Start with{" "}
                <Link
                  href="/app/vendors"
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  Add vendor
                </Link>
                , then upload a COI.
              </>
            ) : reviewQueue.length > 0 ? (
              <>
                Clear the{" "}
                <Link
                  href="/app/review"
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  review queue
                </Link>{" "}
                first.
              </>
            ) : awaitingDecision.length > 0 ? (
              "Accept or override published verdicts waiting on you."
            ) : attention.length > 0 ? (
              "Chase expiring or non-compliant vendors below."
            ) : (
              "Portfolio looks clear — upload the next COI when it arrives."
            )
          }
          help="Chase runs by email today (EN/ES); SMS chasing is coming soon. You approve every verdict — CertShield never auto-approves. Document review assistance — not legal, insurance, or professional advice."
          live
          actions={
            <Button render={<Link href="/app/upload" />}>Upload COI</Button>
          }
        />
        <PageLiveStrip
          items={[
            { text: "Portfolio health · live", tone: "ok" },
            { text: "Review queue monitored", tone: "info" },
            { text: "You remain the final approver", tone: "brand" },
            {
              text:
                attention.length > 0
                  ? `${attention.length} vendor${attention.length === 1 ? "" : "s"} need attention`
                  : "All vendors compliant",
              tone: attention.length > 0 ? "warn" : "ok",
            },
          ]}
        />
      </div>

      <GettingStarted hasVendors={totalVendors > 0} />

      {/* Primary: portfolio score — only meaningful when vendors exist */}
      <ContentSurface rail={false} className="overflow-hidden">
        <CardLiveAccent />
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-5">
            <ScoreRing
              score={portfolio.score}
              size="lg"
              pulse={totalVendors > 0}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Portfolio compliance
                </p>
                {totalVendors > 0 ? (
                  <LiveBadge label="Live" tone="ok" />
                ) : null}
              </div>
              <p className="mt-1 text-sm font-medium">
                {totalVendors > 0
                  ? `Average across ${portfolio.counted} vendors — screenshot-ready for owner meetings.`
                  : "Add vendors and upload COIs to see portfolio health here."}
              </p>
              {totalVendors > 0 ? (
                <>
                  <div className="mt-3">
                    <AnimatedStatusBar
                      segments={STATUS_SEGMENTS.filter(
                        (s) => counts[s.key] > 0,
                      ).map((s) => ({
                        key: s.key,
                        className: s.bar,
                        width: (counts[s.key] / totalVendors) * 100,
                        title: `${s.label}: ${counts[s.key]}`,
                      }))}
                    />
                  </div>
                  <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                    {STATUS_SEGMENTS.map((s) => (
                      <div
                        key={s.key}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <span className={`size-1.5 rounded-full ${s.dot}`} />
                        <dt className="text-muted-foreground">{s.label}</dt>
                        <dd className="font-medium tabular-nums">
                          {counts[s.key]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
                  <LiveDot />
                  No vendors yet — nothing to score.
                </p>
              )}
            </div>
          </div>
        </div>
      </ContentSurface>

      <IntakeEmailCard email={intakeEmail} inboundLive={intakeLive} />

      <div className="grid gap-4 lg:grid-cols-2">
        <QueueList
          title="Internal review queue"
          hint="Until the Month 3 accuracy gate, every verdict passes founder review before publish."
          empty="Queue empty."
          action="Review"
          liveTone="info"
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
          liveTone="warn"
          rows={awaitingDecision.map((doc) => ({
            id: doc.id,
            primary: vendorById.get(doc.vendor_id)?.name ?? "Vendor",
            secondary: doc.file_name,
          }))}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Vendors needing attention</h2>
            {attention.length > 0 ? (
              <LiveBadge label={`${attention.length}`} tone="warn" />
            ) : totalVendors > 0 ? (
              <LiveBadge label="Clear" tone="ok" />
            ) : null}
          </div>
          <Link
            href="/app/vendors"
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          >
            All vendors
          </Link>
        </div>
        <Card className="gap-0 overflow-hidden py-0">
          <CardLiveAccent />
          <CardContent className="divide-y px-0">
            {attention.length > 0 ? (
              <div
                className="text-muted-foreground bg-muted/40 hidden items-center gap-x-3 border-b px-4 py-2 text-[11px] font-medium tracking-wide uppercase lg:grid lg:grid-cols-[minmax(14rem,1.4fr)_minmax(8rem,0.7fr)_10.5rem_auto]"
                aria-hidden
              >
                <span>Vendor</span>
                <span>Trade</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>
            ) : null}
            {attention.map((v) => (
              <div
                key={v.id}
                className="hover:bg-muted/40 flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3.5 transition-colors lg:grid lg:grid-cols-[minmax(14rem,1.4fr)_minmax(8rem,0.7fr)_10.5rem_auto]"
              >
                <div className="min-w-0 flex-1 lg:flex-none">
                  <Link
                    href={`/app/vendors/${v.id}`}
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {v.name}
                  </Link>
                  <p className="text-muted-foreground text-xs lg:hidden">
                    {[v.trade, `score ${vendorComplianceScore(v.status)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="text-muted-foreground hidden truncate text-sm lg:block">
                  {v.trade || "—"}
                </div>
                <div className="flex items-center">
                  <VendorStatusBadge status={v.status} />
                </div>
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2 lg:ml-0">
                  <DownloadReportButton vendorId={v.id} label="Report" />
                  {v.email ? (
                    <SendChaseButton vendorId={v.id} vendorName={v.name} />
                  ) : null}
                </div>
              </div>
            ))}
            {attention.length === 0 ? (
              <p className="text-muted-foreground flex items-center justify-center gap-2 px-4 py-8 text-center text-sm">
                <LiveDot tone="ok" />
                {totalVendors === 0
                  ? "Add a vendor to start tracking compliance."
                  : "All vendors compliant."}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <PageSecondary>
        Document review assistance — not legal, insurance, or professional
        advice. You remain the final approver on every verdict.
      </PageSecondary>
    </PageFrame>
  );
}
