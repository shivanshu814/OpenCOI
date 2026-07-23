import {
  DEFAULT_GLOBAL_RULES,
  type RequirementRule,
} from "@/lib/requirements/engine";

/** Preloaded trade templates (docs/01 A4) — customer picks during onboarding. */
export type TradeTemplate = {
  id: string;
  name: string;
  trade: string | null;
  scope: "global" | "trade";
  summary: string;
  rules: RequirementRule[];
};

const WC_EACH: RequirementRule = {
  id: "wc_each",
  line: "workers_comp",
  limit_name: "each_accident",
  min_amount: 1_000_000,
  check_expiration: true,
  label: "Workers' comp each-accident ≥ $1M",
};

const UMBRELLA_2M: RequirementRule = {
  id: "umbrella_each",
  line: "umbrella",
  limit_name: "umbrella_each_occurrence",
  min_amount: 2_000_000,
  check_expiration: true,
  label: "Umbrella each-occurrence ≥ $2M",
};

const AUTO_1M: RequirementRule = {
  id: "auto_each",
  line: "auto",
  limit_name: "each_occurrence",
  min_amount: 1_000_000,
  check_expiration: true,
  label: "Auto liability ≥ $1M",
};

const LANDSCAPER_GL: RequirementRule[] = [
  {
    id: "gl_each_occ",
    line: "general_liability",
    limit_name: "each_occurrence",
    min_amount: 1_000_000,
    check_expiration: true,
    label: "GL each-occurrence ≥ $1M",
  },
  {
    id: "gl_ai_cg_20_10",
    line: "general_liability",
    require_endorsement: "CG_20_10",
    label: "CG 20 10 additional insured (ongoing ops)",
  },
  {
    id: "gl_waiver",
    line: "general_liability",
    require_endorsement: "CG_24_04",
    label: "Waiver of subrogation (CG 24 04)",
  },
];

export const TRADE_TEMPLATES: TradeTemplate[] = [
  {
    id: "global_default",
    name: "Default (all vendors)",
    trade: null,
    scope: "global",
    summary: "GL $1M/$2M + CG 20 10 / 20 37 + waiver + primary & non-contributory",
    rules: DEFAULT_GLOBAL_RULES,
  },
  {
    id: "trade_roofer",
    name: "Roofer",
    trade: "Roofer",
    scope: "trade",
    summary: "GL $1M/$2M + WC + $2M umbrella + endorsement wedge",
    rules: [...DEFAULT_GLOBAL_RULES, WC_EACH, UMBRELLA_2M],
  },
  {
    id: "trade_landscaper",
    name: "Landscaper",
    trade: "Landscaper",
    scope: "trade",
    summary: "GL $1M + auto + AI / waiver endorsements",
    rules: [...LANDSCAPER_GL, AUTO_1M],
  },
  {
    id: "trade_plumber",
    name: "Plumber",
    trade: "Plumber",
    scope: "trade",
    summary: "GL $1M/$2M + WC + endorsement wedge",
    rules: [...DEFAULT_GLOBAL_RULES, WC_EACH],
  },
];

export function templateById(id: string): TradeTemplate | undefined {
  return TRADE_TEMPLATES.find((t) => t.id === id);
}
