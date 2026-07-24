import {
  DEFAULT_GLOBAL_RULES,
  type PropertyValidation,
  type RequirementRule,
} from "@/lib/requirements/engine";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

type RequirementSetRow = {
  scope: string;
  trade: string | null;
  property_id: string | null;
  project_id?: string | null;
  rules: unknown;
};

function asRules(raw: unknown): RequirementRule[] {
  if (!Array.isArray(raw)) return [];
  return raw as RequirementRule[];
}

/**
 * Merge requirement rules: global → trade (vendor) → property → project.
 * Later scopes override earlier rules with the same `id`.
 * Project wins (D2 — job-specific higher limits).
 */
export function mergeRequirementRules(sets: {
  global: RequirementRule[];
  trade: RequirementRule[];
  property: RequirementRule[];
  project?: RequirementRule[];
}): RequirementRule[] {
  const ordered = new Map<string, RequirementRule>();
  const layers =
    sets.global.length > 0
      ? [sets.global, sets.trade, sets.property, sets.project ?? []]
      : [DEFAULT_GLOBAL_RULES, sets.trade, sets.property, sets.project ?? []];
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
  projectId?: string | null;
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
    .select("scope, trade, property_id, project_id, rules")
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
  const project = input.projectId
    ? rows
      .filter(
        (r) => r.scope === "project" && r.project_id === input.projectId,
      )
      .flatMap((r) => asRules(r.rules))
    : [];

  return mergeRequirementRules({ global, trade, property, project });
}

/**
 * D1 — load the property's required certificate-holder + additional-insured
 * wording so the verdict engine can validate the cert against them. Returns
 * undefined when no property is attached or neither field is configured.
 */
export async function loadPropertyValidation(input: {
  orgId: string;
  propertyId?: string | null;
  supabase?: SupabaseClient;
}): Promise<PropertyValidation | undefined> {
  if (!input.propertyId) return undefined;
  const db = input.supabase ?? createAdminClient();

  const { data: property } = await db
    .from("properties")
    .select("certificate_holder_name, additional_insured_wording")
    .eq("id", input.propertyId)
    .eq("org_id", input.orgId)
    .maybeSingle();

  if (!property) return undefined;
  const holder = property.certificate_holder_name?.trim();
  const wording = property.additional_insured_wording?.trim();
  if (!holder && !wording) return undefined;

  return {
    certificate_holder_name: holder || null,
    additional_insured_wording: wording || null,
  };
}
