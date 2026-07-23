import { LiveDot } from "@/components/live-activity";
import type { AuditEventRow } from "@/lib/audit/list";

export function AuditTimeline({ events }: { events: AuditEventRow[] }) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <LiveDot tone="ok" ping={false} />
        No audit events yet — actions will appear here live.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-brand/20 pl-5">
      {events.map((e, i) => (
        <li key={e.id} className="relative pb-6 last:pb-0">
          <span className="absolute top-1 -left-[9.5px]">
            {i === 0 ? (
              <LiveDot tone="brand" />
            ) : (
              <span className="border-background bg-brand/40 block size-2.5 rounded-full border-2" />
            )}
          </span>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">
              {formatAction(e.action)}
              {i === 0 ? (
                <span className="text-brand ml-2 text-[10px] font-semibold tracking-wide uppercase">
                  Latest
                </span>
              ) : null}
            </p>
            <time className="text-muted-foreground text-xs tabular-nums">
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
