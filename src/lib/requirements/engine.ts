import {
  evaluateCarriersAgainstFloor,
  parseAmBestRating,
  type AmBestRating,
} from "@/lib/carriers/ratings";
import { normalizeIsoDate } from "@/lib/extraction/dates";
import type { Extraction } from "@/lib/extraction/schema";
import { nameSimilarity, normalizeVendorName } from "@/lib/vendors/fuzzy-match";

const CONFIDENCE_THRESHOLD = 0.9;

/** Minimum name-token similarity to accept a certificate-holder match (D1). */
const HOLDER_MATCH_THRESHOLD = 0.55;

/**
 * D1 — per-property certificate-holder + additional-insured wording the cert
 * must name. Stored on the property; validated here against the extraction.
 * Absent/unconfirmed routes to internal review (MISSING), never a silent pass.
 */
export type PropertyValidation = {
  certificate_holder_name?: string | null;
  additional_insured_wording?: string | null;
};

export type Verdict = "PASS" | "FAIL" | "MISSING" | "EXPIRING";

export type EndorsementForm = "CG_20_10" | "CG_20_37" | "CG_24_04";

export type RequirementRule = {
  id: string;
  line: Extraction["policies"][number]["line"];
  limit_name?: Extraction["policies"][number]["limits"][number]["name"];
  min_amount?: number;
  /** B4: require attached endorsement form PDF (not cert checkbox alone). */
  require_endorsement?: EndorsementForm;
  /** B4: require primary & non-contributory wording in description of operations. */
  require_primary_noncontributory?: boolean;
  /** When true, also evaluate policy expiration on this line. */
  check_expiration?: boolean;
  /** B6: minimum AM Best rating for insurers on the cert (default A-). */
  min_am_best_rating?: AmBestRating;
  label: string;
};

export type CheckLine = {
  rule_id: string;
  label: string;
  verdict: Verdict;
  reason: string;
  low_confidence: boolean;
};

export type RequirementsResult = {
  lines: CheckLine[];
  overall: Verdict;
  needs_internal_review: boolean;
};

const VERDICT_RANK: Record<Verdict, number> = {
  FAIL: 4,
  MISSING: 3,
  EXPIRING: 2,
  PASS: 1,
};

const FORM_LABEL: Record<EndorsementForm, string> = {
  CG_20_10: "CG 20 10 (additional insured — ongoing operations)",
  CG_20_37: "CG 20 37 (additional insured — completed operations)",
  CG_24_04: "CG 24 04 (waiver of subrogation)",
};

function worst(a: Verdict, b: Verdict): Verdict {
  return VERDICT_RANK[a] >= VERDICT_RANK[b] ? a : b;
}

function daysUntil(iso: string | null): number | null {
  // Stored extractions may pre-date the schema-boundary date normalization
  // (e.g. "01/01/2027" echoed from an ACORD form) — normalize here too so a
  // real, readable date is never misreported as missing.
  const normalized = normalizeIsoDate(iso);
  if (!normalized) return null;
  const end = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  const diff =
    end.getTime() -
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function formLabel(form: EndorsementForm): string {
  return FORM_LABEL[form];
}

/** Cert surface claims AI / waiver without proving the endorsement PDF. */
function certClaimsCoverage(
  extraction: Extraction,
  policy: Extraction["policies"][number],
  form: EndorsementForm,
): boolean {
  if (form === "CG_20_10" || form === "CG_20_37") {
    return (
      policy.checkboxes.additional_insured === true ||
      extraction.description_of_operations.mentions_additional_insured
    );
  }
  return (
    policy.checkboxes.waiver_of_subrogation === true ||
    extraction.description_of_operations.mentions_waiver_of_subrogation
  );
}

function evaluateEndorsement(
  extraction: Extraction,
  policy: Extraction["policies"][number],
  form: EndorsementForm,
): Pick<CheckLine, "verdict" | "reason" | "low_confidence"> {
  const matches = extraction.endorsement_forms_detected.filter(
    (e) => e.form === form,
  );
  const endo = matches[0];

  if (!endo) {
    if (certClaimsCoverage(extraction, policy, form)) {
      return {
        verdict: "FAIL",
        reason: `Cert claims ${form === "CG_24_04" ? "waiver of subrogation" : "additional insured"} but ${formLabel(form)} endorsement PDF not detected.`,
        low_confidence:
          form === "CG_24_04"
            ? (policy.checkboxes.confidence ?? 0) < CONFIDENCE_THRESHOLD
            : (policy.checkboxes.confidence ?? 0) < CONFIDENCE_THRESHOLD ||
            extraction.description_of_operations.confidence <
            CONFIDENCE_THRESHOLD,
      };
    }
    return {
      verdict: "FAIL",
      reason: `Required ${formLabel(form)} endorsement PDF not detected.`,
      low_confidence: false,
    };
  }

  if (endo.named_insured_match === false) {
    return {
      verdict: "FAIL",
      reason: `${formLabel(form)} found, but named insured on endorsement does not match certificate insured.`,
      low_confidence: endo.confidence < CONFIDENCE_THRESHOLD,
    };
  }

  return {
    verdict: "PASS",
    reason:
      endo.named_insured_match === null
        ? `${formLabel(form)} detected; named-insured match could not be confirmed.`
        : "Meets requirement.",
    low_confidence:
      endo.confidence < CONFIDENCE_THRESHOLD ||
      endo.named_insured_match === null,
  };
}

/** Expiration as its own check line (never mixed into a limit rule's row). */
function evaluateExpiration(
  rule: RequirementRule,
  policy: Extraction["policies"][number],
): CheckLine {
  const lineName = rule.line.replaceAll("_", " ");
  const label = `${lineName.charAt(0).toUpperCase()}${lineName.slice(1)} policy not expired`;
  const rule_id = `${rule.id}_expiration`;
  const days = daysUntil(policy.expiration_date);

  if (days == null) {
    return {
      rule_id,
      label,
      verdict: "MISSING",
      reason: "Expiration date missing or unreadable — needs review.",
      low_confidence: true,
    };
  }
  if (days < 0) {
    return {
      rule_id,
      label,
      verdict: "FAIL",
      reason: `Policy expired ${Math.abs(days)} day(s) ago.`,
      low_confidence: policy.confidence < CONFIDENCE_THRESHOLD,
    };
  }
  if (days <= 30) {
    return {
      rule_id,
      label,
      verdict: "EXPIRING",
      reason: `Expires in ${days} day(s).`,
      low_confidence: policy.confidence < CONFIDENCE_THRESHOLD,
    };
  }
  return {
    rule_id,
    label,
    verdict: "PASS",
    reason: `Policy in force — expires in ${days} day(s).`,
    low_confidence: policy.confidence < CONFIDENCE_THRESHOLD,
  };
}

/** Default trade-agnostic GL requirements — B4 endorsement wedge in v0. */
export const DEFAULT_GLOBAL_RULES: RequirementRule[] = [
  {
    id: "gl_each_occ",
    line: "general_liability",
    limit_name: "each_occurrence",
    min_amount: 1_000_000,
    check_expiration: true,
    label: "GL each-occurrence ≥ $1M",
  },
  {
    id: "gl_agg",
    line: "general_liability",
    limit_name: "general_aggregate",
    min_amount: 2_000_000,
    label: "GL general aggregate ≥ $2M",
  },
  {
    id: "gl_ai_cg_20_10",
    line: "general_liability",
    require_endorsement: "CG_20_10",
    label: "CG 20 10 additional insured (ongoing ops)",
  },
  {
    id: "gl_ai_cg_20_37",
    line: "general_liability",
    require_endorsement: "CG_20_37",
    label: "CG 20 37 additional insured (completed ops)",
  },
  {
    id: "gl_waiver",
    line: "general_liability",
    require_endorsement: "CG_24_04",
    label: "Waiver of subrogation (CG 24 04)",
  },
  {
    id: "gl_primary_noncontributory",
    line: "general_liability",
    require_primary_noncontributory: true,
    label: "Primary & non-contributory wording",
  },
  {
    id: "carrier_am_best",
    line: "general_liability",
    min_am_best_rating: "A-",
    label: "Carrier AM Best ≥ A-",
  },
];

/**
 * D1 — validate the extracted certificate-holder name and additional-insured
 * wording against what the property requires. Conservative: a clear mismatch
 * FAILs; anything we can't confirm is MISSING (→ internal review), never PASS
 * by omission.
 */
export function evaluatePropertyValidation(
  extraction: Extraction,
  pv: PropertyValidation,
): CheckLine[] {
  const lines: CheckLine[] = [];

  const requiredHolder = pv.certificate_holder_name?.trim();
  if (requiredHolder) {
    const holder = extraction.certificate_holder;
    const found = holder.name?.trim();
    const lowConf = holder.confidence < CONFIDENCE_THRESHOLD;
    if (!found) {
      lines.push({
        rule_id: "property_certificate_holder",
        label: "Certificate holder matches property",
        verdict: "MISSING",
        reason: `No certificate holder found on cert; property requires "${requiredHolder}".`,
        low_confidence: true,
      });
    } else if (nameSimilarity(found, requiredHolder) >= HOLDER_MATCH_THRESHOLD) {
      lines.push({
        rule_id: "property_certificate_holder",
        label: "Certificate holder matches property",
        verdict: "PASS",
        reason: "Certificate holder matches the property.",
        low_confidence: lowConf,
      });
    } else {
      lines.push({
        rule_id: "property_certificate_holder",
        label: "Certificate holder matches property",
        verdict: "FAIL",
        reason: `Certificate holder on cert is "${found}", property requires "${requiredHolder}".`,
        low_confidence: lowConf,
      });
    }
  }

  const requiredWording = pv.additional_insured_wording?.trim();
  if (requiredWording) {
    const desc = extraction.description_of_operations;
    const descText = normalizeVendorName(desc.text ?? "");
    const wordingNorm = normalizeVendorName(requiredWording);
    const lowConf = desc.confidence < CONFIDENCE_THRESHOLD;
    if (wordingNorm && descText.includes(wordingNorm)) {
      lines.push({
        rule_id: "property_additional_insured_wording",
        label: "Additional-insured wording matches property",
        verdict: "PASS",
        reason: "Required additional-insured wording found on cert.",
        low_confidence: lowConf,
      });
    } else if (desc.mentions_additional_insured) {
      // Cert names an additional insured but not the exact property wording —
      // don't hard-FAIL on wording nuance; route to review.
      lines.push({
        rule_id: "property_additional_insured_wording",
        label: "Additional-insured wording matches property",
        verdict: "MISSING",
        reason:
          "Cert mentions an additional insured, but the exact wording the property requires was not confirmed — needs review.",
        low_confidence: true,
      });
    } else {
      lines.push({
        rule_id: "property_additional_insured_wording",
        label: "Additional-insured wording matches property",
        verdict: "FAIL",
        reason:
          "Property requires additional-insured wording; none found in the certificate's description of operations.",
        low_confidence: lowConf,
      });
    }
  }

  return lines;
}

export function runRequirementsEngine(
  extraction: Extraction,
  rules: RequirementRule[] = DEFAULT_GLOBAL_RULES,
  propertyValidation?: PropertyValidation,
): RequirementsResult {
  const lines: CheckLine[] = [];

  for (const rule of rules) {
    if (rule.min_am_best_rating) {
      const floor =
        parseAmBestRating(rule.min_am_best_rating) ?? ("A-" as AmBestRating);
      const evald = evaluateCarriersAgainstFloor(
        extraction.insurers.map((i) => ({ name: i.name, naic: i.naic })),
        floor,
      );
      let verdict: Verdict = "PASS";
      let reason = `All listed carriers meet AM Best ≥ ${floor}.`;
      let low_confidence = false;

      if (extraction.insurers.length === 0) {
        verdict = "MISSING";
        reason = "No insurers / NAIC numbers found on certificate.";
        low_confidence = true;
      } else if (evald.anyBelow) {
        const bad = evald.results.filter((r) => !r.unknown && !r.meets);
        verdict = "FAIL";
        reason = `Carrier(s) below AM Best ${floor}: ${bad
          .map((r) => `${r.name} (${r.rating ?? "NR"})`)
          .join("; ")}.`;
      } else if (evald.anyUnknown) {
        verdict = "MISSING";
        reason = `NAIC not in AM Best lookup table for: ${evald.results
          .filter((r) => r.unknown)
          .map((r) => `${r.name}${r.naic ? ` #${r.naic}` : ""}`)
          .join("; ")}. Manual carrier check required.`;
        low_confidence = true;
      }

      lines.push({
        rule_id: rule.id,
        label: rule.label,
        verdict,
        reason,
        low_confidence,
      });
      continue;
    }

    const policy = extraction.policies.find((p) => p.line === rule.line);
    let verdict: Verdict = "PASS";
    let reason = "Meets requirement.";
    let low_confidence = false;

    if (!policy) {
      verdict = "MISSING";
      reason = `No ${rule.line.replaceAll("_", " ")} policy found on certificate.`;
    } else {
      low_confidence =
        policy.confidence < CONFIDENCE_THRESHOLD ||
        (rule.limit_name
          ? (policy.limits.find((l) => l.name === rule.limit_name)?.confidence ??
            0) < CONFIDENCE_THRESHOLD
          : false);

      if (rule.limit_name && rule.min_amount != null) {
        const limit = policy.limits.find((l) => l.name === rule.limit_name);
        if (!limit || limit.amount == null) {
          verdict = "MISSING";
          reason = `${rule.label}: limit not found on cert.`;
        } else if (limit.amount < rule.min_amount) {
          verdict = "FAIL";
          reason = `${rule.line.replaceAll("_", " ")} ${rule.limit_name.replaceAll("_", " ")} is $${limit.amount.toLocaleString()}, you require $${rule.min_amount.toLocaleString()}.`;
        }
      }

      if (verdict === "PASS" && rule.require_endorsement) {
        const endo = evaluateEndorsement(
          extraction,
          policy,
          rule.require_endorsement,
        );
        verdict = endo.verdict;
        reason = endo.reason;
        low_confidence = low_confidence || endo.low_confidence;
      }

      if (verdict === "PASS" && rule.require_primary_noncontributory) {
        const desc = extraction.description_of_operations;
        if (!desc.mentions_primary_noncontributory) {
          verdict = "FAIL";
          reason =
            "Primary & non-contributory wording not found in description of operations.";
        }
        if (desc.confidence < CONFIDENCE_THRESHOLD) {
          low_confidence = true;
        }
      }
    }

    lines.push({
      rule_id: rule.id,
      label: rule.label,
      verdict,
      reason,
      low_confidence,
    });

    // Expiration is its own check line — it must never overwrite the limit
    // rule's verdict/reason (a $1M limit row saying "expiration missing" is
    // wrong on both counts).
    if (policy && rule.check_expiration) {
      lines.push(evaluateExpiration(rule, policy));
    }
  }

  if (propertyValidation) {
    lines.push(...evaluatePropertyValidation(extraction, propertyValidation));
  }

  const overall = lines.reduce<Verdict>(
    (acc, line) => worst(acc, line.verdict),
    "PASS",
  );

  // Until Month 3 accuracy gate (docs/01 §0): every verdict needs internal review.
  const needs_internal_review = true;

  return { lines, overall, needs_internal_review };
}
