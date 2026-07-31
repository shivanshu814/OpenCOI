/**
 * The runtime half of the SEO toolkit — what runs inside the app on a schedule
 * instead of on a laptop.
 *
 * `scripts/seo/*` is for a human investigating something. This module is for
 * the weekly Inngest job: same checks, no filesystem, no CLI, every result
 * shaped for a database row.
 *
 * **Design rule: every step degrades to `skipped`, never to a throw.** Three of
 * the four data sources here need a credential that may not exist yet, and a
 * monitor that dies when one key is missing reports nothing about the three
 * checks that would have worked. A skipped check is recorded with its reason so
 * a null metric can be told apart from a real regression — those look identical
 * in a number and completely different in a cause.
 *
 * What needs no credential at all (works today): the crawl, IndexNow, and
 * PageSpeed Insights. That is already most of the value.
 *
 * **Every `fetch` here passes `cache: "no-store"`, and must.** Next.js patches
 * global `fetch` with its own data cache, which persists across requests and
 * across dev restarts in `.next/cache`. A monitor whose job is to answer "what
 * does the site look like RIGHT NOW" cannot read a cached answer — this was not
 * theoretical: the sitemap fetch pinned a 404 captured before the SEO layer was
 * deployed and kept replaying it long after the URL returned 200, so every run
 * failed against a site that was healthy.
 */

import { MARKETING_ORIGIN } from "@/lib/hosts";

export const SEO_SITE = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || MARKETING_ORIGIN
).replace(/\/+$/, "");

const UA = "CertShield-SEO-Monitor (+https://www.getcertshield.app)";

export type Skip = { check: string; reason: string };

export type PageHealth = {
  url: string;
  status: number;
  hasTitle: boolean;
  hasDescription: boolean;
  hasCanonical: boolean;
  noindex: boolean;
};

export type CrawlResult = {
  pages: PageHealth[];
  total: number;
  ok: number;
  broken: number;
  noindex: number;
  missingTitle: number;
  missingDescription: number;
  missingCanonical: number;
};

/** URLs from the live sitemap. Throws only if the sitemap itself is unusable —
 *  that is a genuine outage, not a missing credential, and must surface. */
export async function fetchSitemapUrls(site = SEO_SITE): Promise<string[]> {
  const res = await fetch(`${site}/sitemap.xml`, {
    headers: { "user-agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`sitemap.xml → HTTP ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (urls.length === 0) throw new Error("sitemap.xml contained no <loc> entries");
  return urls;
}

/**
 * Indexability check on every sitemap URL.
 *
 * Only the four things that decide whether a page can rank at all: does it
 * answer, does it have a title and description, does it have a canonical, and
 * is it accidentally noindex. Depth belongs in `scripts/seo/crawl.ts`; this
 * has to finish inside an Inngest step.
 */
export async function crawlHealth(urls: string[]): Promise<CrawlResult> {
  const pages = await Promise.all(
    urls.map(async (url): Promise<PageHealth> => {
      try {
        const res = await fetch(url, {
          headers: { "user-agent": UA },
          redirect: "follow",
          cache: "no-store",
        });
        if (!res.ok) {
          return { url, status: res.status, hasTitle: false, hasDescription: false, hasCanonical: false, noindex: false };
        }
        const html = await res.text();
        return {
          url,
          status: res.status,
          hasTitle: /<title[^>]*>\s*\S/i.test(html),
          hasDescription: /<meta[^>]+name=["']description["'][^>]+content=["']\s*\S/i.test(html),
          hasCanonical: /<link[^>]+rel=["']canonical["']/i.test(html),
          noindex: /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html),
        };
      } catch {
        return { url, status: 0, hasTitle: false, hasDescription: false, hasCanonical: false, noindex: false };
      }
    }),
  );

  const live = pages.filter((p) => p.status === 200);
  return {
    pages,
    total: pages.length,
    ok: live.length,
    broken: pages.filter((p) => p.status !== 200).length,
    noindex: pages.filter((p) => p.noindex).length,
    missingTitle: live.filter((p) => !p.hasTitle).length,
    missingDescription: live.filter((p) => !p.hasDescription).length,
    missingCanonical: live.filter((p) => !p.hasCanonical).length,
  };
}

/**
 * Push URLs to IndexNow (Bing, Yandex, Naver, Seznam).
 *
 * Bing's index is what ChatGPT browsing reads (docs/02 §5.8), so this is the
 * shortest path from "published" to "an answer engine can cite it". Google
 * does not participate — its side is the sitemap plus Search Console, and
 * Google retired sitemap ping in 2023.
 */
export async function pushIndexNow(
  urls: string[],
  site = SEO_SITE,
): Promise<{ ok: boolean; submitted: number; reason?: string }> {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return { ok: false, submitted: 0, reason: "INDEXNOW_KEY not set" };
  }

  const host = new URL(site).host;
  const offHost = urls.filter((u) => {
    try {
      return new URL(u).host !== host;
    } catch {
      return true;
    }
  });
  if (offHost.length) {
    // The endpoint rejects the whole batch on a host mismatch, so fail with the
    // actual cause rather than letting it come back as an opaque 403.
    return { ok: false, submitted: 0, reason: `${offHost.length} URL(s) not on ${host}` };
  }

  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation: `${site}/${key}.txt`, urlList: urls }),
  });

  if (res.status === 200 || res.status === 202) return { ok: true, submitted: urls.length };
  return {
    ok: false,
    submitted: 0,
    reason:
      res.status === 403
        ? `403 — ${site}/${key}.txt is not reachable (deploy the key file first)`
        : `HTTP ${res.status}`,
  };
}

export type VitalsResult = {
  perfScore: number | null;
  seoScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  sampled: number;
};

/**
 * Core Web Vitals via PageSpeed Insights, median across a sample.
 *
 * Median rather than mean: one slow outlier (a heavy OG image, a cold start)
 * would drag a mean far enough to look like a site-wide regression, and the
 * job would cry wolf every few weeks until it got ignored.
 *
 * Sampled rather than exhaustive because PSI is slow (~15s/URL) and the
 * keyless tier throttles; the trend is what matters, and it does not need
 * every URL.
 */
export async function fetchVitals(
  urls: string[],
  sampleSize = 5,
): Promise<VitalsResult & { skip?: Skip }> {
  const key = process.env.PAGESPEED_API_KEY?.trim();
  const sample = urls.slice(0, sampleSize);
  const perf: number[] = [];
  const seo: number[] = [];
  const lcp: number[] = [];
  const cls: number[] = [];

  for (const url of sample) {
    const params = new URLSearchParams({ url, strategy: "mobile" });
    params.append("category", "performance");
    params.append("category", "seo");
    if (key) params.set("key", key);

    try {
      const res = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`,
        { cache: "no-store" },
      );
      if (!res.ok) continue;
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- PSI's
         envelope is huge and versioned by Google; we read four leaves. */
      const json: any = await res.json();
      const lh = json.lighthouseResult;
      if (lh?.categories?.performance?.score != null) perf.push(lh.categories.performance.score * 100);
      if (lh?.categories?.seo?.score != null) seo.push(lh.categories.seo.score * 100);
      if (lh?.audits?.["largest-contentful-paint"]?.numericValue != null) {
        lcp.push(lh.audits["largest-contentful-paint"].numericValue);
      }
      if (lh?.audits?.["cumulative-layout-shift"]?.numericValue != null) {
        cls.push(lh.audits["cumulative-layout-shift"].numericValue);
      }
    } catch {
      // One URL failing is not worth losing the other four.
    }
  }

  const median = (xs: number[]): number | null => {
    if (xs.length === 0) return null;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };

  const result: VitalsResult & { skip?: Skip } = {
    perfScore: median(perf) === null ? null : Math.round(median(perf)!),
    seoScore: median(seo) === null ? null : Math.round(median(seo)!),
    lcpMs: median(lcp) === null ? null : Math.round(median(lcp)!),
    cls: median(cls),
    sampled: perf.length,
  };

  if (perf.length === 0) {
    result.skip = {
      check: "pagespeed",
      reason: key
        ? "PageSpeed API returned no usable result"
        : "PageSpeed API rate-limited (no PAGESPEED_API_KEY — free key raises quota to 25k/day)",
    };
  }
  return result;
}


// ─────────────────────────────────────────────────────────────────────────────
// Google: Search Console + Indexing API
//
// One credential, two shapes, both supported — and the second one is the
// reason any of this works in production at all:
//
//   • **service_account** — what Google's docs assume. This project CANNOT
//     mint one: `iam.disableServiceAccountKeyCreation` is enforced by default
//     and cannot be lifted, because the project has no Organization (it lives
//     under a personal Gmail, so there is no org node to grant policyAdmin on).
//
//   • **authorized_user** — the ADC refresh token created by
//     `gcloud auth application-default login`. It authorises the human who
//     already owns the Search Console property, so it needs no extra grant and
//     no org policy change. Paste that JSON into `GOOGLE_SEO_CREDENTIALS_JSON`
//     and the server can do everything the CLI can.
//
// SECURITY NOTE, because this is a real trade-off and not a free win: the ADC
// credential is a **personal** refresh token whose grant includes
// `cloud-platform`. Anything holding that env var can act broadly as that
// Google account, not just read Search Console. It sits in Vercel's encrypted
// env alongside the Supabase service-role key, so the blast radius is the same
// as that key's — but it is a person's account, not a robot's. If that is not
// acceptable, leave the var unset: every function below degrades to `skipped`
// and IndexNow still carries the indexing work.
// ─────────────────────────────────────────────────────────────────────────────

const GSC_SCOPES = [
  "https://www.googleapis.com/auth/webmasters",
  "https://www.googleapis.com/auth/indexing",
].join(" ");

type GoogleCred =
  | { type?: "service_account"; client_email: string; private_key: string }
  | {
      type: "authorized_user";
      client_id: string;
      client_secret: string;
      refresh_token: string;
      quota_project_id?: string;
    };

let tokenCache: { token: string; expiresAt: number } | null = null;

/** An access token, or a `Skip` explaining why there isn't one. */
async function googleToken(): Promise<
  { token: string; headers: Record<string, string> } | { skip: Skip }
> {
  const raw = process.env.GOOGLE_SEO_CREDENTIALS_JSON?.trim();
  if (!raw) {
    return { skip: { check: "google", reason: "GOOGLE_SEO_CREDENTIALS_JSON not set" } };
  }

  let cred: GoogleCred;
  try {
    cred = JSON.parse(raw) as GoogleCred;
  } catch {
    return { skip: { check: "google", reason: "GOOGLE_SEO_CREDENTIALS_JSON is not valid JSON" } };
  }

  // ADC user credentials carry no project, so several Google APIs 403 with
  // "requires a quota project" unless this header names one.
  const headers: Record<string, string> =
    cred.type === "authorized_user" && cred.quota_project_id
      ? { "x-goog-user-project": cred.quota_project_id }
      : {};

  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return { token: tokenCache.token, headers };
  }

  let body: URLSearchParams;
  if (cred.type === "authorized_user") {
    body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: cred.client_id,
      client_secret: cred.client_secret,
      refresh_token: cred.refresh_token,
    });
  } else {
    const { createSign } = await import("node:crypto");
    const now = Math.floor(Date.now() / 1000);
    const b64 = (v: string | Buffer) =>
      Buffer.from(v).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = b64(
      JSON.stringify({
        iss: cred.client_email,
        scope: GSC_SCOPES,
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      }),
    );
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claims}`);
    body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${b64(signer.sign(cred.private_key))}`,
    });
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    return {
      skip: { check: "google", reason: `token exchange ${res.status}: ${(await res.text()).slice(0, 120)}` },
    };
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return { token: json.access_token, headers };
}

function gscProperty(site: string): string {
  return process.env.GSC_PROPERTY?.trim() || `${site}/`;
}

export type GscResult = {
  clicks: number | null;
  impressions: number | null;
  avgPosition: number | null;
  /** How many sitemap URLs Google reports as actually indexed. */
  indexed: number | null;
  /** URLs Google has NOT indexed — the ones worth re-announcing. */
  notIndexed: string[];
  sitemapSubmitted: boolean;
  indexingPinged: number;
  skip?: Skip;
};

/**
 * Everything Google-side the job can legitimately do, in one pass:
 *
 *   1. **Resubmit the sitemap.** Cheap, idempotent, and the supported way to
 *      say "look again". Google retired the old `/ping?sitemap=` endpoint in
 *      2023, so this API call is the only remaining programmatic nudge.
 *   2. **Read 28-day totals** — clicks/impressions/position.
 *   3. **Inspect every sitemap URL** for real index status.
 *   4. **Ping the Indexing API for the ones still not indexed.**
 *
 * On (4), the honest caveat that governs how to read the result: Google
 * documents the Indexing API as supporting `JobPosting` and `BroadcastEvent`
 * pages only. Marketing pages are neither. Calls return 200 and often do
 * trigger a crawl, but Google has never promised this keeps working. It is
 * pinged **only for URLs that are not yet indexed**, so it costs nothing on a
 * healthy site and is never the thing being relied on.
 *
 * What genuinely gets a new domain indexed is trust — links and content. None
 * of the four steps above can manufacture that, and no tool can.
 */
export async function fetchGoogleStatus(
  urls: string[],
  site = SEO_SITE,
): Promise<GscResult> {
  const empty: GscResult = {
    clicks: null, impressions: null, avgPosition: null, indexed: null,
    notIndexed: [], sitemapSubmitted: false, indexingPinged: 0,
  };

  const auth = await googleToken();
  if ("skip" in auth) return { ...empty, skip: auth.skip };
  const { token, headers: extra } = auth;

  const authHeaders = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    ...extra,
  };
  const property = gscProperty(site);

  try {
    // 1. Resubmit the sitemap.
    const sitemapRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/sitemaps/${encodeURIComponent(`${site}/sitemap.xml`)}`,
      { method: "PUT", headers: authHeaders, cache: "no-store" },
    );
    const sitemapSubmitted = sitemapRes.ok;

    // 2. 28-day totals. GSC lags ~2 days; asking for today returns nothing.
    const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
    const totalsRes = await fetch(
      `https://searchconsole.googleapis.com/v1/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: authHeaders,
        cache: "no-store",
        body: JSON.stringify({ startDate: day(30), endDate: day(2), dimensions: [] }),
      },
    );
    if (!totalsRes.ok) {
      return {
        ...empty,
        sitemapSubmitted,
        skip: {
          check: "google",
          reason:
            totalsRes.status === 403
              ? `403 on ${property} — the credential is not an owner of this property`
              : `HTTP ${totalsRes.status}`,
        },
      };
    }
    const totals = (await totalsRes.json()) as {
      rows?: { clicks: number; impressions: number; position: number }[];
    };
    const row = totals.rows?.[0];

    // 3. Per-URL index status. Serial with a small gap: the Inspection API
    //    allows ~2000/day but throttles bursts, and a 429 here would poison
    //    the whole step for a metric that changes on a scale of days.
    const notIndexed: string[] = [];
    let indexed = 0;
    for (const url of urls) {
      try {
        const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
          method: "POST",
          headers: authHeaders,
          cache: "no-store",
          body: JSON.stringify({ inspectionUrl: url, siteUrl: property }),
        });
        if (!res.ok) continue;
        const json = (await res.json()) as {
          inspectionResult?: { indexStatusResult?: { verdict?: string } };
        };
        if (json.inspectionResult?.indexStatusResult?.verdict === "PASS") indexed++;
        else notIndexed.push(url);
      } catch {
        // One URL failing should not cost us the other thirty-two.
      }
    }

    // 4. Best-effort Indexing API ping, only for what is not indexed yet.
    //    Capped: Google's documented daily quota for a new project is 200.
    let indexingPinged = 0;
    for (const url of notIndexed.slice(0, 100)) {
      try {
        const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
          method: "POST",
          headers: authHeaders,
          cache: "no-store",
          body: JSON.stringify({ url, type: "URL_UPDATED" }),
        });
        if (res.ok) indexingPinged++;
      } catch {
        // Unsupported for this page type anyway — never worth failing on.
      }
    }

    return {
      clicks: row?.clicks ?? 0,
      impressions: row?.impressions ?? 0,
      avgPosition: row?.position ?? null,
      indexed,
      notIndexed,
      sitemapSubmitted,
      indexingPinged,
    };
  } catch (e) {
    return { ...empty, skip: { check: "google", reason: (e as Error).message.slice(0, 160) } };
  }
}
