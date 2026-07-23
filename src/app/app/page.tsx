import { DownloadReportButton } from "@/components/download-report-button";
import { IntakeEmailCard } from "@/components/intake-email-card";
import { SendChaseButton } from "@/components/send-chase-button";
import { VendorStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Needs attention today
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Portfolio score {portfolio.score}/100 · chase email + SMS (opt-in)
          </p>
        </div>
        <Button render={<Link href="/app/upload" />}>Upload COI</Button>
      </div>

      <IntakeEmailCard email={intakeEmail} demo={intakeDemo} />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-xs font-medium">
            Portfolio compliance score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">
            {portfolio.score}
            <span className="text-muted-foreground text-base font-normal">
              /100
            </span>
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Average across {portfolio.counted} vendors (screenshot-ready for
            owner meetings).
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Compliant",
            value: counts.compliant,
            tone: "text-emerald-700",
          },
          { label: "Expiring", value: counts.expiring, tone: "text-amber-700" },
          {
            label: "Non-compliant",
            value: counts.non_compliant,
            tone: "text-red-700",
          },
          {
            label: "Missing docs",
            value: counts.missing_docs,
            tone: "text-slate-700",
          },
          { label: "In review", value: counts.in_review, tone: "text-sky-700" },
        ].map((s) => (
          <Card key={s.label} size="sm">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-xs font-medium">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-semibold tabular-nums ${s.tone}`}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Internal review queue</h2>
        <p className="text-muted-foreground text-sm">
          Until the Month 3 accuracy gate, every verdict passes founder review
          before publish.
        </p>
        <div className="divide-y rounded-lg border">
          {reviewQueue.map((doc) => {
            const vendor = vendorById.get(doc.vendor_id);
            return (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {vendor?.name ?? "Vendor"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {doc.file_name}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/app/review/${doc.id}`} />}
                >
                  Review
                </Button>
              </div>
            );
          })}
          {reviewQueue.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-sm">
              Queue empty.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Awaiting your approval</h2>
        <p className="text-muted-foreground text-sm">
          Published verdicts — accept or override (you are always the final
          approver).
        </p>
        <div className="divide-y rounded-lg border">
          {awaitingDecision.map((doc) => {
            const vendor = vendorById.get(doc.vendor_id);
            return (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {vendor?.name ?? "Vendor"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {doc.file_name}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/app/review/${doc.id}`} />}
                >
                  Decide
                </Button>
              </div>
            );
          })}
          {awaitingDecision.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-sm">
              Nothing waiting on you.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Vendors needing attention</h2>
        <div className="divide-y rounded-lg border">
          {attention.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{v.name}</p>
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
            <p className="text-muted-foreground px-4 py-6 text-sm">
              All vendors compliant.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
