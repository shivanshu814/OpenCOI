"use client";

import { EmptyState } from "@/components/empty-state";
import { LiveBadge, LiveDot } from "@/components/live-activity";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { copyToClipboard } from "@/lib/ui/clipboard";
import { formatDayHeading } from "@/lib/ui/format";
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

  // Base UI renders the raw value in the trigger unless `items` maps value →
  // label, so every option list here doubles as the trigger label source.
  const actionItems = useMemo(() => {
    const set = new Set(events.map((e) => e.action));
    return [
      { value: "all", label: "All actions" },
      ...[...set].sort().map((a) => ({ value: a, label: humanizeAction(a) })),
    ];
  }, [events]);

  const actorItems = useMemo(() => {
    const set = new Set(events.map((e) => e.actor_type));
    return [
      { value: "all", label: "All actors" },
      ...[...set]
        .sort()
        .map((a) => ({ value: a, label: humanizeActorType(a) })),
    ];
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
        bordered
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
  const hasFilters = actionFilter !== "all" || actorFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Sits inside the Event history card, so no second frame — a rule and
          the page's own background are enough separation. */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-3 border-b pb-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="audit-action-filter"
            className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase"
          >
            Action
          </Label>
          <Select
            items={actionItems}
            value={actionFilter}
            onValueChange={(v) => setActionFilter(v ?? "all")}
          >
            <SelectTrigger id="audit-action-filter" className="h-9 w-[13rem]">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              {actionItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="audit-actor-filter"
            className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase"
          >
            Actor
          </Label>
          <Select
            items={actorItems}
            value={actorFilter}
            onValueChange={(v) => setActorFilter(v ?? "all")}
          >
            <SelectTrigger id="audit-actor-filter" className="h-9 w-[11rem]">
              <SelectValue placeholder="All actors" />
            </SelectTrigger>
            <SelectContent>
              {actorItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => {
              setActionFilter("all");
              setActorFilter("all");
            }}
          >
            Reset
          </Button>
        ) : null}
        {/* Kept beside the controls it describes — `ml-auto` stranded it a
            screen-width away on a wide monitor. */}
        <p className="text-muted-foreground pb-2.5 text-xs tabular-nums">
          {filtered.length} of {events.length} events
          {fullDetail ? " · full detail (Admin)" : " · limited detail"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center">
          <p className="text-sm font-semibold">No events match these filters</p>
          <p className="text-muted-foreground mx-auto mt-1.5 max-w-md text-sm leading-relaxed">
            Nothing was deleted — the log is append-only. Widen the action or
            actor filter to see the rest of the {events.length} events.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => {
              setActionFilter("all");
              setActorFilter("all");
            }}
          >
            Clear filters
          </Button>
        </div>
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

              {/* Capped so an event's title and its timestamp stay in the
                  same visual line of sight on a wide monitor. */}
              <ol className="relative ml-3 max-w-6xl space-y-0 border-l border-brand/25 pl-6">
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

  // Background work (extraction, chase sends, webhooks) has no HTTP request
  // behind it, so IP/user-agent are genuinely absent rather than missing. A
  // bare em dash read as "the audit trail is broken" — say which it is.
  const isSystemActor = e.actor_type === "system" || e.actor_type === "job";
  const noRequestContext = isSystemActor
    ? "Not applicable — background job, no browser request"
    : "Not captured for this event";

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
    await copyToClipboard(JSON.stringify(payload, null, 2), {
      successMessage: "Event detail copied",
      description: "Full audit JSON is on your clipboard.",
    });
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
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                        isLatest
                          ? "bg-brand-muted text-brand"
                          : "bg-muted text-muted-foreground",
                      )}
                    />
                  }
                >
                  <Icon className="size-3.5" aria-hidden />
                </TooltipTrigger>
                <TooltipContent>
                  {humanizeEntityType(e.entity_type)}
                </TooltipContent>
              </Tooltip>
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
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="cursor-default font-mono text-[11px] tracking-tight" />
                      }
                    >
                      {formatEntityRef(e.entity_type, e.entity_id)}
                    </TooltipTrigger>
                    <TooltipContent className="font-mono">
                      {e.entity_type}/{e.entity_id}
                    </TooltipContent>
                  </Tooltip>
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
              <Tooltip>
                <TooltipTrigger
                  render={
                    <time
                      dateTime={e.created_at}
                      className="text-muted-foreground cursor-default pt-0.5 text-xs tabular-nums"
                    />
                  }
                >
                  {ts.relative}
                </TooltipTrigger>
                <TooltipContent>
                  {ts.absolute} ({ts.timezone})
                </TooltipContent>
              </Tooltip>
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
            <dl className="bg-muted/30 grid max-w-5xl gap-x-6 gap-y-2.5 rounded-lg border px-3.5 py-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
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
                  <Unset>Not recorded for this event type</Unset>
                )}
              </DetailItem>
              <DetailItem label="Actor email">
                {e.actor_email ?? (
                  <Unset>
                    {isSystemActor
                      ? "System process — no signed-in user"
                      : "No email on the acting account"}
                  </Unset>
                )}
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
                    {e.ip_address ?? <Unset>{noRequestContext}</Unset>}
                  </DetailItem>
                  <DetailItem label="User-Agent">
                    {shortUserAgent(e.user_agent) ?? (
                      <Unset>{noRequestContext}</Unset>
                    )}
                  </DetailItem>
                </>
              ) : (
                <DetailItem label="Network">
                  <Unset>
                    Hidden for your role — ask an Admin for IP / device detail.
                  </Unset>
                </DetailItem>
              )}
              <DetailItem label="Before" className="sm:col-span-2 lg:col-span-3">
                {beforeSummary ?? (
                  <Unset>
                    Nothing — this is the first recorded state for the{" "}
                    {humanizeEntityType(e.entity_type).toLowerCase()}
                  </Unset>
                )}
              </DetailItem>
              <DetailItem label="After" className="sm:col-span-2 lg:col-span-3">
                {afterSummary ?? (
                  <Unset>No state change was recorded for this action</Unset>
                )}
              </DetailItem>
              {fullDetail && (e.before_state != null || e.after_state != null) ? (
                <DetailItem label="Raw JSON" className="sm:col-span-2 lg:col-span-3">
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
                <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-1">
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

/** Explains *why* a field is empty instead of showing a bare em dash. */
function Unset({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground/80 italic">{children}</span>
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
      map.set(key, { key, label: formatDayHeading(d), events: [e] });
    }
  }
  return [...map.values()];
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

