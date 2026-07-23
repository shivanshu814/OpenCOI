import {
  DEFAULT_GLOBAL_RULES,
  type RequirementRule,
} from "@/lib/requirements/engine";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

type RequirementSetRow = {
  scope: string;
  trade: string | null;
  property_id: string | null;
  rules: unknown;
};

function asRules(raw: unknown): RequirementRule[] {
  if (!Array.isArray(raw)) return [];
  return raw as RequirementRule[];
}

/**
 * Merge requirement rules: global → trade (vendor) → property.
 * Later scopes override earlier rules with the same `id`.
 */
export function mergeRequirementRules(sets: {
  global: RequirementRule[];
  trade: RequirementRule[];
  property: RequirementRule[];
}): RequirementRule[] {
  const ordered = new Map<string, RequirementRule>();
  const layers =
    sets.global.length > 0
      ? [sets.global, sets.trade, sets.property]
      : [DEFAULT_GLOBAL_RULES, sets.trade, sets.property];
  for (const layer of layers) {
    for (const rule of layer) {
      ordered.set(rule.id, rule);
    }
  }
  return Array.from(ordered.values());
}

export async function loadMergedRulesForDocument(input: {
  orgId: string;
  vendorId: string;
  propertyId?: string | null;
  supabase?: SupabaseClient;
}): Promise<RequirementRule[]> {
  const db = input.supabase ?? createAdminClient();

  const { data: vendor } = await db
    .from("vendors")
    .select("trade")
    .eq("id", input.vendorId)
    .eq("org_id", input.orgId)
    .maybeSingle();

  const { data: sets } = await db
    .from("requirement_sets")
    .select("scope, trade, property_id, rules")
    .eq("org_id", input.orgId);

  const rows = (sets ?? []) as RequirementSetRow[];
  const global = rows
    .filter((r) => r.scope === "global")
    .flatMap((r) => asRules(r.rules));
  const tradeName = vendor?.trade?.trim() ?? "";
  const trade = rows
    .filter(
      (r) =>
        r.scope === "trade" &&
        tradeName &&
        (r.trade ?? "").toLowerCase() === tradeName.toLowerCase(),
    )
    .flatMap((r) => asRules(r.rules));
  const property = input.propertyId
    ? rows
      .filter(
        (r) =>
          r.scope === "property" && r.property_id === input.propertyId,
      )
      .flatMap((r) => asRules(r.rules))
    : [];

  return mergeRequirementRules({ global, trade, property });
}
