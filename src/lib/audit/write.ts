import {
  clientMetaFromHeaders,
  clientMetaFromNextHeaders,
  type RequestAuditMeta,
} from "@/lib/audit/request-meta";

export type AuditActorType = "system" | "admin" | "customer" | "vendor";

export type AuditInsert = {
  org_id: string;
  actor_type: AuditActorType;
  actor_id?: string | null;
  actor_email?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_state?: unknown;
  after_state?: unknown;
  reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
};

type DbClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  };
};

export type InsertAuditOptions = {
  /** Pass the Route Handler Request when available. */
  request?: Request | null;
  /**
   * When true (default for human actors), pull IP/UA from Next headers
   * if not already set. Set false for Inngest / cron / system jobs.
   */
  captureRequest?: boolean;
};

async function resolveMeta(
  event: AuditInsert,
  opts?: InsertAuditOptions,
): Promise<RequestAuditMeta> {
  if (event.ip_address != null || event.user_agent != null) {
    return {
      ip_address: event.ip_address ?? null,
      user_agent: event.user_agent ?? null,
    };
  }
  if (opts?.captureRequest === false) {
    return { ip_address: null, user_agent: null };
  }
  if (opts?.request) {
    return clientMetaFromHeaders(opts.request.headers);
  }
  // Human / API paths: best-effort from Next request headers.
  if (event.actor_type === "system" && opts?.captureRequest !== true) {
    return { ip_address: null, user_agent: null };
  }
  return clientMetaFromNextHeaders();
}

/**
 * Append-only audit insert with optional IP / UA / actor_email.
 * Never updates or deletes — table trigger enforces append-only.
 */
export async function insertAuditEvent(
  db: DbClient,
  event: AuditInsert,
  opts?: InsertAuditOptions,
): Promise<{ error: unknown }> {
  const meta = await resolveMeta(event, opts);
  const row: Record<string, unknown> = {
    org_id: event.org_id,
    actor_type: event.actor_type,
    actor_id: event.actor_id ?? null,
    actor_email: event.actor_email ?? null,
    entity_type: event.entity_type,
    entity_id: event.entity_id,
    action: event.action,
    before_state: event.before_state ?? null,
    after_state: event.after_state ?? null,
    reason: event.reason ?? null,
    ip_address: meta.ip_address,
    user_agent: meta.user_agent,
  };
  return db.from("audit_events").insert(row);
}
