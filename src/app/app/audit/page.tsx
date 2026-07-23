import { AuditTimeline } from "@/components/audit-timeline";
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

      <section className="bg-card rounded-xl border">
        <div className="border-b px-4 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Recent events</h2>
            <span className="text-muted-foreground text-xs tabular-nums">
              {events.length}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Most recent first · showing up to 150 events. Nothing here can be
            edited or deleted.
          </p>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <AuditTimeline events={events} />
        </div>
      </section>
    </div>
  );
}
