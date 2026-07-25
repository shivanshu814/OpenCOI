/**
 * Appendix A — JSON Schema for Claude tool-use `input_schema`.
 * Mirrors docs/01 Appendix A / zod `extractionSchema` (enums + shapes).
 * extraction_meta cost/latency are filled server-side after the tool call.
 */
export const extractionToolInputSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "document",
    "producer",
    "insured",
    "insurers",
    "policies",
    "certificate_holder",
    "description_of_operations",
    "endorsement_forms_detected",
    "extraction_meta",
  ],
  properties: {
    document: {
      type: "object",
      additionalProperties: false,
      required: ["type", "issue_date", "confidence"],
      properties: {
        type: {
          type: "string",
          enum: [
            "acord_25",
            "acord_27",
            "acord_28",
            "endorsement",
            "carrier_letter",
            "other",
          ],
        },
        issue_date: { type: ["string", "null"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
    },
    producer: {
      type: "object",
      additionalProperties: false,
      required: ["name", "contact_name", "email", "phone", "confidence"],
      properties: {
        name: { type: ["string", "null"] },
        contact_name: { type: ["string", "null"] },
        email: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
    },
    insured: {
      type: "object",
      additionalProperties: false,
      required: ["name", "address", "confidence"],
      properties: {
        name: { type: "string" },
        address: { type: ["string", "null"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
    },
    insurers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["letter", "name", "naic", "confidence"],
        properties: {
          letter: { type: "string", enum: ["A", "B", "C", "D", "E", "F"] },
          name: { type: "string" },
          naic: { type: ["string", "null"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    policies: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "line",
          "insurer_letter",
          "policy_number",
          "effective_date",
          "expiration_date",
          "limits",
          "checkboxes",
          "confidence",
        ],
        properties: {
          line: {
            type: "string",
            enum: [
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
            ],
          },
          insurer_letter: {
            type: ["string", "null"],
            enum: ["A", "B", "C", "D", "E", "F", null],
          },
          policy_number: { type: ["string", "null"] },
          effective_date: { type: ["string", "null"] },
          expiration_date: { type: ["string", "null"] },
          limits: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "amount", "confidence"],
              properties: {
                name: {
                  type: "string",
                  enum: [
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
                  ],
                },
                amount: { type: ["number", "null"] },
                confidence: { type: "number", minimum: 0, maximum: 1 },
              },
            },
          },
          checkboxes: {
            type: "object",
            additionalProperties: false,
            required: [
              "additional_insured",
              "waiver_of_subrogation",
              "confidence",
            ],
            properties: {
              additional_insured: { type: ["boolean", "null"] },
              waiver_of_subrogation: { type: ["boolean", "null"] },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    certificate_holder: {
      type: "object",
      additionalProperties: false,
      required: ["name", "address", "confidence"],
      properties: {
        name: { type: ["string", "null"] },
        address: { type: ["string", "null"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
    },
    description_of_operations: {
      type: "object",
      additionalProperties: false,
      required: [
        "text",
        "mentions_additional_insured",
        "mentions_primary_noncontributory",
        "mentions_waiver_of_subrogation",
        "confidence",
      ],
      properties: {
        text: { type: ["string", "null"] },
        mentions_additional_insured: { type: "boolean" },
        mentions_primary_noncontributory: { type: "boolean" },
        mentions_waiver_of_subrogation: { type: "boolean" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
    },
    endorsement_forms_detected: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "form",
          "edition_date",
          "named_insured_match",
          "confidence",
        ],
        properties: {
          form: {
            type: "string",
            enum: ["CG_20_10", "CG_20_37", "CG_24_04", "other"],
          },
          edition_date: { type: ["string", "null"] },
          named_insured_match: { type: ["boolean", "null"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    extraction_meta: {
      type: "object",
      additionalProperties: false,
      required: ["overall_confidence", "low_confidence_paths"],
      properties: {
        overall_confidence: { type: "number", minimum: 0, maximum: 1 },
        low_confidence_paths: { type: "array", items: { type: "string" } },
        model_version: { type: "string" },
        prompt_version: { type: "string" },
        cost_usd: { type: "number" },
        latency_ms: { type: "number" },
      },
    },
  },
} as const;
