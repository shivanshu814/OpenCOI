/**
 * PageSpeed Insights — Core Web Vitals for every marketing URL, mobile first.
 *
 * Why PSI rather than only local Lighthouse: PSI returns two different things
 * in one call, and only one of them is a ranking signal.
 *
 *   • **Lab** (Lighthouse, synthetic) — reproducible, useful for catching a
 *     regression in a PR, but Google does not rank on it.
 *   • **Field** (CrUX, real Chrome users) — the actual Core Web Vitals input
 *     to Google's page-experience signals. A new site has NO field data until
 *     it has enough traffic, and "no CrUX data" is the expected state here.
 *
 * This script reports both and never conflates them, because a green lab score
 * with absent field data is exactly what a pre-traffic site looks like and
 * reading it as "we pass CWV" is the standard mistake.
 *
 * Free without a key (rate-limited, fine for 20 URLs). With
 * `PAGESPEED_API_KEY` the quota goes to 25k/day — mint one at
 * console.cloud.google.com → APIs & Services → Credentials → API key,
 * restricted to the PageSpeed Insights API.
 *
 * Run:  npm run seo:psi
 *       npm run seo:psi -- desktop
 */

import { SITE, mapLimit, optionalEnv, sitemapUrls, today, writeReport } from "./lib";

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Google's own "good" thresholds. Field values are what count for ranking. */
const GOOD = { lcp: 2500, inp: 200, cls: 0.1, fcp: 1800, ttfb: 800 };

type Result = {
  url: string;
  performance?: number;
  seo?: number;
  accessibility?: number;
  bestPractices?: number;
  lab: { lcp?: number; cls?: number; tbt?: number; fcp?: number; si?: number };
  field: { lcp?: number; inp?: number; cls?: number; fcp?: number; ttfb?: number } | null;
  opportunities: { title: string; savingsMs: number }[];
  error?: string;
};

function score(v: number | undefined): string {
  if (v === undefined) return "—";
  const pct = Math.round(v * 100);
  return `${pct <= 49 ? "🔴" : pct <= 89 ? "🟠" : "🟢"} ${pct}`;
}

function metric(value: number | undefined, threshold: number, unit = "ms"): string {
  if (value === undefined) return "—";
  const shown = unit === "ms" ? `${Math.round(value)}ms` : value.toFixed(3);
  return `${value <= threshold ? "🟢" : "🔴"} ${shown}`;
}

async function run(url: string, strategy: "mobile" | "desktop", key: string | null): Promise<Result> {
  const params = new URLSearchParams({ url, strategy });
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) {
    params.append("category", c);
  }
  if (key) params.set("key", key);

  const res = await fetch(`${ENDPOINT}?${params}`);
  if (!res.ok) {
    return { url, lab: {}, field: null, opportunities: [], error: `HTTP ${res.status}: ${(await res.text()).slice(0, 160)}` };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any -- PSI's response shape is
     enormous, versioned by Google, and we read six leaf values out of it;
     typing the whole envelope would be a liability, not a safety net. */
  const json: any = await res.json();
  const lh = json.lighthouseResult;
  const audits = lh?.audits ?? {};
  const cats = lh?.categories ?? {};
  const crux = json.loadingExperience?.metrics;

  const opportunities = Object.values(audits)
    .filter((a: any) => a?.details?.type === "opportunity" && a.details.overallSavingsMs > 100)
    .map((a: any) => ({ title: a.title as string, savingsMs: Math.round(a.details.overallSavingsMs) }))
    .sort((a, b) => b.savingsMs - a.savingsMs)
    .slice(0, 5);

  return {
    url,
    performance: cats.performance?.score,
    seo: cats.seo?.score,
    accessibility: cats.accessibility?.score,
    bestPractices: cats["best-practices"]?.score,
    lab: {
      lcp: audits["largest-contentful-paint"]?.numericValue,
      cls: audits["cumulative-layout-shift"]?.numericValue,
      tbt: audits["total-blocking-time"]?.numericValue,
      fcp: audits["first-contentful-paint"]?.numericValue,
      si: audits["speed-index"]?.numericValue,
    },
    field: crux
      ? {
          lcp: crux.LARGEST_CONTENTFUL_PAINT_MS?.percentile,
          inp: crux.INTERACTION_TO_NEXT_PAINT?.percentile,
          cls: crux.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile / 100,
          fcp: crux.FIRST_CONTENTFUL_PAINT_MS?.percentile,
          ttfb: crux.EXPERIENCE_TIME_TO_FIRST_BYTE?.percentile,
        }
      : null,
    opportunities,
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

async function main() {
  const strategy = (process.argv[2] === "desktop" ? "desktop" : "mobile") as "mobile" | "desktop";
  console.log(`\n⚡ PageSpeed Insights (${strategy}) — ${SITE}\n`);

  const key = optionalEnv(
    "PAGESPEED_API_KEY",
    "Running keyless: works, but rate-limited. Free key raises quota to 25k/day.",
  );

  const urls = await sitemapUrls();
  // Keyless PSI throttles aggressively — 2-wide keeps a 20-URL run clean.
  const results = await mapLimit(urls, key ? 4 : 2, async (url) => {
    const r = await run(url, strategy, key);
    console.log(
      r.error
        ? `   ❌ ${url.replace(SITE, "") || "/"} — ${r.error}`
        : `   ${score(r.performance)} perf · ${score(r.seo)} seo   ${url.replace(SITE, "") || "/"}`,
    );
    return r;
  });

  const withField = results.filter((r) => r.field).length;
  const lines: string[] = [
    `# PageSpeed Insights — ${strategy}`,
    ``,
    `_${today()} · ${results.length} URLs · ${withField} with CrUX field data_`,
    ``,
    withField === 0
      ? `> **No field (CrUX) data on any URL.** Expected before the site has real traffic.\n` +
        `> Core Web Vitals only become a ranking input once Chrome has enough real\n` +
        `> visits to report. The lab numbers below are still worth keeping green —\n` +
        `> they are the leading indicator — but they are not what Google ranks on.`
      : `> ${withField}/${results.length} URLs have real-user (CrUX) data. Those are the ranking-relevant numbers.`,
    ``,
    `## Scores`,
    ``,
    `| URL | perf | SEO | a11y | best practices |`,
    `| --- | --- | --- | --- | --- |`,
    ...results.map(
      (r) =>
        `| ${r.url.replace(SITE, "") || "/"} | ${score(r.performance)} | ${score(r.seo)} | ${score(r.accessibility)} | ${score(r.bestPractices)} |`,
    ),
    ``,
    `## Lab metrics (synthetic — regression detection)`,
    ``,
    `| URL | LCP | CLS | TBT | FCP |`,
    `| --- | --- | --- | --- | --- |`,
    ...results.map(
      (r) =>
        `| ${r.url.replace(SITE, "") || "/"} | ${metric(r.lab.lcp, GOOD.lcp)} | ${metric(r.lab.cls, GOOD.cls, "n")} | ${metric(r.lab.tbt, 200)} | ${metric(r.lab.fcp, GOOD.fcp)} |`,
    ),
    ``,
  ];

  if (withField > 0) {
    lines.push(
      `## Field metrics (CrUX — what Google actually ranks on)`,
      ``,
      `| URL | LCP | INP | CLS | TTFB |`,
      `| --- | --- | --- | --- | --- |`,
      ...results
        .filter((r) => r.field)
        .map(
          (r) =>
            `| ${r.url.replace(SITE, "") || "/"} | ${metric(r.field!.lcp, GOOD.lcp)} | ${metric(r.field!.inp, GOOD.inp)} | ${metric(r.field!.cls, GOOD.cls, "n")} | ${metric(r.field!.ttfb, GOOD.ttfb)} |`,
        ),
      ``,
    );
  }

  const allOpps = new Map<string, number>();
  for (const r of results) {
    for (const o of r.opportunities) allOpps.set(o.title, (allOpps.get(o.title) ?? 0) + o.savingsMs);
  }
  if (allOpps.size) {
    lines.push(`## Biggest wins (summed savings across all pages)`, ``);
    for (const [title, ms] of [...allOpps].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      lines.push(`- **${(ms / 1000).toFixed(1)}s** — ${title}`);
    }
    lines.push(``);
  }

  console.log(`\n   report → ${await writeReport(`psi-${strategy}-${today()}.md`, lines.join("\n"))}\n`);

  // A page Lighthouse scores below 90 on SEO has a concrete, fixable defect
  // (missing meta, blocked resource, bad status). Perf is advisory here.
  const badSeo = results.filter((r) => r.seo !== undefined && r.seo < 0.9);
  if (badSeo.length) {
    console.log(`   ⚠️  ${badSeo.length} URL(s) below 90 on the SEO category`);
    process.exitCode = 1;
  }
}

// Top-level await is unavailable: package.json has no "type": "module", so tsx
// transforms these to CJS. `void` marks the floating promise as deliberate.
void main();
