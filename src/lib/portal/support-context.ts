import type { SupportContext, SupportGap, SupportTurn } from "@/lib/ai/support-chat";
import type { PortalContext } from "@/lib/portal/tokens";
import { loadMergedRulesForDocument } from "@/lib/requirements/merge";
import type { CheckLine } from "@/lib/requirements/engine";
import { createAdminClient } from "@/lib/supabase/admin";

/** Turns kept on screen / replayed into the model. */
const TRANSCRIPT_LIMIT = 20;

type Db = ReturnType<typeof createAdminClient>;

/**
 * Non-PASS lines from the vendor's most recent **published** check.
 *
 * Published only, deliberately: an unpublished check is still inside internal
 * review (spec §0), and the chat must never surface a verdict before a human
 * has released it.
 */
export async function loadPublishedGaps(
  db: Db,
  orgId: string,
  vendorId: string,
): Promise<{ gaps: SupportGap[]; hasPublishedCheck: boolean }> {
  const { data: check } = await db
    .from("compliance_checks")
    .select("lines, published_at")
    .eq("org_id", orgId)
    .eq("vendor_id", vendorId)
    .not("published_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!check) return { gaps: [], hasPublishedCheck: false };

  const lines = Array.isArray(check.lines) ? (check.lines as CheckLine[]) : [];
  return {
    gaps: lines
      .filter((l) => l.verdict !== "PASS")
      .map((l) => ({ label: l.label, verdict: l.verdict, reason: l.reason })),
    hasPublishedCheck: true,
  };
}

/** Recent chat turns, oldest first. */
export async function loadTranscript(
  db: Db,
  orgId: string,
  vendorId: string,
): Promise<SupportTurn[]> {
  const { data } = await db
    .from("support_chat_messages")
    .select("role, content, created_at")
    .eq("org_id", orgId)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(TRANSCRIPT_LIMIT);

  const rows = (data ?? []) as { role: string; content: string }[];
  return rows
    .reverse()
    .map((r) => ({
      role: r.role === "assistant" ? ("assistant" as const) : ("vendor" as const),
      content: r.content,
    }));
}

/** Vendor turns sent in the last hour — the rate-limit counter. */
export async function countRecentVendorMessages(
  db: Db,
  vendorId: string,
): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("support_chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", vendorId)
    .eq("role", "vendor")
    .gte("created_at", since);
  return count ?? 0;
}

/**
 * Assemble everything the support chat is allowed to reason from. Nothing here
 * crosses an org boundary: gaps and requirements are both org+vendor scoped.
 */
export async function buildSupportContext(
  ctx: PortalContext,
  db: Db = createAdminClient(),
): Promise<SupportContext> {
  const [{ gaps, hasPublishedCheck }, requirements] = await Promise.all([
    loadPublishedGaps(db, ctx.orgId, ctx.vendorId),
    loadMergedRulesForDocument({
      orgId: ctx.orgId,
      vendorId: ctx.vendorId,
      supabase: db,
    }),
  ]);

  return {
    orgName: ctx.orgName,
    vendorName: ctx.vendorName,
    trade: ctx.trade,
    locale: ctx.preferredLocale,
    vendorStatus: ctx.vendorStatus,
    gaps,
    hasPublishedCheck,
    requirements,
    agentEmail: ctx.agentEmail,
  };
}
