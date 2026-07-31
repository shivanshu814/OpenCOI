/**
 * One schema per thing the UI writes — validated on the client *and* the server.
 *
 * Why shared: a form that only validates on submit-to-server makes the user
 * discover a typo after a round trip, and a route that only trusts the form is
 * one `curl` away from a bad row. Both sides import the same object here, so an
 * inline field error and a 400 can never disagree.
 *
 * **Client-safe.** This module imports only `zod` and the pure US-geo helpers,
 * so `"use client"` components can pull it in. Never import server-only code
 * here (`@/lib/supabase/admin`, `@/lib/portal/tokens`, `node:crypto`) — that
 * would drag the service-role client into the browser bundle.
 *
 * Backward-compatibility rule: these schemas may only reject payloads that were
 * already nonsense. Empty optional strings stay allowed everywhere, because the
 * forms legitimately submit `""` for "not set".
 */

import { z } from "zod";
import { isValidZip, normalizeStateCode } from "@/lib/geo/us-states";
import { OVERRIDE_REASON_CODES } from "@/lib/verdicts/customer-decision";

/* ────────────────────────────── primitives ────────────────────────────── */

/** Mirrors `sanitizeHexColor` in @/lib/portal/tokens (kept in sync by test). */
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PROTO_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

/** Blank counts as "not provided" for every optional field below. */
function blank(value: string | null | undefined): boolean {
  return value == null || value.trim() === "";
}

/** Mirrors `sanitizeLogoUrl` in @/lib/portal/tokens (kept in sync by test). */
function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

/** Required, trimmed, length-capped text. */
export function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);
}

/** Optional text — `""`, `null`, and `undefined` all mean "not set". */
export function optionalText(max: number, label = "This field") {
  return z
    .string()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .nullish();
}

/** Email that may be left blank (forms submit `""` for an untouched field). */
export function optionalEmail(label = "Email") {
  return z
    .union([z.literal(""), z.email(`Enter a valid ${label.toLowerCase()}.`)])
    .nullish();
}

/**
 * Blank clears the field; anything else must normalize to a canonical code.
 * A free-text "Penn" later fails the D1 certificate-holder state match in a way
 * nobody can see, so it is worth rejecting at the boundary.
 */
export function usStateField(label = "State") {
  return z
    .string()
    .max(60, `${label} must be 60 characters or fewer.`)
    .nullish()
    .refine((v) => blank(v) || normalizeStateCode(v) !== null, {
      message: "Use a two-letter state code like PA.",
    });
}

/** US ZIP, five digits or ZIP+4. Blank stays allowed. */
export function usZipField(label = "ZIP") {
  return z
    .string()
    .max(20, `${label} must be 20 characters or fewer.`)
    .nullish()
    .refine((v) => blank(v) || isValidZip(v), {
      message: "Enter a 5-digit ZIP (or ZIP+4).",
    });
}

/** `#rgb` / `#rrggbb` only — it gets inlined as CSS on vendor-facing surfaces. */
export function hexColorField() {
  return z
    .string()
    .max(32, "That is not a hex color.")
    .nullish()
    .refine((v) => blank(v) || HEX_COLOR_RE.test(v!.trim()), {
      message: "Enter a hex color such as #0F766E.",
    });
}

/** https-only URL (blocks `javascript:`/`data:` and non-TLS hosts). */
export function httpsUrlField(label = "URL") {
  return z
    .string()
    .max(500, `${label} must be 500 characters or fewer.`)
    .nullish()
    .refine((v) => blank(v) || isHttpsUrl(v!), {
      message: "The logo must be served over https.",
    });
}

/** Public website — http or https, since customers do still run plain http. */
export function websiteField() {
  return z
    .string()
    .max(200, "Website must be 200 characters or fewer.")
    .nullish()
    .refine((v) => blank(v) || /^https?:\/\//i.test(v!.trim()), {
      message: "Website must start with http:// or https://",
    });
}

/** Date pickers emit ISO `YYYY-MM-DD`; blank stays allowed. */
export function isoDateField(label = "Date") {
  return z
    .string()
    .max(12, `${label} must be 12 characters or fewer.`)
    .nullish()
    .refine((v) => blank(v) || ISO_DATE_RE.test(v!.trim()), {
      message: `${label} must be in YYYY-MM-DD format.`,
    });
}

/* ─────────────────────────── error helpers ─────────────────────────── */

/** Field → first message, keyed by the dotted path the forms use. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** First readable message, so an API error toast says something concrete. */
export function firstIssueMessage(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message?.trim() || fallback;
}

/** The `{ error, details }` 400 body the API routes already return. */
export function validationErrorBody(error: z.ZodError, fallback: string) {
  return {
    error: firstIssueMessage(error, fallback),
    details: z.flattenError(error),
  };
}

/* ────────────────────────────── vendors ────────────────────────────── */

export const vendorCreateSchema = z.object({
  name: requiredText(200, "Vendor name"),
  email: optionalEmail(),
  trade: optionalText(100, "Trade"),
});
export type VendorCreateInput = z.infer<typeof vendorCreateSchema>;

export const smsOptInSchema = z
  .object({
    phone: optionalText(32, "Mobile phone"),
    opt_in: z.boolean().optional(),
  })
  .refine((d) => !d.opt_in || !blank(d.phone), {
    message: "Add a mobile number before recording consent.",
    path: ["phone"],
  });
export type SmsOptInInput = z.infer<typeof smsOptInSchema>;

/* ───────────────────────── requirement rules ───────────────────────── */

/**
 * Deliberately loose: rule rows are authored by templates, the requirements
 * engine, and the property/project editors, and a stored rule that predates a
 * field must still round-trip through a save. `z.looseObject` keeps unknown
 * keys instead of silently stripping them.
 */
export const requirementRuleSchema = z.looseObject({
  id: requiredText(100, "Rule id"),
  line: requiredText(60, "Rule line"),
  label: optionalText(300, "Rule label"),
  limit_name: optionalText(60, "Limit name"),
  min_amount: z.number().nonnegative().optional(),
  require_endorsement: optionalText(40, "Endorsement form"),
  require_primary_noncontributory: z.boolean().optional(),
  check_expiration: z.boolean().optional(),
  min_am_best_rating: optionalText(10, "AM Best rating"),
});

export const requirementRulesSchema = z.array(requirementRuleSchema).max(200);
export type RequirementRuleInput = z.infer<typeof requirementRuleSchema>;

/* ───────────────────────────── properties ──────────────────────────── */

const propertyFields = {
  name: requiredText(200, "Property name"),
  address_line: optionalText(300, "Address"),
  city: optionalText(100, "City"),
  state: usStateField(),
  postal_code: usZipField(),
  certificate_holder_name: optionalText(300, "Certificate holder name"),
  additional_insured_wording: optionalText(
    1000,
    "Additional insured wording",
  ),
  owner_llc_names: z.array(z.string().max(200)).max(100).optional(),
  lender_names: z.array(z.string().max(200)).max(100).optional(),
};

export const propertyCreateSchema = z.object(propertyFields);
export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;

export const propertyUpdateSchema = z.object({
  ...propertyFields,
  name: propertyFields.name.optional(),
  owner_report_email: optionalEmail("Owner report email"),
  owner_report_enabled: z.boolean().optional(),
  rules: requirementRulesSchema.optional(),
  vendorIds: z.array(z.uuid()).max(5000).optional(),
});
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;

/**
 * Dollar amounts are typed, so the editors bind a string ("1,000,000") and
 * convert on save. Validating the raw text is what lets the field say what is
 * wrong instead of silently persisting NaN as the GL minimum.
 */
export function usdAmountField(label: string) {
  return z.string().refine(
    (v) => {
      const n = Number(v.replace(/,/g, "").trim());
      return v.trim() !== "" && Number.isFinite(n) && n >= 0;
    },
    { message: `${label} must be a dollar amount, e.g. 1000000.` },
  );
}

/** What the property detail form binds to (rules/vendors are derived on save). */
export const propertyEditorFormSchema = propertyUpdateSchema
  .omit({ rules: true, vendorIds: true })
  .extend({
    name: requiredText(200, "Property name"),
    gl_min_amount: usdAmountField("GL each-occurrence minimum"),
  });
export type PropertyEditorFormInput = z.infer<typeof propertyEditorFormSchema>;

/* ────────────────────────────── projects ───────────────────────────── */

export const PROJECT_STATUSES = ["active", "closeout", "closed"] as const;

const projectFields = {
  name: requiredText(200, "Project name"),
  property_id: z.uuid().nullish(),
  start_date: isoDateField("Start date"),
  end_date: isoDateField("End date"),
  certificate_holder_name: optionalText(300, "Certificate holder name"),
  additional_insured_wording: optionalText(
    1000,
    "Additional insured wording",
  ),
  notes: optionalText(2000, "Notes"),
};

export const projectCreateSchema = z.object(projectFields);
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

export const projectUpdateSchema = z.object({
  ...projectFields,
  name: projectFields.name.optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  rules: requirementRulesSchema.optional(),
  vendorIds: z.array(z.uuid()).max(5000).optional(),
});
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

/** What the project detail form binds to (rules/subs are derived on save). */
export const projectEditorFormSchema = projectUpdateSchema
  .omit({ rules: true, vendorIds: true })
  .extend({
    name: requiredText(200, "Project name"),
    status: z.enum(PROJECT_STATUSES),
    gl_min_amount: usdAmountField("GL each-occurrence minimum"),
  });
export type ProjectEditorFormInput = z.infer<typeof projectEditorFormSchema>;

/* ─────────────────── workspace settings (org + team) ────────────────── */

export const INVITE_ROLES = ["admin", "member", "viewer"] as const;

export const orgProfileSchema = z.object({
  action: z.literal("update_profile"),
  name: z
    .string()
    .trim()
    .min(1, "A company name is required — it appears on every report.")
    .max(120, "Company name must be 120 characters or fewer."),
  legal_name: optionalText(160, "Legal entity name"),
  address_line: optionalText(200, "Address"),
  city: optionalText(80, "City"),
  state: usStateField(),
  postal_code: usZipField(),
  phone: optionalText(32, "Phone"),
  website: websiteField(),
  timezone: optionalText(64, "Time zone"),
});
export type OrgProfileInput = z.infer<typeof orgProfileSchema>;

export const orgBrandingSchema = z.object({
  action: z.literal("update_branding"),
  from_email: optionalEmail("From email"),
  reply_to_email: optionalEmail("Reply-to"),
  brand_primary_color: hexColorField(),
  logo_url: httpsUrlField("Logo URL"),
  chase_notify_email: optionalEmail("Alerts address"),
});
export type OrgBrandingInput = z.infer<typeof orgBrandingSchema>;

export const orgNotificationsSchema = z.object({
  action: z.literal("update_notifications"),
  notify_email_enabled: z.boolean().optional(),
  chase_notify_email: optionalEmail("Alerts address"),
  digest_email: optionalEmail("Daily digest address"),
  digest_enabled: z.boolean().optional(),
});
export type OrgNotificationsInput = z.infer<typeof orgNotificationsSchema>;

export const teamInviteSchema = z.object({
  action: z.literal("invite"),
  email: z.email("Enter a valid email address."),
  role: z.enum(INVITE_ROLES).optional(),
});
export type TeamInviteInput = z.infer<typeof teamInviteSchema>;

export const memberRoleUpdateSchema = z.object({
  action: z.literal("update_member_role"),
  member_id: requiredText(100, "Member id"),
  role: z.enum(INVITE_ROLES),
});

/** Everything POST /api/settings/team accepts. */
export const teamSettingsSchema = z.discriminatedUnion("action", [
  orgProfileSchema,
  orgBrandingSchema,
  orgNotificationsSchema,
  teamInviteSchema,
  memberRoleUpdateSchema,
]);
export type TeamSettingsInput = z.infer<typeof teamSettingsSchema>;

export const propertyAccessSchema = z.object({
  user_id: requiredText(100, "User id"),
  /** Full replacement set. Empty array = restore org-wide access. */
  property_ids: z.array(z.uuid()).max(5000).optional(),
});
export type PropertyAccessInput = z.infer<typeof propertyAccessSchema>;

/* ──────────────────────── vendor onboarding (W-9) ───────────────────── */

export const vendorTaxProfileSchema = z.object({
  action: z.literal("upsert_tax"),
  legal_name: optionalText(200, "Legal name"),
  /** Optional so an admin can correct the address without re-keying the TIN. */
  tin: optionalText(40, "EIN / SSN"),
  tin_type: z.enum(["ein", "ssn"]).optional(),
  address_line: optionalText(300, "Address"),
  city: optionalText(100, "City"),
  state: usStateField(),
  postal_code: usZipField(),
});
export type VendorTaxProfileInput = z.infer<typeof vendorTaxProfileSchema>;

export const vendorLicenseSchema = z.object({
  action: z.literal("add_license"),
  license_number: optionalText(100, "License number"),
  license_state: usStateField("License state"),
  trade: optionalText(100, "Trade"),
  expires_on: isoDateField("Expiration date"),
});
export type VendorLicenseInput = z.infer<typeof vendorLicenseSchema>;

export const vendorAgreementSchema = z.object({
  action: z.literal("create_agreement"),
  agreement_title: optionalText(200, "Agreement title"),
  signer_email: optionalEmail("Signer email"),
});
export type VendorAgreementInput = z.infer<typeof vendorAgreementSchema>;

export const vendorOnboardingSchema = z.discriminatedUnion("action", [
  vendorTaxProfileSchema,
  vendorLicenseSchema,
  vendorAgreementSchema,
]);
export type VendorOnboardingInput = z.infer<typeof vendorOnboardingSchema>;

/* ──────────────────────────── chase & reports ───────────────────────── */

export const CHASE_TEMPLATE_KEYS = [
  "doc_request",
  "expiry_30",
  "expiry_14",
  "expiry_7",
  "expiry_1",
  "post_expiry_weekly",
  "thanks_compliant",
  "escalation_customer",
] as const;

export const chaseSendSchema = z.object({
  vendorId: z.string().min(1),
  templateKey: z.enum(CHASE_TEMPLATE_KEYS).optional(),
  locale: z.enum(["en", "es"]).optional(),
  previewOnly: z.boolean().optional(),
  async: z.boolean().optional(),
});
export type ChaseSendInput = z.infer<typeof chaseSendSchema>;

export const ownerReportSendSchema = z.object({
  propertyId: z.string().min(1),
  to: optionalEmail("Recipient email"),
});
export type OwnerReportSendInput = z.infer<typeof ownerReportSendSchema>;

/* ──────────────────────── documents (review queue) ──────────────────── */

export const documentCorrectionSchema = z
  .object({
    field_path: z
      .string()
      .min(1)
      .max(300)
      .refine(
        (p) =>
          !p
            .replace(/\[(\d+)\]/g, ".$1")
            .split(".")
            .some((seg) => PROTO_SEGMENTS.has(seg)),
        { message: "Invalid field_path." },
      )
      .optional(),
    after_value: z.unknown().optional(),
    /** Shape is checked against the extraction schema inside the route. */
    corrected_extraction: z.unknown().optional(),
  })
  .refine(
    (d) => d.field_path !== undefined || d.corrected_extraction !== undefined,
    { message: "Provide field_path or corrected_extraction" },
  );
export type DocumentCorrectionInput = z.infer<typeof documentCorrectionSchema>;

export const customerDecisionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({
    action: z.literal("override"),
    reason_code: z.enum(OVERRIDE_REASON_CODES),
    reason_text: optionalText(2000, "Reason"),
  }),
]);
export type CustomerDecisionInput = z.infer<typeof customerDecisionSchema>;

/* ─────────────────────────── integrations (F1) ──────────────────────── */

export const apiKeyCreateSchema = z.object({
  action: z.literal("create_key"),
  name: optionalText(100, "Key name"),
});
export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;

export const apiKeyRevokeSchema = z.object({
  action: z.literal("revoke_key"),
  key_id: requiredText(100, "Key id"),
});

export const webhookCreateSchema = z.object({
  action: z.literal("create_webhook"),
  url: z.url("Enter a full URL, e.g. https://hooks.example.com/certshield"),
  events: z.array(z.string().max(80)).max(50).optional(),
});
export type WebhookCreateInput = z.infer<typeof webhookCreateSchema>;

export const webhookToggleSchema = z.object({
  action: z.literal("toggle_webhook"),
  webhook_id: requiredText(100, "Webhook id"),
  active: z.boolean().optional(),
});

export const integrationsSchema = z.discriminatedUnion("action", [
  apiKeyCreateSchema,
  apiKeyRevokeSchema,
  webhookCreateSchema,
  webhookToggleSchema,
]);
export type IntegrationsInput = z.infer<typeof integrationsSchema>;

/* ──────────────────────────── onboarding wizard ─────────────────────── */

export const onboardingVendorSchema = z.object({
  name: requiredText(200, "Vendor name"),
  email: optionalEmail(),
  trade: optionalText(100, "Trade"),
});

export const onboardingStepSchema = z.object({
  step: z.enum(["company", "templates", "vendors", "complete"]).optional(),
  companyName: optionalText(120, "Company name"),
  templateIds: z.array(z.string().max(80)).max(50).optional(),
  vendorsCsv: z.string().max(500_000).optional(),
  vendors: z.array(onboardingVendorSchema).max(1000).optional(),
  complete: z.boolean().optional(),
});
export type OnboardingStepInput = z.infer<typeof onboardingStepSchema>;

/* ───────────────────────────────── billing ──────────────────────────── */

export const billingCheckoutSchema = z.object({
  /** Left loose so `resolveCheckoutPlan` owns the "unknown plan" message. */
  planId: z.string().max(60).optional(),
});
export type BillingCheckoutInput = z.infer<typeof billingCheckoutSchema>;

/* ─────────────────────────────── careers ────────────────────────────── */

/**
 * Job application submission from /careers/[slug].
 *
 * Email-only capture (no DB persistence yet) — every field a reviewer would
 * ask for in the first reply, none of the ones that guarantee attrition
 * (resume upload, phone, work-auth interrogation). The honeypot is what
 * catches naive form bots; real applicants leave it empty.
 */
export const careersApplySchema = z.object({
  jobSlug: z
    .string()
    .trim()
    .min(1, "Job is required.")
    .max(60, "Job slug too long.")
    .regex(/^[a-z][a-z0-9-]{0,58}[a-z0-9]$/, "Invalid job."),
  name: requiredText(120, "Name"),
  email: z.email("Enter a valid email."),
  linkedinUrl: optionalText(300, "LinkedIn URL"),
  location: optionalText(120, "Location"),
  yearsExperience: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(60)])
    .nullish(),
  pitch: z
    .string()
    .trim()
    .min(30, "Tell us a bit more — at least 30 characters.")
    .max(2000, "Keep the pitch under 2000 characters."),
  /** Honeypot — bots fill hidden fields, humans don't. Silently reject. */
  companyWebsite: z.string().max(200).optional(),
});
export type CareersApplyInput = z.infer<typeof careersApplySchema>;
