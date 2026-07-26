import { getSessionOrg } from "@/lib/auth/session";
import { canViewFullAudit } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export type AuditEventRow = {
  id: string;
  org_id: string;
  actor_type: string;
  actor_id: string | null;
  actor_email: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_state: unknown;
  after_state: unknown;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

const SELECT_COLS =
  "id, org_id, actor_type, actor_id, actor_email, entity_type, entity_id, action, before_state, after_state, reason, ip_address, user_agent, created_at";

/** Non-admin view: strip IP / UA / full JSON payloads. */
export function redactAuditForRole(
  row: AuditEventRow,
  fullDetail: boolean,
): AuditEventRow {
  if (fullDetail) return row;
  return {
    ...row,
    ip_address: null,
    user_agent: null,
    // Keep summaries via before/after but hide raw blobs from client payload
    before_state: null,
    after_state: summarizeSafeAfter(row.after_state),
  };
}

function summarizeSafeAfter(after: unknown): unknown {
  if (after == null || typeof after !== "object" || Array.isArray(after)) {
    return null;
  }
  const src = after as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of [
    "name",
    "status",
    "version",
    "decision",
    "overall_verdict",
    "field_path",
    "locale",
    "plan",
  ]) {
    if (key in src && src[key] != null) out[key] = src[key];
  }
  return Object.keys(out).length ? out : null;
}

export async function listAuditEvents(opts?: {
  entityType?: string;
  entityId?: string;
  action?: string;
  actorType?: string;
  limit?: number;
}): Promise<{
  events: AuditEventRow[];
  fullDetail: boolean;
  role: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      fullDetail: true,
      role: "owner",
      // Honest empty — never invent sample audit rows.
      events: [],
    };
  }

  const session = await getSessionOrg();
  if (!session) return { events: [], fullDetail: false, role: null };

  const fullDetail = canViewFullAudit(session.role);
  const supabase = await createClient();
  let q = supabase
    .from("audit_events")
    .select(SELECT_COLS)
    .eq("org_id", session.orgId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.entityType) q = q.eq("entity_type", opts.entityType);
  if (opts?.entityId) q = q.eq("entity_id", opts.entityId);
  if (opts?.action) q = q.eq("action", opts.action);
  if (opts?.actorType) q = q.eq("actor_type", opts.actorType);

  const { data, error } = await q;
  if (error) {
    // Graceful fallback if migration 017 not yet applied (missing columns).
    console.error("listAuditEvents", error);
    const fallback = await supabase
      .from("audit_events")
      .select(
        "id, org_id, actor_type, actor_id, entity_type, entity_id, action, before_state, after_state, reason, created_at",
      )
      .eq("org_id", session.orgId)
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 100);
    const rows = (fallback.data ?? []).map((r) => ({
      ...(r as Omit<
        AuditEventRow,
        "actor_email" | "ip_address" | "user_agent"
      >),
      actor_email: null,
      ip_address: null,
      user_agent: null,
    })) as AuditEventRow[];
    return {
      events: rows.map((e) => redactAuditForRole(e, fullDetail)),
      fullDetail,
      role: session.role,
    };
  }

  const rows = (data ?? []) as AuditEventRow[];
  return {
    events: rows.map((e) => redactAuditForRole(e, fullDetail)),
    fullDetail,
    role: session.role,
  };
}

/** Events for a vendor: vendor entity + that vendor's documents. */
export async function listVendorAuditTrail(
  vendorId: string,
  limit = 80,
): Promise<AuditEventRow[]> {
  if (!isSupabaseConfigured()) {
    const { events } = await listAuditEvents({
      entityType: "vendor",
      entityId: vendorId,
      limit,
    });
    return events;
  }

  const session = await getSessionOrg();
  if (!session) return [];
  const fullDetail = canViewFullAudit(session.role);

  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("documents")
    .select("id")
    .eq("org_id", session.orgId)
    .eq("vendor_id", vendorId);

  const docIds = (docs ?? []).map((d) => d.id);

  const { data: vendorEvents } = await supabase
    .from("audit_events")
    .select(SELECT_COLS)
    .eq("org_id", session.orgId)
    .eq("entity_type", "vendor")
    .eq("entity_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  let docEvents: AuditEventRow[] = [];
  if (docIds.length) {
    const { data } = await supabase
      .from("audit_events")
      .select(SELECT_COLS)
      .eq("org_id", session.orgId)
      .eq("entity_type", "document")
      .in("entity_id", docIds)
      .order("created_at", { ascending: false })
      .limit(limit);
    docEvents = (data ?? []) as AuditEventRow[];
  }

  const merged = [
    ...((vendorEvents ?? []) as AuditEventRow[]),
    ...docEvents,
  ];
  merged.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return merged
    .slice(0, limit)
    .map((e) => redactAuditForRole(normalizeRow(e), fullDetail));
}

function normalizeRow(e: AuditEventRow): AuditEventRow {
  return {
    ...e,
    actor_email: e.actor_email ?? null,
    ip_address: e.ip_address ?? null,
    user_agent: e.user_agent ?? null,
  };
}
