/**
 * IndexNow submitter — `npm run indexnow`.
 *
 * IndexNow is a push protocol: instead of waiting for a crawler to notice a
 * change, you tell Bing (and Yandex, Naver, Seznam, and everyone else on the
 * shared endpoint) that a list of URLs changed, and they fetch within minutes
 * rather than weeks.
 *
 * Why this matters more than it sounds: ChatGPT's browsing and citation layer
 * leans on Bing's index (docs/02 §5.8). "Time until an answer engine can cite
 * our page" is the metric this optimises, and it is the difference between a
 * new comparison page being quotable this week or next month.
 *
 * Google does not participate in IndexNow — that side is covered by the
 * sitemap plus Search Console.
 *
 * Usage:
 *   npm run indexnow                 # submit every URL in the sitemap
 *   npm run indexnow -- /blog/foo    # submit specific paths only
 *
 * The key file must be reachable at https://<host>/<key>.txt containing exactly
 * the key — that is how the endpoint verifies you own the domain. It lives in
 * `public/`, so it deploys with the site and needs no route.
 */

import sitemap from "../src/app/sitemap";
import { SITE_URL, absoluteUrl } from "../src/lib/seo/site";

const KEY = process.env.INDEXNOW_KEY?.trim() ?? "42d9b7e044e0ee66c99b157bd828305b";
const ENDPOINT = "https://api.indexnow.org/IndexNow";

async function main(): Promise<void> {
  const explicit = process.argv.slice(2).filter((a) => !a.startsWith("-"));

  const urlList = explicit.length
    ? explicit.map((p) => absoluteUrl(p))
    : sitemap().map((entry) => String(entry.url));

  const host = new URL(SITE_URL).host;

  // The endpoint rejects any URL whose host differs from `host`, so a stale
  // NEXT_PUBLIC_SITE_URL would fail the whole batch rather than half of it.
  const offHost = urlList.filter((u) => new URL(u).host !== host);
  if (offHost.length) {
    console.error(
      `Refusing to submit: ${offHost.length} URL(s) are not on ${host}.\n` +
        `First offender: ${offHost[0]}\n` +
        `Check NEXT_PUBLIC_SITE_URL.`,
    );
    process.exit(1);
  }

  console.log(`Submitting ${urlList.length} URL(s) for ${host}…`);

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: KEY,
      keyLocation: `${SITE_URL}/${KEY}.txt`,
      urlList,
    }),
  });

  // 200 = accepted, 202 = accepted but key still being validated. Both are fine.
  if (response.status === 200 || response.status === 202) {
    console.log(`OK (${response.status}) — ${urlList.length} URL(s) submitted.`);
    return;
  }

  const body = await response.text().catch(() => "");
  console.error(`IndexNow returned ${response.status}. ${body}`.trim());
  console.error(
    "403 usually means the key file is not yet reachable at " +
      `${SITE_URL}/${KEY}.txt — deploy first, then re-run.`,
  );
  process.exit(1);
}

void main();
