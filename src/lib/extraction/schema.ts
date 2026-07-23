import { z } from "zod";

/** docs/01 Appendix A — canonical extraction schema (binding) */
const confidence = z.number().min(0).max(1);

const limitName = z.enum([
  "each_occurrence",
  "general_aggregate",
  "products_completed_ops",
  "personal_adv_injury",
  "damage_to_premises",
  "med_exp",
  "combined_single_limit",
  "bodily_injury_per_person",
  "bodily_injury_per_accident",
  "each_accident",
  "disease_each_employee",
  "disease_policy_limit",
  "umbrella_each_occurrence",
  "umbrella_aggregate",
  "other",
]);

const policyLine = z.enum([
  "general_liability",
  "auto",
  "umbrella",
  "excess",
  "workers_comp",
  "employers_liability",
  "professional",
  "pollution",
  "cyber",
  "other",
]);

export const extractionSchema = z.object({
  document: z.object({
    type: z.enum([
      "acord_25",
      "acord_27",
      "acord_28",
      "endorsement",
      "carrier_letter",
      "other",
    ]),
    issue_date: z.string().nullable(),
    confidence,
  }),
  producer: z.object({
    name: z.string().nullable(),
    contact_name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    confidence,
  }),
  insured: z.object({
    name: z.string(),
    address: z.string().nullable(),
    confidence,
  }),
  insurers: z.array(
    z.object({
      letter: z.enum(["A", "B", "C", "D", "E", "F"]),
      name: z.string(),
      naic: z.string().nullable(),
      confidence,
    }),
  ),
  policies: z.array(
    z.object({
      line: policyLine,
      insurer_letter: z.enum(["A", "B", "C", "D", "E", "F"]).nullable(),
      policy_number: z.string().nullable(),
      effective_date: z.string().nullable(),
      expiration_date: z.string().nullable(),
      limits: z.array(
        z.object({
          name: limitName,
          amount: z.number().nullable(),
          confidence,
        }),
      ),
      checkboxes: z.object({
        additional_insured: z.boolean().nullable(),
        waiver_of_subrogation: z.boolean().nullable(),
        confidence,
      }),
      confidence,
    }),
  ),
  certificate_holder: z.object({
    name: z.string().nullable(),
    address: z.string().nullable(),
    confidence,
  }),
  description_of_operations: z.object({
    text: z.string().nullable(),
    mentions_additional_insured: z.boolean(),
    mentions_primary_noncontributory: z.boolean(),
    mentions_waiver_of_subrogation: z.boolean(),
    confidence,
  }),
  endorsement_forms_detected: z.array(
    z.object({
      form: z.enum(["CG_20_10", "CG_20_37", "CG_24_04", "other"]),
      edition_date: z.string().nullable(),
      named_insured_match: z.boolean().nullable(),
      confidence,
    }),
  ),
  extraction_meta: z.object({
    model_version: z.string(),
    prompt_version: z.string(),
    overall_confidence: confidence,
    low_confidence_paths: z.array(z.string()),
    cost_usd: z.number(),
    latency_ms: z.number(),
  }),
});

export type Extraction = z.infer<typeof extractionSchema>;

export const PROMPT_VERSION = "v0.1.0";
export const CONFIDENCE_THRESHOLD = 0.9;

export const DISCLAIMER =
  "Document review assistance — not legal, insurance, or professional advice.";
