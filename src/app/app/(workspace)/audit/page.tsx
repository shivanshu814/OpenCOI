import { AuditTimeline } from "@/components/audit-timeline";
import { EmptyState } from "@/components/empty-state";
import { LiveBadge } from "@/components/live-activity";
import {
  ContentSurface,
  PageFrame,
  PageHeader,
  PageSecondary,
  StatStrip,
} from "@/components/page-frame";
import {
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listAuditEvents } from "@/lib/audit/list";
import { productRoleLabel, toProductRole } from "@/lib/auth/roles";
import { ScrollText } from "lucide-react";

export default async function AuditPage() {
  const { events, fullDetail, role } = await listAuditEvents({ limit: 150 });
  const roleLabel = role ? productRoleLabel(toProductRole(role)) : null;

  return (
    <PageFrame>
      <PageHeader
        title="Audit trail"
        description="Append-only log of documents, checks, messages, and user actions (P7). Events cannot be edited or deleted."
        audience="Ops & admins who need a paper trail"
        nextStep={
          events.length === 0
            ? "Upload a COI or chase a vendor — activity will show up here."
            : fullDetail
              ? "Expand any row for IP, user-agent, before/after, and why."
              : "Expand rows for who/what/when. IP & device detail is Admin-only."
        }
        help="This is a compliance evidence trail for your workspace — not legal advice. Mid-term cancellations are not auto-detected."
        live
        liveLabel="Append-only"
      />

      {events.length > 0 ? (
        <StatStrip
          items={[
            {
              label: "Events shown",
              value: events.length,
              hint: "Most recent first · max 150",
              tone: "brand",
            },
            {
              label: "Your view",
              value: fullDetail ? "Full" : "Limited",
              hint: roleLabel
                ? `${roleLabel} · ${fullDetail ? "IP + UA + JSON" : "no IP/UA"}`
                : undefined,
              tone: fullDetail ? "ok" : "default",
            },
          ]}
        />
      ) : null}

      <ContentSurface className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base font-semibold tracking-tight">
              Event history
            </CardTitle>
            <LiveBadge label="Read-only" tone="info" />
            {fullDetail ? (
              <LiveBadge label="Admin detail" tone="brand" />
            ) : null}
          </div>
          <CardDescription className="text-sm leading-relaxed">
            Most recent first · grouped by day · filter by action or actor
          </CardDescription>
          <CardAction className="text-muted-foreground self-center inline-flex items-center gap-1.5 text-xs tabular-nums">
            <span className="relative flex size-1.5">
              <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-40" />
              <span className="bg-brand relative inline-flex size-1.5 rounded-full" />
            </span>
            {events.length} {events.length === 1 ? "event" : "events"}
          </CardAction>
        </CardHeader>
        <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
          {events.length === 0 ? (
            <EmptyState
              title="No audit events yet"
              description="As you upload COIs, publish verdicts, and send chase messages, every action lands here — append-only."
              actionHref="/app/upload"
              actionLabel="Upload a COI"
              liveHint="Empty is honest — nothing has happened in this workspace yet."
              icon={<ScrollText className="size-5" aria-hidden />}
            />
          ) : (
            <AuditTimeline events={events} fullDetail={fullDetail} />
          )}
        </CardContent>
      </ContentSurface>

      <PageSecondary>
        Append-only (P7). Document review assistance — not legal, insurance, or
        professional advice.
      </PageSecondary>
    </PageFrame>
  );
}
