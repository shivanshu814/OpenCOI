/**
 * Google Indexing API — with the caveat stated up front, because it is the
 * whole story.
 *
 * **Google documents this API as supporting `JobPosting` and `BroadcastEvent`
 * pages only.** A marketing page for SaaS is neither. Calls for other URL
 * types are accepted and return 200, and in practice often do trigger a crawl,
 * but Google has repeatedly said this is not a supported use and has never
 * promised it will keep working. Treat any indexing it produces as a bonus,
 * never as the plan.
 *
 * The supported free levers, in the order they actually matter for this site:
 *   1. `indexnow.ts`   — Bing/Yandex/Naver. Fully supported, no caveat, and
 *                        Bing's index is what ChatGPT browsing reads.
 *   2. Search Console  — submit the sitemap (`gsc.ts sitemaps`), then use
 *                        "Request indexing" by hand for a new page (~10/day).
 *   3. Internal links + a sitemap Google trusts — the actual long-run answer.
 *   4. This script.
 *
 * Google retired sitemap ping (`/ping?sitemap=`) in 2023, so that is not an
 * option regardless of what older SEO guides say.
 *
 * Run:  npm run seo:index-now-google
 *       npm run seo:index-now-google -- https://…/blog/new-post
 *
 * Auth needs the `indexing` scope and a principal that is a **verified owner**
 * of the Search Console property — see `google-auth.ts`.
 */

import {
  SCOPES,
  describeCredential,
  googleAccessToken,
  quotaProjectHeaders,
} from "./google-auth";
import { SITE, mapLimit, sitemapUrls } from "./lib";

const ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";
/** Google's documented ceiling for a new project. */
const DAILY_QUOTA = 200;

async function main() {
  console.log(`\n📨 Google Indexing API — ${SITE}`);
  console.log(`   auth: ${await describeCredential()}`);
  console.log(
    `   ⚠️  Officially supports JobPosting / BroadcastEvent only. For this site\n` +
      `      IndexNow (npm run seo:indexnow) and Search Console are the\n` +
      `      supported paths — this is a best-effort extra.\n`,
  );

  const token = await googleAccessToken(SCOPES.indexing);
  if (!token) {
    process.exitCode = 1;
    return;
  }

  const quotaHeaders = await quotaProjectHeaders();
  const explicit = process.argv.slice(2).filter((a) => a.startsWith("http"));
  const urls = (explicit.length ? explicit : await sitemapUrls()).slice(0, DAILY_QUOTA);

  const results = await mapLimit(urls, 3, async (url) => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        // Without this, ADC user credentials 403 with "requires a quota project".
        ...quotaHeaders,
      },
      body: JSON.stringify({ url, type: "URL_UPDATED" }),
    });
    const ok = res.ok;
    const detail = ok ? "" : `${res.status} ${(await res.text()).slice(0, 160)}`;
    console.log(
      ok
        ? `   ✅ ${url.replace(SITE, "") || "/"}`
        : `   ❌ ${url.replace(SITE, "") || "/"} — ${detail}`,
    );
    return ok;
  });

  const ok = results.filter(Boolean).length;
  console.log(`\n   ${ok}/${urls.length} accepted.`);
  if (ok < urls.length) {
    console.log(
      `   A 403 here almost always means the authenticated principal is not a\n` +
        `   verified OWNER of the Search Console property (Settings → Users and\n` +
        `   permissions → Add user → Owner). Full access is not enough.\n`,
    );
    process.exitCode = 1;
  }
}

// Top-level await is unavailable: package.json has no "type": "module", so tsx
// transforms these to CJS. `void` marks the floating promise as deliberate.
void main();
