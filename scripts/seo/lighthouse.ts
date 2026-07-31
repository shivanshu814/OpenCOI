/**
 * Lighthouse CLI runner with pass/fail budgets.
 *
 * Complements `psi.ts` rather than duplicating it. PSI runs on Google's
 * infrastructure and can only see a **deployed** URL; this runs Lighthouse
 * locally against whatever origin you point it at, including `localhost`, so a
 * performance regression can be caught in the branch that caused it instead of
 * after it ships.
 *
 * Lighthouse is invoked through `npx` rather than added to devDependencies on
 * purpose: it pulls a Chrome launcher and ~100 MB of tree, and this runs
 * weekly at most. `npx --yes` caches it after the first run.
 *
 * Run:  npm run seo:lighthouse
 *       SEO_SITE_URL=http://localhost:3000 npm run seo:lighthouse
 *       npm run seo:lighthouse -- /pricing /blog     # specific paths
 */

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { SITE, sitemapUrls, today, writeReport } from "./lib";

const run = promisify(execFile);

/**
 * Category floors. SEO and best-practices are near-deterministic and cheap to
 * keep at 100 — anything below is a concrete missing tag or a real defect.
 * Performance is deliberately looser: it swings with local CPU contention, and
 * a flaky gate is a gate that gets disabled.
 */
const BUDGETS: Record<string, number> = {
  seo: 100,
  "best-practices": 95,
  accessibility: 95,
  performance: 80,
};

type Run = {
  url: string;
  scores: Record<string, number>;
  lcp?: number;
  cls?: number;
  tbt?: number;
  failures: string[];
  error?: string;
};

async function lighthouse(url: string, outDir: string, index: number): Promise<Run> {
  const jsonPath = path.join(outDir, `lh-${index}.json`);
  try {
    await run(
      "npx",
      [
        "--yes",
        "lighthouse",
        url,
        "--quiet",
        "--output=json",
        `--output-path=${jsonPath}`,
        "--only-categories=performance,accessibility,best-practices,seo",
        "--form-factor=mobile",
        "--screenEmulation.mobile",
        // Headless + no-sandbox so this also runs in CI containers.
        '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
      ],
      { timeout: 180_000, maxBuffer: 32 * 1024 * 1024 },
    );
  } catch (e) {
    return { url, scores: {}, failures: [], error: (e as Error).message.slice(0, 200) };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any -- Lighthouse's report
     schema is large and versioned upstream; we read four leaves. */
  const report: any = JSON.parse(await readFile(jsonPath, "utf8"));
  const scores: Record<string, number> = {};
  for (const [key, cat] of Object.entries<any>(report.categories ?? {})) {
    scores[key] = Math.round((cat.score ?? 0) * 100);
  }

  const failures = Object.entries(BUDGETS)
    .filter(([cat, floor]) => scores[cat] !== undefined && scores[cat] < floor)
    .map(([cat, floor]) => `${cat} ${scores[cat]} < ${floor}`);

  return {
    url,
    scores,
    lcp: report.audits?.["largest-contentful-paint"]?.numericValue,
    cls: report.audits?.["cumulative-layout-shift"]?.numericValue,
    tbt: report.audits?.["total-blocking-time"]?.numericValue,
    failures,
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

async function main() {
  const paths = process.argv.slice(2).filter((a) => a.startsWith("/"));
  const urls = paths.length ? paths.map((p) => `${SITE}${p}`) : await sitemapUrls();

  console.log(`\n🔦 Lighthouse — ${urls.length} URL(s) against ${SITE}`);
  console.log(`   first run downloads Lighthouse via npx; later runs are cached\n`);

  const outDir = await mkdtemp(path.join(tmpdir(), "certshield-lh-"));
  const runs: Run[] = [];
  try {
    // Strictly serial: two Chrome instances competing for CPU on a laptop
    // produce performance numbers that mean nothing.
    for (const [i, url] of urls.entries()) {
      const r = await lighthouse(url, outDir, i);
      runs.push(r);
      console.log(
        r.error
          ? `   ❌ ${url.replace(SITE, "") || "/"} — ${r.error}`
          : `   ${r.failures.length ? "⚠️ " : "✅"} ${String(r.scores.performance ?? "?").padStart(3)} perf · ` +
            `${String(r.scores.seo ?? "?").padStart(3)} seo · ` +
            `${String(r.scores.accessibility ?? "?").padStart(3)} a11y   ${url.replace(SITE, "") || "/"}`,
      );
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }

  const lines: string[] = [
    `# Lighthouse — ${SITE}`,
    ``,
    `_${today()} · mobile · ${runs.length} URLs_`,
    ``,
    `Budgets: ${Object.entries(BUDGETS).map(([k, v]) => `${k} ≥ ${v}`).join(" · ")}`,
    ``,
    `| URL | perf | a11y | best practices | SEO | LCP | CLS | TBT |`,
    `| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
    ...runs.map(
      (r) =>
        `| ${r.url.replace(SITE, "") || "/"} | ${r.scores.performance ?? "—"} | ${r.scores.accessibility ?? "—"} | ` +
        `${r.scores["best-practices"] ?? "—"} | ${r.scores.seo ?? "—"} | ` +
        `${r.lcp ? `${Math.round(r.lcp)}ms` : "—"} | ${r.cls?.toFixed(3) ?? "—"} | ${r.tbt ? `${Math.round(r.tbt)}ms` : "—"} |`,
    ),
    ``,
  ];

  const failing = runs.filter((r) => r.failures.length || r.error);
  if (failing.length) {
    lines.push(`## Below budget`, ``);
    for (const r of failing) {
      lines.push(`- **${r.url.replace(SITE, "") || "/"}** — ${r.error ?? r.failures.join(", ")}`);
    }
    lines.push(``);
  }

  console.log(`\n   ${failing.length}/${runs.length} below budget`);
  console.log(`   report → ${await writeReport(`lighthouse-${today()}.md`, lines.join("\n"))}\n`);

  if (failing.length) process.exitCode = 1;
}

// Top-level await is unavailable: package.json has no "type": "module", so tsx
// transforms these to CJS. `void` marks the floating promise as deliberate.
void main();
