/**
 * Backlink + citation surface — status of every free profile we should own.
 *
 * The honest framing first, because it decides how to read the output:
 *
 * **Ahrefs, Semrush and Moz do not sell backlink data on any free API tier.**
 * What is free is *Ahrefs Webmaster Tools* (AWT) — full backlink and site-audit
 * data for a domain you verify you own, browser only, no API. So this script
 * cannot discover who links to us. What it does instead is track the half of
 * link-building we control: whether each free profile in the citation list
 * exists yet.
 *
 * That is not a consolation prize. At 0 customers there is nothing to
 * discover — nobody links to us. Every early link comes from a page we go and
 * create, and docs/02 §5.5 is explicit that the listicle/directory surface
 * (G2, Capterra, AlternativeTo, SaaSHub) is what ChatGPT and Perplexity quote
 * for "best COI tracking software". Those citations matter more than raw link
 * count at this stage, and they are all free.
 *
 * Discovery, when it starts to matter (post-launch): Ahrefs Webmaster Tools +
 * Bing Webmaster Tools' backlink report, both free, both browser-only. Wire
 * neither into this script — there is no API to wire.
 *
 * Run:  npm run seo:backlinks
 */

import { CITATION_TARGETS, mapLimit, today, writeReport } from "./lib";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";

type Status = {
  name: string;
  url: string;
  kind: string;
  why: string;
  /** live = profile exists · missing = 404, go claim it · blocked = bot wall */
  state: "live" | "missing" | "blocked" | "error";
  detail: string;
};

async function check(t: (typeof CITATION_TARGETS)[number]): Promise<Status> {
  try {
    const res = await fetch(t.url, {
      headers: { "user-agent": UA, accept: "text/html" },
      redirect: "follow",
    });

    // G2 and Capterra sit behind Cloudflare bot protection and answer 403 to
    // anything without a real browser fingerprint. That is not "profile
    // missing" — it is "cannot tell from here", and reporting it as missing
    // would send us to re-claim a listing we already own.
    if (res.status === 403 || res.status === 429) {
      return { ...t, state: "blocked", detail: `HTTP ${res.status} — bot wall, check by hand` };
    }
    if (res.status === 404 || res.status === 410) {
      return { ...t, state: "missing", detail: `HTTP ${res.status} — not claimed yet` };
    }
    if (!res.ok) {
      return { ...t, state: "error", detail: `HTTP ${res.status}` };
    }

    const html = (await res.text()).toLowerCase();
    // Several directories serve a soft-404: 200 with a "not found" body.
    const softMiss =
      html.includes("page not found") ||
      html.includes("we couldn't find") ||
      html.includes("no results found");
    if (softMiss) return { ...t, state: "missing", detail: "200 but soft-404 body" };

    const linksBack = html.includes("getcertshield.app");
    return {
      ...t,
      state: "live",
      detail: linksBack ? "live · links back to the site" : "live · **no link back — add the URL to the profile**",
    };
  } catch (e) {
    return { ...t, state: "error", detail: (e as Error).message.slice(0, 80) };
  }
}

async function main() {
  console.log(`\n🔗 Citation surface — ${CITATION_TARGETS.length} free profiles\n`);

  const results = await mapLimit(CITATION_TARGETS, 4, async (t) => {
    const s = await check(t);
    const icon = { live: "✅", missing: "⬜", blocked: "🔒", error: "⚠️ " }[s.state];
    console.log(`   ${icon} ${s.name.padEnd(22)} ${s.detail}`);
    return s;
  });

  const live = results.filter((r) => r.state === "live");
  const missing = results.filter((r) => r.state === "missing");
  const blocked = results.filter((r) => r.state === "blocked");

  const lines: string[] = [
    `# Backlink & citation surface`,
    ``,
    `_${today()} · ${live.length} live · ${missing.length} to claim · ${blocked.length} unverifiable from CLI_`,
    ``,
    `> **What this does not do:** discover inbound links. Ahrefs/Semrush/Moz have no`,
    `> free API. For real backlink discovery use **Ahrefs Webmaster Tools**`,
    `> (ahrefs.com/webmaster-tools — free, full backlink data for a domain you`,
    `> verify) and **Bing Webmaster Tools → Backlinks** (free). Both browser-only.`,
    ``,
    `## To claim (${missing.length})`,
    ``,
    `Each is free and takes ~15 minutes. Use the boilerplate from`,
    `\`src/lib/seo/site.ts\` **verbatim** — entity consistency across profiles is`,
    `what makes AI engines resolve us as one company (docs/02 §5.9).`,
    ``,
  ];

  for (const r of missing) lines.push(`- [ ] **${r.name}** — ${r.url}\n      _${r.why}_`);

  if (blocked.length) {
    lines.push(``, `## Check by hand (${blocked.length})`, ``,
      `Bot-protected; a 403 here means "cannot tell", not "missing".`, ``);
    for (const r of blocked) lines.push(`- [ ] **${r.name}** — ${r.url}\n      _${r.why}_`);
  }

  if (live.length) {
    lines.push(``, `## Live (${live.length})`, ``);
    for (const r of live) lines.push(`- **${r.name}** — ${r.url} — ${r.detail}`);
  }

  lines.push(
    ``,
    `## Where inbound links will actually come from`,
    ``,
    `Ranked by what works for a 0-customer B2B SaaS, not by DA:`,
    ``,
    `1. **The Gartner trio** (Capterra → GetApp → Software Advice) — one submission,`,
    `   three listings, and they rank for the long-tail money terms directly.`,
    `2. **G2** — the single most-quoted source in AI answers for "best X software".`,
    `   10+ reviews is the threshold where the profile starts appearing in them.`,
    `3. **Comparison-page reciprocity** — AlternativeTo and SaaSHub let anyone add a`,
    `   product and link it as an alternative to myCOI / TrustLayer / Jones, which`,
    `   is exactly the query docs/02 §4 targets.`,
    `4. **Product Hunt** (docs/05, month 2) — one strong dofollow link plus the`,
    `   entity signal; the upvotes matter less than the permanent page.`,
    `5. **Original data** (docs/02 §5.4) — "we analysed 1,000 vendor COIs, X% had a`,
    `   gap". Statistics are the most-cited content type and the product generates`,
    `   them for free. This is the only item here that compounds.`,
    ``,
    `Explicitly not worth doing: paid link packages, PBNs, mass directory blasts.`,
    `They are the fastest route to a manual action on a domain with no history to`,
    `absorb it.`,
    ``,
  );

  console.log(`\n   ${missing.length} profiles still to claim`);
  console.log(`   report → ${await writeReport(`backlinks-${today()}.md`, lines.join("\n"))}\n`);
}

// Top-level await is unavailable: package.json has no "type": "module", so tsx
// transforms these to CJS. `void` marks the floating promise as deliberate.
void main();
