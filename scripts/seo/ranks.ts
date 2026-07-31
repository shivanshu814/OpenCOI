/**
 * Rank tracking for the docs/02 §4 keyword map, via SerpAPI's free tier.
 *
 * Free tier is **100 searches/month**, and the keyword map has 21 terms — so
 * a full run costs a fifth of the month's quota. That is deliberate: run this
 * **weekly, not daily**, and let Search Console (`gsc.ts`) carry the daily
 * signal. A rank tracker answers "where am I for the terms I chose"; GSC
 * answers "what am I actually being shown for", which at this stage is the
 * more useful question and is unlimited and free.
 *
 * What this checks that a position number alone does not: **which URL** ranks.
 * A term ranking with the wrong page (blog post outranking the money page) is
 * keyword cannibalisation — it caps conversion and is invisible if you only
 * watch positions.
 *
 * Run:  npm run seo:ranks
 *       npm run seo:ranks -- BOFU     # spend quota on money terms only
 *
 * Key: serpapi.com → sign up → Dashboard → API key → `SERPAPI_KEY`.
 * No card required for the free tier.
 */

import { KEYWORDS, SITE, mapLimit, today, writeReport } from "./lib";

const ENDPOINT = "https://serpapi.com/search.json";
/** US SMBs are the market (docs/00) — ranking in another locale is noise. */
const LOCATION = "United States";

type Rank = {
  term: string;
  stage: string;
  expectedPage: string;
  position: number | null;
  rankingUrl: string | null;
  /** True when we rank, but with a different page than the map intends. */
  cannibalised: boolean;
  aiOverview: boolean;
  topCompetitors: string[];
  error?: string;
};

async function checkTerm(
  key: string,
  kw: (typeof KEYWORDS)[number],
): Promise<Rank> {
  const params = new URLSearchParams({
    engine: "google",
    q: kw.term,
    location: LOCATION,
    google_domain: "google.com",
    gl: "us",
    hl: "en",
    num: "100",
    api_key: key,
  });

  const base: Rank = {
    term: kw.term,
    stage: kw.stage,
    expectedPage: kw.page,
    position: null,
    rankingUrl: null,
    cannibalised: false,
    aiOverview: false,
    topCompetitors: [],
  };

  const res = await fetch(`${ENDPOINT}?${params}`);
  if (!res.ok) {
    return { ...base, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 140)}` };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any -- SerpAPI's envelope is
     large and provider-versioned; we read three arrays out of it. */
  const json: any = await res.json();
  if (json.error) return { ...base, error: String(json.error) };

  const organic: any[] = json.organic_results ?? [];
  const mine = organic.find((r) => typeof r.link === "string" && r.link.startsWith(SITE));

  return {
    ...base,
    position: mine?.position ?? null,
    rankingUrl: mine?.link ?? null,
    cannibalised: Boolean(mine) && !String(mine.link).replace(SITE, "").replace(/\/$/, "").startsWith(kw.page.replace(/\/$/, "")),
    // An AI Overview on the SERP pushes organic result #1 below the fold. Worth
    // knowing per term: it changes what "position 3" is actually worth.
    aiOverview: Boolean(json.ai_overview),
    topCompetitors: organic
      .slice(0, 5)
      .map((r) => {
        try {
          return new URL(r.link).host.replace(/^www\./, "");
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

async function main() {
  const key = process.env.SERPAPI_KEY?.trim();
  if (!key) {
    console.log(
      `\n⊘ SERPAPI_KEY not set.\n` +
        `  Free tier: 100 searches/month, no card — serpapi.com → Dashboard → API key.\n` +
        `  Until then, Search Console (npm run seo:gsc) covers ranking data for\n` +
        `  free and without a quota.\n`,
    );
    process.exitCode = 1;
    return;
  }

  const stageFilter = process.argv[2]?.toUpperCase();
  const terms = stageFilter ? KEYWORDS.filter((k) => k.stage === stageFilter) : KEYWORDS;

  console.log(`\n📈 Rank check — ${terms.length} terms (${terms.length} of 100 monthly free searches)\n`);

  // 2-wide: SerpAPI's free tier serialises anyway, and burning quota on a
  // rate-limit retry is the one failure mode that actually costs something.
  const ranks = await mapLimit(terms, 2, async (kw) => {
    const r = await checkTerm(key, kw);
    const pos = r.error ? `⚠️  ${r.error}` : r.position ? `#${r.position}` : "not in top 100";
    console.log(`   ${r.position && r.position <= 10 ? "🟢" : r.position ? "🟠" : "⚪"} ${pos.padEnd(16)} ${kw.term}`);
    return r;
  });

  const ranked = ranks.filter((r) => r.position !== null);
  const top10 = ranked.filter((r) => r.position! <= 10);
  const cannibalised = ranks.filter((r) => r.cannibalised);

  // Who keeps showing up across our whole keyword set — the real competitor
  // list, as opposed to the one we assumed when writing the comparison pages.
  const compCounts = new Map<string, number>();
  for (const r of ranks) {
    for (const c of r.topCompetitors) {
      if (c.includes("getcertshield")) continue;
      compCounts.set(c, (compCounts.get(c) ?? 0) + 1);
    }
  }

  const lines: string[] = [
    `# Rank check — ${SITE}`,
    ``,
    `_${today()} · ${terms.length} terms · ${ranked.length} ranking · ${top10.length} in top 10_`,
    ``,
    `| Term | Stage | Position | Ranking URL | Expected | AI Overview |`,
    `| --- | --- | ---: | --- | --- | --- |`,
    ...ranks.map(
      (r) =>
        `| ${r.term} | ${r.stage} | ${r.error ? "ERR" : (r.position ?? "—")} | ${r.rankingUrl?.replace(SITE, "") ?? "—"} | ${r.expectedPage} | ${r.aiOverview ? "yes" : "no"} |`,
    ),
    ``,
  ];

  if (cannibalised.length) {
    lines.push(
      `## Cannibalisation — ranking with the wrong page`,
      ``,
      `The keyword map assigns each term a target page. These rank with a different one,`,
      `which usually means two pages compete for the same intent and both underperform.`,
      ``,
      ...cannibalised.map((r) => `- **${r.term}** → ranks \`${r.rankingUrl?.replace(SITE, "")}\`, expected \`${r.expectedPage}\``),
      ``,
    );
  }

  if (compCounts.size) {
    lines.push(`## Who owns these SERPs`, ``, `| Domain | Appears in top 5 for |`, `| --- | ---: |`);
    for (const [host, n] of [...compCounts].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      lines.push(`| ${host} | ${n}/${terms.length} terms |`);
    }
    lines.push(``);
  }

  console.log(`\n   ${top10.length}/${terms.length} in top 10 · ${cannibalised.length} cannibalised`);
  console.log(`   report → ${await writeReport(`ranks-${today()}.md`, lines.join("\n"))}\n`);
}

// Top-level await is unavailable: package.json has no "type": "module", so tsx
// transforms these to CJS. `void` marks the floating promise as deliberate.
void main();
