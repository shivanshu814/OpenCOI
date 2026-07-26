import { AuditTimeline } from "@/components/audit-timeline";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listAuditEvents } from "@/lib/audit/list";

export default async function AuditPage() {
  const events = await listAuditEvents({ limit: 150 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit trail"
        description="Append-only log of documents, checks, messages, and user actions (P7)."
        live
        liveLabel="Append-only"
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div
          className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r"
          aria-hidden
        />
        <CardHeader className="border-b pt-4">
          <CardTitle className="text-sm font-semibold">Recent events</CardTitle>
          <CardDescription className="text-xs">
            Most recent first · showing up to 150 events. Nothing here can be
            edited or deleted.
          </CardDescription>
          <CardAction className="text-muted-foreground inline-flex items-center gap-1.5 text-xs tabular-nums">
            <span className="relative flex size-1.5">
              <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-40" />
              <span className="bg-brand relative inline-flex size-1.5 rounded-full" />
            </span>
            {events.length}
          </CardAction>
        </CardHeader>
        <CardContent className="py-4 sm:px-5">
          <AuditTimeline events={events} />
        </CardContent>
      </Card>
    </div>
  );
}
