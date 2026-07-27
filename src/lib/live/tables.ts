/**
 * Tables the workspace subscribes to for live updates.
 *
 * Must stay in step with migration 024 (the Postgres publication). A name
 * here that is NOT in the publication is harmless — the subscription simply
 * never fires for it. The reverse is also harmless. Neither can leak data:
 * Realtime enforces RLS, so a client only ever receives rows its org can
 * already read.
 */
export const LIVE_TABLES = [
  "documents",
  "vendors",
  "compliance_checks",
  "agent_confirmations",
  "properties",
  "projects",
  "property_vendors",
  "project_vendors",
  "requirement_sets",
  "chase_sequences",
  "messages",
  "vendor_agreements",
  "vendor_licenses",
  "org_members",
  "org_invites",
  "orgs",
  "support_chat_messages",
] as const;

export type LiveTable = (typeof LIVE_TABLES)[number];

export type LiveEvent = {
  table: LiveTable;
  type: "INSERT" | "UPDATE" | "DELETE";
  /** Primary key of the changed row when Realtime reported one. */
  id: string | null;
};
