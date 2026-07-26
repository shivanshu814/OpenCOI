import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isTemplatePlaceholder,
  scrubTemplatePlaceholders,
} from "./placeholders";

describe("blank ACORD specimen defence", () => {
  it("recognizes the labels printed on an unfilled ACORD 25", () => {
    // Verbatim strings from public/samples/acord-25-nyc-vendor-handout.pdf.
    for (const label of [
      "NAME OF VENDOR",
      "NAME OF INSURANCE COMPANY",
      "COMPANY NAME",
      "POLICY NUMBER",
      "EFFECTIVE DATE",
      "EXPIRATION DATE",
      "ADDRESS",
      "CITY, STATE, ZIP CODE",
      "AGENCY PHONE NUMBER",
      "AGENCY EMAIL",
      "INSURANCE CARRIER(S) NAMES",
      "NAIC#",
      "SAMPLE ONLY",
    ]) {
      assert.equal(isTemplatePlaceholder(label), true, label);
    }
  });

  it("recognizes instructional stand-ins in a *filled* specimen", () => {
    // Verbatim AcroForm values from public/samples/acord-25-dasny-demo.pdf.
    // These are the dangerous ones: the form is filled, so the model reads
    // them as ordinary data at high confidence.
    for (const value of [
      "Your Agent or Broker",
      "Your Name",
      "Your Insurance Company",
      "Your Agent/Broker Representative",
      "MM/DD/YY",
      "XYZ-123",
      "ABC-345",
      "LLL-555",
      "WCB-678",
      "As Needed",
      "Contract Value",
      "FOR DEMO PURPOSES ONLY",
    ]) {
      assert.equal(isTemplatePlaceholder(value), true, value);
    }
  });

  it("recognizes dummy data in the 2009 agency specimen", () => {
    // From public/samples/acord-25-2009-specimen.pdf.
    for (const value of [
      "INSURED NAME",
      "CITY, STATE 00000-0000",
      "00/00/0000",
      "Sample Certificate prepared for",
    ]) {
      assert.equal(isTemplatePlaceholder(value), true, value);
    }
  });

  it("leaves real certificate data alone", () => {
    for (const value of [
      "Sunshine Roofing LLC",
      "Travelers Indemnity Company",
      "GL-4471902",
      "2027-01-01",
      "1200 Market St, Suite 400",
      "Philadelphia, PA 19107",
      "25674",
      // Real data lifted from the DASNY demo — the certificate holder and
      // description box on that form are genuine even though the insured is
      // a stand-in. Scrubbing these would destroy the AI-wording check.
      "Dormitory Authority- State of New York",
      "Albany, New York 12207",
      "Westchester Community College",
    ]) {
      assert.equal(isTemplatePlaceholder(value), false, value);
    }
  });

  it("does not scrub genuine businesses whose name starts with 'Your'", () => {
    // A blanket /^your / rule would wipe out these real contractors.
    for (const value of [
      "Your Home Services LLC",
      "Your Way Electrical Contracting Inc.",
      "Yours Truly Landscaping",
    ]) {
      assert.equal(isTemplatePlaceholder(value), false, value);
    }
  });

  it("recognizes the underscore rules on print-and-fill templates", () => {
    for (const value of [
      "______________________________________________",
      "____",
      "-----------",
      "— — —",
    ]) {
      assert.equal(isTemplatePlaceholder(value), true, value);
    }
    // A hyphenated real value must survive.
    assert.equal(isTemplatePlaceholder("GL-2024-8871"), false);
  });

  it("ignores non-strings and blank values", () => {
    assert.equal(isTemplatePlaceholder(null), false);
    assert.equal(isTemplatePlaceholder(undefined), false);
    assert.equal(isTemplatePlaceholder(1_000_000), false);
    assert.equal(isTemplatePlaceholder("   "), false);
  });

  it("nulls placeholders and zeroes the confidence of their block", () => {
    const { value, scrubbed } = scrubTemplatePlaceholders({
      insured: { name: "NAME OF VENDOR", address: "ADDRESS", confidence: 0.97 },
      producer: {
        name: "Real Agency Inc",
        email: "agent@realagency.com",
        confidence: 0.95,
      },
    });

    const out = value as {
      insured: { name: unknown; address: unknown; confidence: number };
      producer: { name: unknown; confidence: number };
    };

    assert.equal(out.insured.name, null);
    assert.equal(out.insured.address, null);
    // The model was confident about a label — that confidence must not stand,
    // or the <0.90 review gate would wave the blank form straight through.
    assert.equal(out.insured.confidence, 0);

    // Untouched blocks keep their original confidence.
    assert.equal(out.producer.name, "Real Agency Inc");
    assert.equal(out.producer.confidence, 0.95);

    assert.deepEqual(scrubbed.sort(), ["insured.address", "insured.name"]);
  });

  it("walks arrays and reports indexed paths", () => {
    const { value, scrubbed } = scrubTemplatePlaceholders({
      insurers: [
        { letter: "A", name: "NAME OF INSURANCE COMPANY", confidence: 0.93 },
        { letter: "B", name: "Hartford Casualty", confidence: 0.91 },
      ],
    });

    const out = value as {
      insurers: { name: unknown; confidence: number }[];
    };
    assert.equal(out.insurers[0].name, null);
    assert.equal(out.insurers[0].confidence, 0);
    assert.equal(out.insurers[1].name, "Hartford Casualty");
    assert.equal(out.insurers[1].confidence, 0.91);
    assert.deepEqual(scrubbed, ["insurers[0].name"]);
  });

  it("reports nothing for a fully filled certificate", () => {
    const { scrubbed } = scrubTemplatePlaceholders({
      insured: { name: "Bay Plumbing Co", confidence: 0.98 },
      policies: [{ policy_number: "CPP-882134", confidence: 0.96 }],
    });
    assert.deepEqual(scrubbed, []);
  });
});
