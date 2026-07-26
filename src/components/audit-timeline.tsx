"use client";

import { EmptyState } from "@/components/empty-state";
import { LiveBadge, LiveDot } from "@/components/live-activity";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditEventRow } from "@/lib/audit/list";
import {
  formatActorLine,
  formatEntityRef,
  humanizeAction,
  humanizeActorType,
  humanizeEntityType,
  truncateId,
} from "@/lib/audit/labels";
import {
  extractWhy,
  formatTimestampDetailed,
  shortUserAgent,
  summarizeState,
} from "@/lib/audit/present";
import { cn } from "@/lib/utils";
import {
  Building2,
  ChevronDown,
  Copy,
  CreditCard,
  FileText,
  FolderKanban,
  type LucideIcon,
  Shield,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

const ENTITY_ICONS: Record<string, LucideIcon> = {
  document: FileText,
  vendor: Users,
  property: Building2,
  project: FolderKanban,
  org: Building2,
  subscription: CreditCard,
};

type DayGroup = { key: string; label: string; events: AuditEventRow[] };

export function AuditTimeline({
  events,
  fullDetail = false,
  emptyHref = "/app/upload",
  emptyActionLabel = "Upload a COI",
}: {
  events: AuditEventRow[];
  /** Admin/owner: IP, UA, full JSON, export. */
  fullDetail?: boolean;
  emptyHref?: string;
  emptyActionLabel?: string;
}) {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");

  const actionOptions = useMemo(() => {
    const set = new Set(events.map((e) => e.action));
    return [...set].sort();
  }, [events]);

  const actorOptions = useMemo(() => {
    const set = new Set(events.map((e) => e.actor_type));
    return [...set].sort();
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (actorFilter !== "all" && e.actor_type !== actorFilter) return false;
      return true;
    });
  }, [events, actionFilter, actorFilter]);

  if (events.length === 0) {
    return (
      <EmptyState
        title="No audit events yet"
        description="Every upload, check, chase, and decision appends here permanently. Nothing can be edited or deleted."
        actionHref={emptyHref}
        actionLabel={emptyActionLabel}
        liveHint="Waiting for the first append-only event"
      />
    );
  }

  const groups = groupByDay(filtered);
  const latestId = groups[0]?.events[0]?.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            Action
          </label>
          <Select
            value={actionFilter}
            onValueChange={(v) => setActionFilter(v ?? "all")}
          >
            <SelectTrigger className="h-9 w-[11.5rem]">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {humanizeAction(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            Actor
          </label>
          <Select
            value={actorFilter}
            onValueChange={(v) => setActorFilter(v ?? "all")}
          >
            <SelectTrigger className="h-9 w-[10rem]">
              <SelectValue placeholder="All actors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              {actorOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {humanizeActorType(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-muted-foreground pb-2 text-xs tabular-nums">
          {filtered.length} of {events.length}
          {fullDetail ? " · full detail (Admin)" : " · limited detail"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No events match these filters.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
                  {group.label}
                </h3>
                <div className="bg-border h-px flex-1" aria-hidden />
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {group.events.length}
                </span>
              </div>

              <ol className="relative ml-3 space-y-0 border-l border-brand/25 pl-6">
                {group.events.map((e) => {
                  const isLatest = e.id === latestId;
                  return (
                    <AuditEventRowView
                      key={e.id}
                      event={e}
                      isLatest={isLatest}
                      fullDetail={fullDetail}
                    />
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditEventRowView({
  event: e,
  isLatest,
  fullDetail,
}: {
  event: AuditEventRow;
  isLatest: boolean;
  fullDetail: boolean;
}) {
  const [open, setOpen] = useState(false);
  const Icon = ENTITY_ICONS[e.entity_type] ?? Shield;
  const ts = formatTimestampDetailed(e.created_at);
  const why = extractWhy(e.reason, e.after_state);
  const beforeSummary = summarizeState(e.before_state, { forAdmin: fullDetail });
  const afterSummary = summarizeState(e.after_state, { forAdmin: fullDetail });
  const actorDisplay = formatActorDisplay(e);

  async function copyDetail() {
    const payload = {
      id: e.id,
      action: e.action,
      actor_type: e.actor_type,
      actor_id: e.actor_id,
      actor_email: e.actor_email,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      reason: e.reason,
      why,
      before_state: e.before_state,
      after_state: e.after_state,
      ip_address: e.ip_address,
      user_agent: e.user_agent,
      created_at: e.created_at,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    } catch {
      // Clipboard may be denied — ignore.
    }
  }

  return (
    <li className="relative pb-5 last:pb-0">
      <span
        className={cn(
          "bg-background absolute top-2.5 -left-[31px] flex size-5 items-center justify-center rounded-full ring-2",
          isLatest
            ? "ring-brand/35 text-brand"
            : "ring-border text-muted-foreground",
        )}
      >
        {isLatest ? (
          <LiveDot tone="brand" className="size-2" />
        ) : (
          <span className="bg-brand/35 block size-1.5 rounded-full" />
        )}
      </span>

      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="min-w-0 rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/40">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
            <div className="flex min-w-0 items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                  isLatest
                    ? "bg-brand-muted text-brand"
                    : "bg-muted text-muted-foreground",
                )}
                title={humanizeEntityType(e.entity_type)}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm leading-snug font-semibold tracking-tight text-balance">
                    {humanizeAction(e.action)}
                  </p>
                  {isLatest ? (
                    <LiveBadge label="Latest" tone="brand" />
                  ) : null}
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed">
                  <span className="bg-muted text-foreground/80 rounded px-1.5 py-0.5 text-[11px] font-medium">
                    {actorDisplay}
                  </span>
                  <span className="text-border" aria-hidden>
                    ·
                  </span>
                  <span
                    className="font-mono text-[11px] tracking-tight"
                    title={`${e.entity_type}/${e.entity_id}`}
                  >
                    {formatEntityRef(e.entity_type, e.entity_id)}
                  </span>
                </div>
                {why ? (
                  <p className="text-foreground/80 mt-1 text-xs leading-relaxed">
                    <span className="text-muted-foreground font-medium">
                      Why
                    </span>
                    <span className="text-muted-foreground mx-1.5">·</span>
                    {why}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <time
                dateTime={e.created_at}
                title={`${ts.absolute} (${ts.timezone})`}
                className="text-muted-foreground pt-0.5 text-xs tabular-nums"
              >
                {ts.relative}
              </time>
              <CollapsibleTrigger className="text-muted-foreground hover:bg-muted inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors">
                Details
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    open && "rotate-180",
                  )}
                />
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent className="mt-3">
            <dl className="bg-muted/30 grid gap-2 rounded-lg border px-3 py-3 text-xs sm:grid-cols-2">
              <DetailItem label="When">
                {ts.absolute}
                <span className="text-muted-foreground block mt-0.5">
                  Timezone: {ts.timezone}
                </span>
              </DetailItem>
              <DetailItem label="Actor type">
                {humanizeActorType(e.actor_type)}
              </DetailItem>
              <DetailItem label="Actor id">
                {e.actor_id ? (
                  <span className="font-mono">{truncateId(e.actor_id, 12)}</span>
                ) : (
                  "—"
                )}
              </DetailItem>
              <DetailItem label="Actor email">
                {e.actor_email ?? "—"}
              </DetailItem>
              <DetailItem label="Entity">
                {humanizeEntityType(e.entity_type)} ·{" "}
                <span className="font-mono">{e.entity_id}</span>
              </DetailItem>
              <DetailItem label="Action code">
                <span className="font-mono">{e.action}</span>
              </DetailItem>
              {fullDetail ? (
                <>
                  <DetailItem label="IP address">
                    {e.ip_address ?? "—"}
                  </DetailItem>
                  <DetailItem label="User-Agent">
                    {shortUserAgent(e.user_agent) ?? "—"}
                  </DetailItem>
                </>
              ) : (
                <DetailItem label="Network">
                  Hidden for your role — ask an Admin for IP / device detail.
                </DetailItem>
              )}
              <DetailItem label="Before" className="sm:col-span-2">
                {beforeSummary ?? "—"}
              </DetailItem>
              <DetailItem label="After" className="sm:col-span-2">
                {afterSummary ?? "—"}
              </DetailItem>
              {fullDetail && (e.before_state != null || e.after_state != null) ? (
                <DetailItem label="Raw JSON" className="sm:col-span-2">
                  <pre className="bg-background mt-1 max-h-40 overflow-auto rounded border p-2 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
                    {JSON.stringify(
                      {
                        before_state: e.before_state,
                        after_state: e.after_state,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </DetailItem>
              ) : null}
              {fullDetail ? (
                <div className="sm:col-span-2 flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => void copyDetail()}
                  >
                    <Copy className="size-3" />
                    Copy detail
                  </Button>
                </div>
              ) : null}
            </dl>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </li>
  );
}

function DetailItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground font-medium">{label}</dt>
      <dd className="text-foreground mt-0.5 break-words">{children}</dd>
    </div>
  );
}

function formatActorDisplay(e: AuditEventRow): string {
  if (e.actor_email) {
    return `${humanizeActorType(e.actor_type)} · ${e.actor_email}`;
  }
  return formatActorLine(e.actor_type, e.actor_id);
}

function groupByDay(events: AuditEventRow[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const e of events) {
    const d = new Date(e.created_at);
    const key = dayKey(d);
    const existing = map.get(key);
    if (existing) {
      existing.events.push(e);
    } else {
      map.set(key, { key, label: dayLabel(d), events: [e] });
    }
  }
  return [...map.values()];
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(d: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
