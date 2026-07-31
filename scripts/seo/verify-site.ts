/**
 * Add + verify the Search Console **domain property** end to end.
 *
 * Replaces a five-step dashboard dance: mint a DNS token, paste a TXT record,
 * wait for propagation, click Verify, then add the property and submit the
 * sitemap. All of it is API-driven except the two steps that genuinely cannot
 * be automated from here — see "What this cannot do" below.
 *
 * A **domain** property (`sc-domain:getcertshield.app`) rather than a URL
 * prefix, deliberately: it covers `www`, `app`, the apex and both schemes in
 * one record. A URL-prefix property would treat `https://www.…` and
 * `https://getcertshield.app` as different sites and split the data, which is
 * exactly the sort of thing you only notice three months later.
 *
 * Run:  npm run seo:verify-site
 *       npm run seo:verify-site -- --token-only    # just print the TXT record
 *
 * What this cannot do, and why:
 *   • **The Google login.** `gcloud auth application-default login` opens a
 *     browser for consent. Run it once (the script prints the exact command).
 *   • **Writing the DNS record**, unless `CLOUDFLARE_API_TOKEN` is set with
 *     Zone:DNS:Edit on this zone — in which case it writes the record itself
 *     and waits for propagation. Without it, it prints the record and polls
 *     until you have pasted it in.
 */

import {
  SCOPES,
  describeCredential,
  googleAccessToken,
  quotaProjectHeaders,
} from "./google-auth";
import { SITE } from "./lib";

/** Bare registrable domain — a domain property is not scheme- or host-qualified. */
const DOMAIN = new URL(SITE).host.replace(/^www\./, "");
const PROPERTY = `sc-domain:${DOMAIN}`;

const SITEVERIFY = "https://www.googleapis.com/siteVerification/v1";
const WMX = "https://www.googleapis.com/webmasters/v3";
const CF = "https://api.cloudflare.com/client/v4";

async function api<T>(
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
  if (!res.ok) return { __error: `HTTP ${res.status}: ${(await res.text()).slice(0, 400)}` };
  return res.status === 204 ? ({} as T) : ((await res.json()) as T);
}

function isErr<T>(v: T | { __error: string }): v is { __error: string } {
  return typeof v === "object" && v !== null && "__error" in v;
}

/** Does the TXT record exist yet? Uses DNS-over-HTTPS so there is no `dig`
 *  dependency and no local resolver cache to fight. */
async function txtPresent(expected: string): Promise<boolean> {
  const res = await fetch(`https://dns.google/resolve?name=${DOMAIN}&type=TXT`, {
    headers: { accept: "application/dns-json" },
  });
  if (!res.ok) return false;
  const json = (await res.json()) as { Answer?: { data: string }[] };
  return (json.Answer ?? []).some((a) => a.data.replace(/"/g, "").trim() === expected);
}

/** Write the TXT record via Cloudflare, if we were given a token for it. */
async function writeCloudflareTxt(value: string): Promise<boolean> {
  const cfToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!cfToken) return false;

  const headers = { authorization: `Bearer ${cfToken}`, "content-type": "application/json" };

  const zoneRes = await fetch(`${CF}/zones?name=${DOMAIN}`, { headers });
  const zoneJson = (await zoneRes.json()) as { result?: { id: string }[]; errors?: unknown };
  const zoneId = zoneJson.result?.[0]?.id;
  if (!zoneId) {
    console.log(`   ⚠️  Cloudflare token set but zone ${DOMAIN} not visible to it — ${JSON.stringify(zoneJson.errors ?? {}).slice(0, 160)}`);
    return false;
  }

  const create = await fetch(`${CF}/zones/${zoneId}/dns_records`, {
    method: "POST",
    headers,
    // Google's token is a full TXT value; name is the apex.
    body: JSON.stringify({ type: "TXT", name: DOMAIN, content: value, ttl: 60 }),
  });
  if (!create.ok) {
    console.log(`   ⚠️  Cloudflare rejected the record — ${(await create.text()).slice(0, 200)}`);
    return false;
  }
  console.log(`   ✅ TXT record written via Cloudflare API`);
  return true;
}

async function main() {
  console.log(`\n🔐 Search Console domain property — ${PROPERTY}`);
  console.log(`   auth: ${await describeCredential()}\n`);

  // Verification and Search Console are separate APIs with separate scopes;
  // one ADC login covers both only if it was created with both.
  const token = await googleAccessToken(`${SCOPES.siteVerification} ${SCOPES.searchConsole}`);
  if (!token) {
    // `googleAccessToken` already printed ADC_LOGIN_COMMAND — repeating a
    // second, differently-scoped command here is how people end up logging in
    // twice and silently dropping the first grant.
    process.exitCode = 1;
    return;
  }

  // ── Already verified? ───────────────────────────────────────────────────
  const owned = await api<{ items?: { site: { identifier: string; type: string } }[] }>(
    token,
    `${SITEVERIFY}/webResource`,
  );
  const alreadyVerified =
    !isErr(owned) &&
    (owned.items ?? []).some(
      (i) => i.site.type === "INET_DOMAIN" && i.site.identifier === DOMAIN,
    );

  if (alreadyVerified) {
    console.log(`   ✅ ${DOMAIN} is already verified — skipping to property + sitemap\n`);
  } else {
    // ── 1. Mint the DNS token ─────────────────────────────────────────────
    const tokenRes = await api<{ token: string }>(token, `${SITEVERIFY}/token`, {
      method: "POST",
      body: JSON.stringify({
        site: { type: "INET_DOMAIN", identifier: DOMAIN },
        verificationMethod: "DNS_TXT",
      }),
    });
    if (isErr(tokenRes)) {
      console.log(`   ❌ could not mint a verification token — ${tokenRes.__error}`);
      process.exitCode = 1;
      return;
    }

    const txt = tokenRes.token;
    console.log(`   TXT record to publish on ${DOMAIN}:\n`);
    console.log(`     name:  ${DOMAIN}   (or "@")`);
    console.log(`     type:  TXT`);
    console.log(`     value: ${txt}\n`);

    if (process.argv.includes("--token-only")) return;

    // ── 2. Publish it, or wait for a human to ─────────────────────────────
    const wrote = await writeCloudflareTxt(txt);
    if (!wrote) {
      console.log(
        `   Add it in Cloudflare → ${DOMAIN} → DNS → Add record.\n` +
          `   (Or export CLOUDFLARE_API_TOKEN with Zone:DNS:Edit and re-run to\n` +
          `    have this write it for you.)\n`,
      );
    }

    // ── 3. Wait for propagation ───────────────────────────────────────────
    // Google's verifier does its own lookup; calling it before the record is
    // visible burns an attempt and returns a misleading "not found".
    process.stdout.write(`   waiting for DNS`);
    let seen = false;
    for (let i = 0; i < 40; i++) {
      if (await txtPresent(txt)) {
        seen = true;
        break;
      }
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 15_000));
    }
    console.log("");

    if (!seen) {
      console.log(`   ⚠️  TXT record still not visible after 10 minutes. Add it, then re-run.\n`);
      process.exitCode = 1;
      return;
    }
    console.log(`   ✅ TXT record visible`);

    // ── 4. Verify ─────────────────────────────────────────────────────────
    const verified = await api<unknown>(
      token,
      `${SITEVERIFY}/webResource?verificationMethod=DNS_TXT`,
      {
        method: "POST",
        body: JSON.stringify({ site: { type: "INET_DOMAIN", identifier: DOMAIN } }),
      },
    );
    if (isErr(verified)) {
      console.log(`   ❌ verification failed — ${verified.__error}`);
      process.exitCode = 1;
      return;
    }
    console.log(`   ✅ ${DOMAIN} verified`);
  }

  // ── 5. Add the property to Search Console ───────────────────────────────
  const added = await api<unknown>(
    token,
    `${WMX}/sites/${encodeURIComponent(PROPERTY)}`,
    { method: "PUT" },
  );
  if (isErr(added)) {
    console.log(`   ❌ could not add ${PROPERTY} — ${added.__error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`   ✅ ${PROPERTY} added to Search Console`);

  // ── 6. Submit the sitemap ───────────────────────────────────────────────
  const sitemap = `${SITE}/sitemap.xml`;
  const head = await fetch(sitemap, { method: "HEAD" });
  if (!head.ok) {
    // Submitting a 404 sitemap files a permanent error against the property.
    console.log(
      `\n   ⚠️  ${sitemap} answers ${head.status} — not submitting.\n` +
        `      Deploy the SEO layer first, then: npm run seo:gsc sitemaps\n`,
    );
  } else {
    const sub = await api<unknown>(
      token,
      `${WMX}/sites/${encodeURIComponent(PROPERTY)}/sitemaps/${encodeURIComponent(sitemap)}`,
      { method: "PUT" },
    );
    console.log(isErr(sub) ? `   ⚠️  sitemap submit failed — ${sub.__error}` : `   ✅ sitemap submitted`);
  }

  console.log(
    `\n   Next:\n` +
      `     GSC_PROPERTY=${PROPERTY} is already in .env.local\n` +
      `     npm run seo:gsc          — queries, pages, per-URL index status\n` +
      `     bing.com/webmasters      — "Import from Google Search Console", one click\n`,
  );
}

// Top-level await is unavailable: package.json has no "type": "module", so tsx
// transforms these to CJS. `void` marks the floating promise as deliberate.
void main();
