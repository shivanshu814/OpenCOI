import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProjectCloseoutSummary,
  closeoutFilename,
  projectCompliancePercent,
} from "./types";

describe("D2 GC projects", () => {
  it("computes project compliance like property %", () => {
    assert.equal(
      projectCompliancePercent(["compliant", "expiring", "missing_docs"]),
      67,
    );
  });

  it("builds closeout summary + safe zip name", () => {
    const summary = buildProjectCloseoutSummary({
      projectName: "Roof Replace — Building A",
      vendors: [
        {
          id: "1",
          name: "Sunshine Roofing",
          trade: "Roofer",
          status: "compliant",
          documents_on_file: 2,
        },
        {
          id: "2",
          name: "Bay Plumbing",
          trade: "Plumber",
          status: "missing_docs",
          documents_on_file: 0,
        },
      ],
      documentsOnFile: 2,
    });
    assert.match(summary, /50%/);
    assert.match(summary, /1 sub\(s\) still need attention/);
    assert.match(
      closeoutFilename("Roof Replace — Building A", new Date("2026-07-23T12:00:00Z")),
      /^closeout-roof-replace-building-a-2026-07-23\.zip$/,
    );
  });
});
