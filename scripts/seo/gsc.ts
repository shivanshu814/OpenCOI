/**
 * Google Search Console — the only free source of truth for what we actually
 * rank for.
 *
 * Rank trackers (SerpAPI, Semrush) tell you where a URL sits for a term you
 * thought to check. GSC tells you every term Google already shows you for,
 * including the ones nobody guessed — which at this stage is most of them. It
 * is also the only place that reports impressions, i.e. "Google shows this
 * page but nobody clicks", which is a title/description problem, not a
 * ranking problem, and is invisible everywhere else.
 *
 * Three jobs in one script:
 *   1. `sitemaps`  — submit + list sitemap status (indexing starts here)
 *   2. `queries`   — top queries and pages, last 28 days
 *   3. `inspect`   — per-URL index status for every sitemap URL
 *
 * Run:  npm run seo:gsc                # all three
 *       npm run seo:gsc -- queries     # just one
 *
 * Auth: see `google-auth.ts`. The property must already exist in Search
 * Console and be owned by the authenticated account — this script cannot
 * create or verify a property, that is a one-time browser step.
 */

import {
  SCOPES,
  describeCredential,
  googleAccessToken,
  quotaProjectHeaders,
} from "./google-auth";
import { SITE, mapLimit, sitemapUrls, today, writeReport } from "./lib";

const API = "https://searchconsole.googleapis.com";
const WMX = "https://www.googleapis.com/webmasters/v3";

/**
 * The Search Console property id.
 *
 * A URL-prefix property is the literal origin with a trailing slash. A domain
 * property is `sc-domain:getcertshield.app` and covers every subdomain and
 * scheme — prefer it, and set `GSC_PROPERTY` accordingly once DNS is verified.
 */
const PROPERTY = process.env.GSC_PROPERTY?.trim() || `${SITE}/`;

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

async function gapi<T>(
  token: string,
  url: string,
  init?: RequestInit,
): Promise<T | { __error: string }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      // Without this, ADC user credentials 403 with "requires a quota project".
      ...(await quotaProjectHeaders()),
      ...init?.headers,
    },
  });
  if (!res.ok) return { __error: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

function isErr<T>(v: T | { __error: string }): v is { __error: string } {
  return typeof v === "object" && v !== null && "__error" in v;
}

/** ISO date N days back — GSC data lags ~2 days, so never ask for today. */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

async function submitSitemaps(token: string, out: string[]) {
  const sitemapUrl = `${SITE}/sitemap.xml`;
  console.log(`\n📑 Sitemaps`);

  const put = await gapi<unknown>(
    token,
    `${WMX}/sites/${encodeURIComponent(PROPERTY)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
    { method: "PUT" },
  );
  if (isErr(put)) {
    console.log(`   ⚠️  submit failed — ${put.__error}`);
    out.push(`- ⚠️ sitemap submit failed: ${put.__error}`);
  } else {
    console.log(`   ✅ submitted ${sitemapUrl}`);
    out.push(`- ✅ submitted \`${sitemapUrl}\``);
  }

  const list = await gapi<{
    sitemap?: { path: string; lastSubmitted?: string; isPending?: boolean; warnings?: string; errors?: string; contents?: { submitted: string; indexed?: string }[] }[];
  }>(token, `${WMX}/sites/${encodeURIComponent(PROPERTY)}/sitemaps`);

  if (isErr(list)) {
    console.log(`   ⚠️  list failed — ${list.__error}`);
    return;
  }
  for (const s of list.sitemap ?? []) {
    const submitted = s.contents?.[0]?.submitted ?? "?";
    console.log(
      `   ${s.path} — ${submitted} URLs submitted, errors ${s.errors ?? 0}, warnings ${s.warnings ?? 0}`,
    );
    out.push(`- \`${s.path}\` — ${submitted} URLs, ${s.errors ?? 0} errors, ${s.warnings ?? 0} warnings`);
  }
}

async function topQueries(token: string, out: string[]) {
  console.log(`\n🔍 Search analytics — last 28 days`);

  for (const dim of ["query", "page"] as const) {
    const body = JSON.stringify({
      startDate: daysAgo(30),
      endDate: daysAgo(2),
      dimensions: [dim],
      rowLimit: 50,
    });
    const res = await gapi<{ rows?: Row[] }>(
      token,
      `${API}/v1/sites/${encodeURIComponent(PROPERTY)}/searchAnalytics/query`,
      { method: "POST", body },
    );
    if (isErr(res)) {
      console.log(`   ⚠️  ${dim} query failed — ${res.__error}`);
      out.push(`\n⚠️ ${dim} query failed: ${res.__error}`);
      continue;
    }
    const rows = res.rows ?? [];
    if (rows.length === 0) {
      // Expect this for weeks after launch. It is not an error — it means
      // Google has not shown the site for anything yet.
      console.log(`   (no ${dim} data yet — normal until the site has impressions)`);
      out.push(`\n### Top ${dim}s\n\n_No data yet — Google has not served an impression for this property._`);
      continue;
    }

    out.push(`\n### Top ${dim}s (last 28 days)\n`);
    out.push(`| ${dim} | clicks | impressions | CTR | avg position |`);
    out.push(`| --- | ---: | ---: | ---: | ---: |`);
    for (const r of rows) {
      out.push(
        `| ${r.keys[0]} | ${r.clicks} | ${r.impressions} | ${(r.ctr * 100).toFixed(1)}% | ${r.position.toFixed(1)} |`,
      );
    }
    console.log(`   ${rows.length} ${dim}s — top: ${rows[0].keys[0]} (pos ${rows[0].position.toFixed(1)})`);
  }
}

async function inspectUrls(token: string, out: string[]) {
  console.log(`\n🔎 URL inspection`);
  let urls: string[];
  try {
    urls = await sitemapUrls();
  } catch (e) {
    console.log(`   ⚠️  ${(e as Error).message}`);
    return;
  }

  // The Inspection API allows ~2000/day but throttles bursts; 2-wide is safe.
  const results = await mapLimit(urls, 2, async (url) => {
    const res = await gapi<{
      inspectionResult?: {
        indexStatusResult?: {
          verdict?: string;
          coverageState?: string;
          lastCrawlTime?: string;
          robotsTxtState?: string;
          indexingState?: string;
        };
      };
    }>(token, `${API}/v1/urlInspection/index:inspect`, {
      method: "POST",
      body: JSON.stringify({ inspectionUrl: url, siteUrl: PROPERTY }),
    });
    if (isErr(res)) return { url, verdict: "ERROR", detail: res.__error };
    const r = res.inspectionResult?.indexStatusResult;
    return {
      url,
      verdict: r?.verdict ?? "?",
      detail: [r?.coverageState, r?.robotsTxtState, r?.lastCrawlTime ? `crawled ${r.lastCrawlTime.slice(0, 10)}` : null]
        .filter(Boolean)
        .join(" · "),
    };
  });

  const indexed = results.filter((r) => r.verdict === "PASS").length;
  console.log(`   ${indexed}/${results.length} indexed`);

  out.push(`\n### Index coverage\n`);
  out.push(`**${indexed}/${results.length} URLs indexed.**\n`);
  out.push(`| URL | verdict | detail |`);
  out.push(`| --- | --- | --- |`);
  for (const r of results) {
    out.push(`| ${r.url.replace(SITE, "") || "/"} | ${r.verdict} | ${r.detail} |`);
  }
  for (const r of results.filter((x) => x.verdict !== "PASS")) {
    console.log(`   ⚠️  ${r.url.replace(SITE, "") || "/"} — ${r.verdict}: ${r.detail}`);
  }
}

async function main() {
  const only = process.argv[2];
  console.log(`\n📊 Search Console — ${PROPERTY}`);
  console.log(`   auth: ${await describeCredential()}`);

  const token = await googleAccessToken(SCOPES.searchConsole);
  if (!token) {
    process.exitCode = 1;
    return;
  }

  // Fail loudly and specifically when the property is not on the account —
  // a 403 here means "not verified / wrong account", not "bad code".
  const sites = await gapi<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(
    token,
    `${WMX}/sites`,
  );
  if (isErr(sites)) {
    console.log(`\n❌ Could not list Search Console properties — ${sites.__error}`);
    process.exitCode = 1;
    return;
  }
  const owned = sites.siteEntry ?? [];
  console.log(`   properties on this account: ${owned.map((s) => s.siteUrl).join(", ") || "(none)"}`);
  if (!owned.some((s) => s.siteUrl === PROPERTY)) {
    console.log(
      `\n❌ ${PROPERTY} is not on this account.\n` +
        `   Add + verify it at https://search.google.com/search-console, then\n` +
        `   set GSC_PROPERTY if the id differs (domain properties look like\n` +
        `   sc-domain:getcertshield.app).\n`,
    );
    process.exitCode = 1;
    return;
  }

  const out: string[] = [`# Search Console — ${PROPERTY}`, ``, `_${today()}_`, ``];

  if (!only || only === "sitemaps") await submitSitemaps(token, out);
  if (!only || only === "queries") await topQueries(token, out);
  if (!only || only === "inspect") await inspectUrls(token, out);

  console.log(`\n   report → ${await writeReport(`gsc-${today()}.md`, out.join("\n"))}\n`);
}

// Top-level await is unavailable: package.json has no "type": "module", so tsx
// transforms these to CJS. `void` marks the floating promise as deliberate.
void main();
