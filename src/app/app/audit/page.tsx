import { AuditTimeline } from "@/components/audit-timeline";
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit trail</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Append-only log of documents, checks, messages, and user actions (P7).
        </p>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b pt-4">
          <CardTitle className="text-sm font-semibold">Recent events</CardTitle>
          <CardDescription className="text-xs">
            Most recent first · showing up to 150 events. Nothing here can be
            edited or deleted.
          </CardDescription>
          <CardAction className="text-muted-foreground text-xs tabular-nums">
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
