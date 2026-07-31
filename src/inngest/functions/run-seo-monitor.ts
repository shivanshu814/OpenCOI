import { createHash } from "node:crypto";

import { inngest } from "@/inngest/client";
import { escapeHtml } from "@/lib/email/layout";
import { sendOutboundEmail } from "@/lib/email/resend";
import {
  SEO_SITE,
  type Skip,
  crawlHealth,
  fetchGoogleStatus,
  fetchSitemapUrls,
  fetchVitals,
  pushIndexNow,
} from "@/lib/seo/monitor";
import { ORG } from "@/lib/seo/site";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Automated SEO run — every 12 hours (06:00 and 18:00 UTC), plus on demand.
 *
 * The cadence is a **detector** cadence, not a submission cadence, and the
 * difference is the whole design:
 *
 *   • Crawl health every 12h is genuinely useful. A deploy that turns a page
 *     noindex, breaks a canonical or 500s a route is caught within half a day
 *     instead of at the next weekly run.
 *   • IndexNow is deliberately NOT pushed every 12h. Bing's own guidance is to
 *     submit on change; resubmitting an unchanged URL set twice a day is how a
 *     host earns a throttle. So the job fingerprints the crawled surface and
 *     pushes only when that fingerprint moves — plus a weekly floor re-push in
 *     case a submission was silently dropped. New content therefore reaches
 *     Bing within 12h of deploying, which is the "fast" the cadence is for.
 *   • Search Console data lags ~2 days on Google's side. Polling it twice a
 *     day cannot make it fresher; it is read here only so a snapshot is
 *     self-contained.
 *
 * Email follows the same restraint: it fires on the first run, when the
 * problem set **changes**, on a regression, and once a month as a liveness
 * check. A permanently-broken URL mails once, not 60 times a month — an alert
 * you learn to delete is worse than no alert.
 *
 * Every step is `step.run`, so Inngest retries them independently: a PageSpeed
 * rate-limit does not re-crawl the site or re-submit to IndexNow.
 */
export const runSeoMonitor = inngest.createFunction(
  {
    id: "run-seo-monitor",
    // One at a time: two overlapping runs would double-submit to IndexNow and
    // write two snapshots that each think they are the latest.
    concurrency: { limit: 1 },
    triggers: [{ cron: "0 6,18 * * *" }, { event: "seo/monitor.run" }],
  },
  async ({ event, step }) => {
    const skipped: Skip[] = [];
    /** `seo/monitor.run` with `{ force: true }` pushes IndexNow regardless of
     *  the fingerprint — the manual "I just published, go now" path. */
    const force = Boolean((event?.data as { force?: boolean } | undefined)?.force);

    const urls = await step.run("fetch-sitemap", async () => fetchSitemapUrls());

    const crawl = await step.run("crawl-health", async () => crawlHealth(urls));

    // Fingerprint the *surface*, not just the URL list: a rewritten title or
    // description is a change worth re-announcing, and a URL-only hash would
    // miss it.
    const contentHash = createHash("sha256")
      .update(
        crawl.pages
          .map((p) => `${p.url}|${p.status}|${p.hasTitle}|${p.hasDescription}|${p.noindex}`)
          .sort()
          .join("\n"),
      )
      .digest("hex");

    const previous = await step.run("read-previous", async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("seo_snapshots")
        .select(
          "captured_at, content_hash, problems, urls_broken, urls_noindex, perf_score, gsc_clicks, gsc_indexed, indexnow_ok",
        )
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    });

    // Push when the surface moved, when a week has passed since the last
    // successful push, on the very first run, or when explicitly forced.
    const lastPushAt = previous?.captured_at ? new Date(previous.captured_at as string).getTime() : 0;
    const weekStale = Date.now() - lastPushAt > 7 * 86_400_000;
    const changed = previous?.content_hash !== contentHash;
    const shouldPush = force || previous === null || changed || weekStale || previous.indexnow_ok === false;

    const indexnow = shouldPush
      ? await step.run("push-indexnow", async () => pushIndexNow(urls))
      : { ok: true, submitted: 0, reason: undefined as string | undefined };

    if (shouldPush && !indexnow.ok && indexnow.reason) {
      skipped.push({ check: "indexnow", reason: indexnow.reason });
    }

    const vitals = await step.run("fetch-vitals", async () => fetchVitals(urls));
    if (vitals.skip) skipped.push(vitals.skip);

    // Google, last: it resubmits the sitemap, reads 28-day totals, inspects
    // every URL's index status, and pings the Indexing API for the ones still
    // not indexed. Runs after the crawl so it inspects the URL set we just
    // confirmed is live, rather than one the sitemap merely claims.
    const gsc = await step.run("fetch-google", async () => fetchGoogleStatus(urls));
    if (gsc.skip) skipped.push(gsc.skip);

    // ── What is wrong right now ────────────────────────────────────────────
    const problems: string[] = [];
    if (crawl.broken > 0) problems.push(`${crawl.broken} sitemap URL(s) do not answer 200`);
    if (crawl.noindex > 0) problems.push(`${crawl.noindex} page(s) are noindex and cannot rank`);
    if (crawl.missingTitle > 0) problems.push(`${crawl.missingTitle} page(s) have no <title>`);
    if (crawl.missingDescription > 0) problems.push(`${crawl.missingDescription} page(s) have no meta description`);
    if (crawl.missingCanonical > 0) problems.push(`${crawl.missingCanonical} page(s) have no canonical`);
    if (shouldPush && !indexnow.ok) problems.push(`IndexNow push failed — ${indexnow.reason ?? "unknown"}`);
    problems.sort();

    const regressions: string[] = [];
    if (previous) {
      if (crawl.broken > (previous.urls_broken ?? 0)) {
        regressions.push(`broken URLs ${previous.urls_broken} → ${crawl.broken}`);
      }
      if (crawl.noindex > (previous.urls_noindex ?? 0)) {
        regressions.push(`noindex pages ${previous.urls_noindex} → ${crawl.noindex}`);
      }
      // Lighthouse swings ~10 points run to run on shared infrastructure;
      // anything past that is a real change, not noise.
      if (vitals.perfScore != null && previous.perf_score != null && vitals.perfScore < previous.perf_score - 10) {
        regressions.push(`performance ${previous.perf_score} → ${vitals.perfScore}`);
      }
      if (gsc.clicks != null && previous.gsc_clicks != null && gsc.clicks < previous.gsc_clicks * 0.7) {
        regressions.push(`Search Console clicks ${previous.gsc_clicks} → ${gsc.clicks}`);
      }
      // Pages falling OUT of the index is the loudest possible signal that a
      // deploy broke something — louder than any on-page check.
      if (gsc.indexed != null && previous.gsc_indexed != null && gsc.indexed < previous.gsc_indexed) {
        regressions.push(`indexed pages ${previous.gsc_indexed} → ${gsc.indexed}`);
      }
    }

    const snapshotId = await step.run("persist-snapshot", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("seo_snapshots")
        .insert({
          site_url: SEO_SITE,
          urls_total: crawl.total,
          urls_ok: crawl.ok,
          urls_broken: crawl.broken,
          urls_noindex: crawl.noindex,
          missing_title: crawl.missingTitle,
          missing_description: crawl.missingDescription,
          missing_canonical: crawl.missingCanonical,
          perf_score: vitals.perfScore,
          seo_score: vitals.seoScore,
          lcp_ms: vitals.lcpMs,
          cls: vitals.cls,
          gsc_clicks: gsc.clicks,
          gsc_impressions: gsc.impressions,
          gsc_avg_position: gsc.avgPosition,
          gsc_indexed: gsc.indexed,
          indexnow_submitted: indexnow.submitted,
          indexnow_ok: indexnow.ok,
          content_hash: contentHash,
          problems,
          skipped,
          detail: { pages: crawl.pages, pushedIndexNow: shouldPush },
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    });

    // ── Email only when it carries information ─────────────────────────────
    const previousProblems = Array.isArray(previous?.problems)
      ? (previous.problems as string[])
      : [];
    const problemsChanged =
      problems.length !== previousProblems.length ||
      problems.some((p, i) => p !== previousProblems[i]);

    const isFirstRun = previous === null;
    const monthlyLiveness =
      previous != null &&
      Date.now() - new Date(previous.captured_at as string).getTime() > 27 * 86_400_000;

    const shouldEmail =
      isFirstRun ||
      regressions.length > 0 ||
      (problems.length > 0 && problemsChanged) ||
      monthlyLiveness;

    if (shouldEmail) {
      await step.run("send-digest", async () => {
        const to = process.env.SEO_ALERT_EMAIL?.trim() || ORG.email;
        const host = new URL(SEO_SITE).host;
        const subject = problems.length
          ? `SEO: ${problems.length} issue${problems.length === 1 ? "" : "s"} on ${host}`
          : `SEO — ${host} clean`;

        const lines = [
          `Site: ${SEO_SITE}`,
          ``,
          `Indexability`,
          `  ${crawl.ok}/${crawl.total} URLs answer 200`,
          `  ${crawl.noindex} noindex · ${crawl.missingTitle} no title · ${crawl.missingDescription} no description · ${crawl.missingCanonical} no canonical`,
          ``,
          `IndexNow`,
          shouldPush
            ? `  ${indexnow.ok ? `${indexnow.submitted} URLs submitted` : `FAILED — ${indexnow.reason}`}`
            : `  skipped — content unchanged since the last push (submitting an`,
          shouldPush ? `` : `  unchanged set every 12h is what gets a host throttled)`,
          ``,
          `Core Web Vitals (median of ${vitals.sampled} sampled URLs, mobile)`,
          vitals.perfScore == null
            ? `  not measured this run`
            : `  performance ${vitals.perfScore} · SEO ${vitals.seoScore} · LCP ${vitals.lcpMs}ms · CLS ${vitals.cls}`,
          ``,
          `Google`,
          gsc.clicks == null
            ? `  not wired`
            : [
                `  indexed ${gsc.indexed}/${crawl.total} URLs`,
                `  ${gsc.clicks} clicks · ${gsc.impressions} impressions · avg position ${gsc.avgPosition ?? "—"} (28d, lags ~2 days)`,
                `  sitemap resubmitted: ${gsc.sitemapSubmitted ? "yes" : "no"}`,
                `  Indexing API pinged ${gsc.indexingPinged} not-yet-indexed URL(s)`,
              ].join("\n"),
          ``,
        ];

        if (problems.length) lines.push(`Problems`, ...problems.map((p) => `  - ${p}`), ``);
        if (regressions.length) lines.push(`Worse than last run`, ...regressions.map((r) => `  - ${r}`), ``);
        if (skipped.length) {
          lines.push(
            `Not measured (an unwired key and a real regression look identical in`,
            `the numbers — this is how to tell them apart)`,
            ...skipped.map((s) => `  - ${s.check}: ${s.reason}`),
            ``,
          );
        }
        if (crawl.broken > 0) {
          lines.push(
            `Broken URLs`,
            ...crawl.pages.filter((p) => p.status !== 200).map((p) => `  ${p.status || "ERR"}  ${p.url}`),
            ``,
          );
        }

        lines.push(`Snapshot ${snapshotId} · runs every 12h`);

        const text = lines.join("\n");
        // Internal ops alert to the founder, not a customer surface — a
        // monospace block preserves the column alignment that makes the
        // numbers scannable, and the branded template would only add chrome.
        const result = await sendOutboundEmail({
          to,
          subject,
          text,
          html: `<pre style="font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
        });
        return { sent: result.ok, to };
      });
    }

    return {
      snapshotId,
      urls: crawl.total,
      broken: crawl.broken,
      noindex: crawl.noindex,
      contentChanged: changed,
      indexnowPushed: shouldPush,
      indexnowOk: indexnow.ok,
      perfScore: vitals.perfScore,
      gscIndexed: gsc.indexed,
      gscClicks: gsc.clicks,
      indexingPinged: gsc.indexingPinged,
      skipped: skipped.length,
      emailed: shouldEmail,
    };
  },
);
