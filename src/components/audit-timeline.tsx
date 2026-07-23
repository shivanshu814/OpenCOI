import type { AuditEventRow } from "@/lib/audit/list";

export function AuditTimeline({ events }: { events: AuditEventRow[] }) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No audit events yet.</p>
    );
  }

  return (
    <ol className="relative space-y-0 border-l pl-4">
      {events.map((e) => (
        <li key={e.id} className="relative pb-6 last:pb-0">
          <span className="bg-foreground absolute top-1.5 -left-[5px] size-2 rounded-full" />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">{formatAction(e.action)}</p>
            <time className="text-muted-foreground text-xs">
              {new Date(e.created_at).toLocaleString()}
            </time>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {e.actor_type}
            {e.actor_id ? ` · ${e.actor_id}` : ""} · {e.entity_type}/
            {e.entity_id.slice(0, 8)}
          </p>
          {e.reason ? <p className="mt-1 text-xs">Reason: {e.reason}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function formatAction(action: string): string {
  return action.replaceAll("_", " ");
}
