import { AuditTimeline } from "@/components/audit-timeline";
import { listAuditEvents } from "@/lib/audit/list";

export default async function AuditPage() {
  const events = await listAuditEvents({ limit: 150 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit trail</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Append-only log of documents, checks, messages, and user actions (P7).
        </p>
      </div>
      <AuditTimeline events={events} />
    </div>
  );
}
