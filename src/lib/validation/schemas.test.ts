import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeHexColor, sanitizeLogoUrl } from "@/lib/portal/tokens";
import {
  billingCheckoutSchema,
  customerDecisionSchema,
  documentCorrectionSchema,
  fieldErrorsFrom,
  firstIssueMessage,
  integrationsSchema,
  onboardingStepSchema,
  orgBrandingSchema,
  orgProfileSchema,
  projectCreateSchema,
  projectUpdateSchema,
  propertyCreateSchema,
  propertyUpdateSchema,
  requirementRuleSchema,
  smsOptInSchema,
  templateDownloadLeadSchema,
  teamInviteSchema,
  teamSettingsSchema,
  validationErrorBody,
  vendorCreateSchema,
  vendorOnboardingSchema,
} from "./schemas";

/** Convenience: field → first message for a payload we expect to fail. */
function errorsFor(
  schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } },
  value: unknown,
): Record<string, string> {
  const r = schema.safeParse(value);
  assert.equal(r.success, false, "expected the payload to be rejected");
  return fieldErrorsFrom(r.error as Parameters<typeof fieldErrorsFrom>[0]);
}

describe("vendor create", () => {
  it("accepts a name-only vendor", () => {
    const r = vendorCreateSchema.safeParse({ name: "Roof Pros LLC" });
    assert.equal(r.success, true);
    assert.equal(r.data?.name, "Roof Pros LLC");
  });

  it("trims the name and keeps blank optionals", () => {
    const r = vendorCreateSchema.safeParse({
      name: "  Roof Pros  ",
      email: "",
      trade: "",
    });
    assert.equal(r.success, true);
    assert.deepEqual(r.data, { name: "Roof Pros", email: "", trade: "" });
  });

  it("requires a name", () => {
    assert.equal(errorsFor(vendorCreateSchema, { name: "   " }).name, "Vendor name is required.");
  });

  it("rejects a malformed email", () => {
    assert.match(
      errorsFor(vendorCreateSchema, { name: "A", email: "ops@" }).email!,
      /valid email/i,
    );
  });

  it("caps the name length", () => {
    assert.match(
      errorsFor(vendorCreateSchema, { name: "x".repeat(201) }).name!,
      /200 characters or fewer/,
    );
  });
});

describe("property create / update", () => {
  it("accepts a full valid payload", () => {
    const r = propertyCreateSchema.safeParse({
      name: "Oak Street Apartments",
      address_line: "1200 Market St",
      city: "Philadelphia",
      state: "pa",
      postal_code: "19107-1234",
      certificate_holder_name: "Oak Street LLC",
      owner_llc_names: ["Oak Street LLC"],
    });
    assert.equal(r.success, true);
  });

  it("keeps empty optional strings allowed (the UI submits them today)", () => {
    const r = propertyCreateSchema.safeParse({
      name: "Oak",
      address_line: "",
      city: "",
      state: "",
      postal_code: "",
      certificate_holder_name: "",
      additional_insured_wording: "",
    });
    assert.equal(r.success, true);
  });

  it("also allows nulls for optional fields", () => {
    const r = propertyCreateSchema.safeParse({
      name: "Oak",
      address_line: null,
      city: null,
      state: null,
      postal_code: null,
    });
    assert.equal(r.success, true);
  });

  it("rejects a non-state and a non-ZIP", () => {
    const errs = errorsFor(propertyCreateSchema, {
      name: "Oak",
      state: "penn",
      postal_code: "1910",
    });
    assert.equal(errs.state, "Use a two-letter state code like PA.");
    assert.equal(errs.postal_code, "Enter a 5-digit ZIP (or ZIP+4).");
  });

  it("accepts full state names, since normalizeStateCode does", () => {
    assert.equal(
      propertyCreateSchema.safeParse({ name: "Oak", state: "Pennsylvania" })
        .success,
      true,
    );
  });

  it("makes name optional on update but still validates it when present", () => {
    assert.equal(propertyUpdateSchema.safeParse({ city: "Philadelphia" }).success, true);
    assert.equal(errorsFor(propertyUpdateSchema, { name: "" }).name, "Property name is required.");
  });

  it("validates the owner report email and vendor ids on update", () => {
    assert.match(
      errorsFor(propertyUpdateSchema, { owner_report_email: "owner@" })
        .owner_report_email!,
      /valid owner report email/i,
    );
    assert.equal(
      propertyUpdateSchema.safeParse({ owner_report_email: "" }).success,
      true,
    );
    assert.equal(
      propertyUpdateSchema.safeParse({ vendorIds: ["not-a-uuid"] }).success,
      false,
    );
  });

  it("caps additional insured wording", () => {
    assert.match(
      errorsFor(propertyCreateSchema, {
        name: "Oak",
        additional_insured_wording: "x".repeat(1001),
      }).additional_insured_wording!,
      /1000 characters or fewer/,
    );
  });
});

describe("project create / update", () => {
  it("accepts ISO dates and blank dates", () => {
    assert.equal(
      projectCreateSchema.safeParse({
        name: "Roof Replace",
        start_date: "2026-07-01",
        end_date: "",
      }).success,
      true,
    );
  });

  it("rejects a non-ISO date", () => {
    assert.match(
      errorsFor(projectCreateSchema, { name: "R", start_date: "07/01/2026" })
        .start_date!,
      /YYYY-MM-DD/,
    );
  });

  it("constrains status to the state machine values", () => {
    assert.equal(projectUpdateSchema.safeParse({ status: "closeout" }).success, true);
    assert.equal(projectUpdateSchema.safeParse({ status: "archived" }).success, false);
  });
});

describe("requirement rules", () => {
  it("keeps unknown keys instead of stripping them", () => {
    const r = requirementRuleSchema.safeParse({
      id: "gl_each_occ",
      line: "general_liability",
      label: "GL each-occurrence ≥ $1,000,000",
      min_amount: 1_000_000,
      future_field: "keep me",
    });
    assert.equal(r.success, true);
    assert.equal((r.data as Record<string, unknown>).future_field, "keep me");
  });

  it("requires an id and a line", () => {
    assert.equal(requirementRuleSchema.safeParse({}).success, false);
    assert.equal(
      requirementRuleSchema.safeParse({ id: "x", line: "" }).success,
      false,
    );
  });

  it("rejects a negative minimum", () => {
    assert.equal(
      requirementRuleSchema.safeParse({ id: "x", line: "y", min_amount: -1 })
        .success,
      false,
    );
  });
});

describe("workspace settings", () => {
  it("routes on action", () => {
    const r = teamSettingsSchema.safeParse({
      action: "update_profile",
      name: "Riverside PM",
      website: "https://riversidepm.com",
      state: "PA",
      postal_code: "19107",
    });
    assert.equal(r.success, true);
  });

  it("requires a company name with the copy the UI already shows", () => {
    assert.equal(
      errorsFor(orgProfileSchema, { action: "update_profile", name: " " }).name,
      "A company name is required — it appears on every report.",
    );
  });

  it("rejects a website without a scheme", () => {
    assert.match(
      errorsFor(orgProfileSchema, {
        action: "update_profile",
        name: "Riverside",
        website: "riversidepm.com",
      }).website!,
      /http:\/\/ or https:\/\//,
    );
  });

  it("rejects a bad hex color and a non-https logo", () => {
    const errs = errorsFor(orgBrandingSchema, {
      action: "update_branding",
      brand_primary_color: "0F766E",
      logo_url: "http://yourpm.com/logo.png",
    });
    assert.equal(errs.brand_primary_color, "Enter a hex color such as #0F766E.");
    assert.equal(errs.logo_url, "The logo must be served over https.");
  });

  it("agrees with the runtime sanitizers in @/lib/portal/tokens", () => {
    for (const color of ["#fff", "#0F766E", "#0f766e", "nope", "0F766E", "#12", ""]) {
      const accepted = orgBrandingSchema.safeParse({
        action: "update_branding",
        brand_primary_color: color,
      }).success;
      assert.equal(
        accepted,
        color.trim() === "" || sanitizeHexColor(color) !== null,
        `hex mismatch for ${JSON.stringify(color)}`,
      );
    }
    for (const url of [
      "https://a.example/logo.png",
      "http://a.example/logo.png",
      "javascript:alert(1)",
      "not a url",
      "",
    ]) {
      const accepted = orgBrandingSchema.safeParse({
        action: "update_branding",
        logo_url: url,
      }).success;
      assert.equal(
        accepted,
        url.trim() === "" || sanitizeLogoUrl(url) !== null,
        `logo mismatch for ${JSON.stringify(url)}`,
      );
    }
  });

  it("validates invites", () => {
    assert.equal(
      teamInviteSchema.safeParse({ action: "invite", email: "a@b.com", role: "viewer" })
        .success,
      true,
    );
    assert.equal(
      errorsFor(teamInviteSchema, { action: "invite", email: "nope" }).email,
      "Enter a valid email address.",
    );
    assert.equal(
      teamInviteSchema.safeParse({ action: "invite", email: "a@b.com", role: "owner" })
        .success,
      false,
      "owner is not an invitable role",
    );
  });

  it("rejects an unknown action", () => {
    assert.equal(teamSettingsSchema.safeParse({ action: "drop_table" }).success, false);
  });
});

describe("vendor onboarding", () => {
  it("accepts a W-9 upsert without re-keying the TIN", () => {
    assert.equal(
      vendorOnboardingSchema.safeParse({
        action: "upsert_tax",
        legal_name: "Roof Pros LLC",
        tin: "",
        state: "PA",
        postal_code: "19107",
      }).success,
      true,
    );
  });

  it("rejects a bad W-9 state", () => {
    assert.equal(
      errorsFor(vendorOnboardingSchema, {
        action: "upsert_tax",
        state: "Pennsylvanya",
      }).state,
      "Use a two-letter state code like PA.",
    );
  });

  it("validates the licence expiry date", () => {
    assert.equal(
      vendorOnboardingSchema.safeParse({
        action: "add_license",
        license_number: "PA-12345",
        license_state: "pa",
        expires_on: "2027-01-31",
      }).success,
      true,
    );
    assert.match(
      errorsFor(vendorOnboardingSchema, {
        action: "add_license",
        expires_on: "31/01/2027",
      }).expires_on!,
      /YYYY-MM-DD/,
    );
  });

  it("validates the e-sign signer email", () => {
    assert.equal(
      vendorOnboardingSchema.safeParse({ action: "create_agreement" }).success,
      true,
    );
    assert.equal(
      vendorOnboardingSchema.safeParse({
        action: "create_agreement",
        signer_email: "nope@",
      }).success,
      false,
    );
  });
});

describe("SMS opt-in (TCPA)", () => {
  it("allows saving a phone without consent", () => {
    assert.equal(
      smsOptInSchema.safeParse({ phone: "+1 555 555 0100", opt_in: false }).success,
      true,
    );
  });

  it("refuses consent without a number", () => {
    assert.equal(
      errorsFor(smsOptInSchema, { phone: "", opt_in: true }).phone,
      "Add a mobile number before recording consent.",
    );
  });
});

describe("documents", () => {
  it("requires field_path or corrected_extraction", () => {
    assert.equal(documentCorrectionSchema.safeParse({}).success, false);
    assert.equal(
      documentCorrectionSchema.safeParse({ field_path: "policies[0].line" }).success,
      true,
    );
  });

  it("blocks prototype-pollution paths", () => {
    for (const p of ["__proto__", "a.__proto__.b", "constructor.x", "a.prototype"]) {
      assert.equal(
        documentCorrectionSchema.safeParse({ field_path: p }).success,
        false,
        p,
      );
    }
  });

  it("constrains the customer decision to Appendix B actions", () => {
    assert.equal(customerDecisionSchema.safeParse({ action: "accept" }).success, true);
    assert.equal(
      customerDecisionSchema.safeParse({
        action: "override",
        reason_code: "requirement_waived",
      }).success,
      true,
    );
    assert.equal(
      customerDecisionSchema.safeParse({
        action: "override",
        reason_code: "because_i_said_so",
      }).success,
      false,
    );
    assert.equal(customerDecisionSchema.safeParse({ action: "publish" }).success, false);
  });
});

describe("integrations", () => {
  it("accepts key creation and webhook creation", () => {
    assert.equal(
      integrationsSchema.safeParse({ action: "create_key", name: "Zapier" }).success,
      true,
    );
    assert.equal(
      integrationsSchema.safeParse({
        action: "create_webhook",
        url: "https://hooks.zapier.com/abc",
        events: ["vendor.status_changed"],
      }).success,
      true,
    );
  });

  it("rejects a webhook URL that is not a URL", () => {
    assert.match(
      errorsFor(integrationsSchema, { action: "create_webhook", url: "hooks.zapier.com" })
        .url!,
      /full URL/,
    );
  });
});

describe("onboarding wizard", () => {
  it("accepts each step the wizard posts", () => {
    assert.equal(
      onboardingStepSchema.safeParse({ step: "company", companyName: "Acme PM" }).success,
      true,
    );
    assert.equal(
      onboardingStepSchema.safeParse({ step: "templates", templateIds: ["global_default"] })
        .success,
      true,
    );
    assert.equal(
      onboardingStepSchema.safeParse({
        step: "vendors",
        vendors: [{ name: "Roof Pros", email: "ops@roof.com", trade: "Roofer" }],
        vendorsCsv: "",
      }).success,
      true,
    );
    assert.equal(
      onboardingStepSchema.safeParse({ step: "complete", complete: true }).success,
      true,
    );
  });

  it("rejects an unknown step", () => {
    assert.equal(onboardingStepSchema.safeParse({ step: "hack" }).success, false);
  });
});

describe("billing checkout", () => {
  it("stays loose so resolveCheckoutPlan owns the plan message", () => {
    assert.equal(billingCheckoutSchema.safeParse({}).success, true);
    assert.equal(billingCheckoutSchema.safeParse({ planId: "pro" }).success, true);
    assert.equal(billingCheckoutSchema.safeParse({ planId: "x".repeat(61) }).success, false);
  });
});

describe("lead magnet capture", () => {
  it("accepts a valid email", () => {
    assert.equal(
      templateDownloadLeadSchema.safeParse({ email: "ops@vendor.com" }).success,
      true,
    );
  });

  it("rejects a malformed email", () => {
    assert.equal(templateDownloadLeadSchema.safeParse({ email: "ops@" }).success, false);
  });
});

describe("error helpers", () => {
  it("builds the { error, details } 400 body the routes return", () => {
    const r = propertyCreateSchema.safeParse({ name: "" });
    assert.equal(r.success, false);
    const body = validationErrorBody(r.error!, "Invalid property");
    assert.equal(body.error, "Property name is required.");
    assert.deepEqual(
      (body.details.fieldErrors as Record<string, string[] | undefined>).name,
      ["Property name is required."],
    );
  });

  it("falls back when a schema has no message", () => {
    const r = propertyCreateSchema.safeParse({ name: "ok", vendorIds: 1 });
    assert.equal(r.success, true, "vendorIds is not part of the create schema");
    const bad = propertyUpdateSchema.safeParse({ vendorIds: 1 });
    assert.equal(bad.success, false);
    assert.equal(typeof firstIssueMessage(bad.error!, "Invalid patch"), "string");
  });

  it("keys field errors by dotted path", () => {
    const r = propertyUpdateSchema.safeParse({
      rules: [{ id: "", line: "general_liability" }],
    });
    assert.equal(r.success, false);
    const errs = fieldErrorsFrom(r.error!);
    assert.equal(errs["rules.0.id"], "Rule id is required.");
  });
});
