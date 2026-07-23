import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOwnerReport,
  buildOwnerReportSummary,
  OWNER_HONESTY_NOTE,
  periodLabelFor,
} from "./owner-build";
import { ownerReportFilename, renderOwnerReportPdf } from "./owner-pdf";

describe("owner report build (D3)", () => {
  it("computes compliance %, docs, and risks flagged", () => {
    const report = buildOwnerReport({
      orgName: "Demo PM",
      property: {
        id: "prop_1",
        name: "Oak Street Apartments",
        address_line: "100 Oak St",
        city: "Austin",
        state: "TX",
        postal_code: "78701",
        owner_llc_names: ["Oak Street LLC"],
        certificate_holder_name: "Oak Street LLC",
      },
      vendors: [
        {
          id: "v1",
          name: "Sunshine Roofing",
          trade: "Roofer",
          status: "compliant",
          documents_on_file: 2,
        },
        {
          id: "v2",
          name: "Bay Plumbing",
          trade: "Plumber",
          status: "missing_docs",
          documents_on_file: 0,
        },
        {
          id: "v3",
          name: "GreenPath",
          trade: "Landscaper",
          status: "expiring",
          documents_on_file: 1,
        },
      ],
      generatedAt: new Date("2026-07-23T12:00:00Z"),
    });

    assert.equal(report.brand, "CertShield");
    assert.equal(report.period_label, "July 2026");
    assert.equal(report.compliance_percent, 67);
    assert.equal(report.documents_on_file, 3);
    assert.equal(report.risks_flagged, 1);
    assert.equal(report.expiring_count, 1);
    assert.equal(report.vendor_count, 3);
    assert.match(report.summary, /Oak Street Apartments/);
    assert.match(report.disclaimer, /not legal, insurance, or professional advice/i);
    assert.match(OWNER_HONESTY_NOTE, /not insurance claim outcomes/i);
    assert.match(report.honesty_note, /mid-term cancellations/i);
  });

  it("handles empty vendor list", () => {
    const report = buildOwnerReport({
      orgName: "Demo PM",
      property: { id: "p", name: "Empty Prop" },
      vendors: [],
      generatedAt: new Date("2026-07-01T00:00:00Z"),
    });
    assert.equal(report.compliance_percent, 0);
    assert.equal(report.documents_on_file, 0);
    assert.equal(report.risks_flagged, 0);
    assert.equal(periodLabelFor(new Date("2026-07-01T00:00:00Z")), "July 2026");
    assert.match(
      buildOwnerReportSummary({
        propertyName: "Empty Prop",
        periodLabel: "July 2026",
        compliancePercent: 0,
        vendorCount: 0,
        documentsOnFile: 0,
        risksFlagged: 0,
        expiringCount: 0,
      }),
      /0% of assigned vendors/,
    );
  });
});

describe("owner report PDF", () => {
  it("renders a non-empty PDF", async () => {
    const report = buildOwnerReport({
      orgName: "Demo PM",
      property: {
        id: "prop_1",
        name: "Oak Street Apartments",
        owner_llc_names: ["Oak Street LLC"],
      },
      vendors: [
        {
          id: "v1",
          name: "Sunshine Roofing",
          trade: "Roofer",
          status: "in_review",
          documents_on_file: 1,
        },
      ],
      generatedAt: new Date("2026-07-23T12:00:00Z"),
    });

    const bytes = await renderOwnerReportPdf(report);
    assert.ok(bytes.byteLength > 500);
    assert.equal(Buffer.from(bytes.slice(0, 5)).toString("utf8"), "%PDF-");
    assert.match(
      ownerReportFilename(report),
      /certshield-owner-oak-street-apartments-2026-07/,
    );
  });
});
