import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { analyzePdfLayout } from "./layout";

const SAMPLES = join(process.cwd(), "public", "samples");
const sample = (name: string) => readFileSync(join(SAMPLES, name));

describe("B7 layout signals", () => {
  it("never throws on any shipped real-world certificate", async () => {
    // Real certificates come out of scanners and decades-old agency software
    // with dangling object refs. pdf-lib throws on those from `getPages()`
    // *after* the document loads — which crashed this analysis on the DASNY
    // file before the per-page guards went in. This runs inside the extraction
    // pipeline, so a malformed PDF must degrade to "no signal", never take an
    // upload down.
    for (const name of [
      "acord-25-dasny-demo.pdf",
      "acord-25-nyc-vendor-handout.pdf",
      "acord-25-2009-specimen.pdf",
      "acord-25-2009-exhibitor-sample.pdf",
      "acord-25-2010-consultant-template.pdf",
      "acord-25-2016-blank.pdf",
      "acord-25-2016-fillable.pdf",
    ]) {
      const result = await analyzePdfLayout(sample(name));
      assert.ok(Array.isArray(result.signals), name);
      assert.ok(Array.isArray(result.fonts), name);
    }
  });

  it("degrades to no signal on bytes that are not a PDF", async () => {
    const result = await analyzePdfLayout(Buffer.from("not a pdf at all"));
    assert.deepEqual(result.signals, []);
    assert.deepEqual(result.fonts, []);
    assert.equal(result.pageCount, 0);
  });

  it("raises nothing on ordinary agency-issued certificates", async () => {
    // The whole point of B7 being advisory: a signal that fires on normal
    // documents is noise, and noise teaches reviewers to dismiss the signals
    // that matter. These are legitimate ACORD forms and must stay quiet.
    for (const name of [
      "acord-25-2016-blank.pdf",
      "acord-25-2016-fillable.pdf",
      "acord-25-nyc-vendor-handout.pdf",
      "acord-25-2009-specimen.pdf",
    ]) {
      const { signals } = await analyzePdfLayout(sample(name));
      assert.deepEqual(
        signals.map((s) => s.code),
        [],
        `${name} should not raise risk signals`,
      );
    }
  });

  it("does not treat an incremental update as a risk signal", async () => {
    // Five of the seven real certificates carry one — agency software, form
    // fills, and portal stamps all produce it. It is reported as a fact for
    // the review UI, never as a risk.
    const { incrementallyUpdated, signals } = await analyzePdfLayout(
      sample("acord-25-2009-exhibitor-sample.pdf"),
    );
    assert.equal(incrementallyUpdated, true);
    assert.equal(
      signals.some((s) => s.code === "pdf_incremental_update"),
      false,
    );
  });

  it("reads real font names off the page", async () => {
    const { fonts } = await analyzePdfLayout(sample("acord-25-2016-blank.pdf"));
    assert.ok(fonts.length > 0);
    // Subset prefixes ("ABCDEF+Arial") are stripped, so names stay comparable.
    assert.ok(
      fonts.every((f) => !/^[A-Z]{6}\+/.test(f)),
      `subset prefix leaked: ${fonts.join(", ")}`,
    );
    assert.ok(fonts.some((f) => f.toLowerCase().includes("arial")));
  });

  it("keeps every signal advisory — never warn or high", async () => {
    // docs/08 §3: accusing a real contractor of altering their certificate on
    // a heuristic is a worse failure than missing a forgery human review
    // would catch. Nothing here may escalate.
    for (const name of ["acord-25-dasny-demo.pdf", "acord-25-2016-blank.pdf"]) {
      const { signals } = await analyzePdfLayout(sample(name));
      for (const s of signals) {
        assert.equal(s.severity, "info", `${name}/${s.code}`);
      }
    }
  });
});
