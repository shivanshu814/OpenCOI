import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export type AuditEventRow = {
  id: string;
  org_id: string;
  actor_type: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_state: unknown;
  after_state: unknown;
  reason: string | null;
  created_at: string;
};

export async function listAuditEvents(opts?: {
  entityType?: string;
  entityId?: string;
  limit?: number;
}): Promise<AuditEventRow[]> {
  if (!isSupabaseConfigured()) {
    return [
      {
        id: "demo_audit_1",
        org_id: "demo",
        actor_type: "system",
        actor_id: "demo",
        entity_type: "vendor",
        entity_id: "v_demo_1",
        action: "created",
        before_state: null,
        after_state: { name: "Demo Roofing LLC" },
        reason: null,
        created_at: new Date().toISOString(),
      },
    ];
  }

  const session = await getSessionOrg();
  if (!session) return [];

  const supabase = await createClient();
  let q = supabase
    .from("audit_events")
    .select(
      "id, org_id, actor_type, actor_id, entity_type, entity_id, action, before_state, after_state, reason, created_at",
    )
    .eq("org_id", session.orgId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.entityType) q = q.eq("entity_type", opts.entityType);
  if (opts?.entityId) q = q.eq("entity_id", opts.entityId);

  const { data, error } = await q;
  if (error) {
    console.error("listAuditEvents", error);
    return [];
  }
  return (data ?? []) as AuditEventRow[];
}

/** Events for a vendor: vendor entity + that vendor's documents. */
export async function listVendorAuditTrail(
  vendorId: string,
  limit = 80,
): Promise<AuditEventRow[]> {
  if (!isSupabaseConfigured()) {
    return listAuditEvents({ entityType: "vendor", entityId: vendorId, limit });
  }

  const session = await getSessionOrg();
  if (!session) return [];

  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("documents")
    .select("id")
    .eq("org_id", session.orgId)
    .eq("vendor_id", vendorId);

  const docIds = (docs ?? []).map((d) => d.id);

  const { data: vendorEvents } = await supabase
    .from("audit_events")
    .select(
      "id, org_id, actor_type, actor_id, entity_type, entity_id, action, before_state, after_state, reason, created_at",
    )
    .eq("org_id", session.orgId)
    .eq("entity_type", "vendor")
    .eq("entity_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  let docEvents: AuditEventRow[] = [];
  if (docIds.length) {
    const { data } = await supabase
      .from("audit_events")
      .select(
        "id, org_id, actor_type, actor_id, entity_type, entity_id, action, before_state, after_state, reason, created_at",
      )
      .eq("org_id", session.orgId)
      .eq("entity_type", "document")
      .in("entity_id", docIds)
      .order("created_at", { ascending: false })
      .limit(limit);
    docEvents = (data ?? []) as AuditEventRow[];
  }

  const merged = [...((vendorEvents ?? []) as AuditEventRow[]), ...docEvents];
  merged.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return merged.slice(0, limit);
}
