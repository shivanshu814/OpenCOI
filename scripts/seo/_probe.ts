import { loadEnvConfig } from "@next/env";
import path from "node:path";
loadEnvConfig(path.join(import.meta.dirname, "..", ".."), true, { info: () => {}, error: console.error });

async function main() {
  const { fetchGoogleStatus, fetchSitemapUrls } = await import("../../src/lib/seo/monitor");
  const urls = await fetchSitemapUrls();
  const g = await fetchGoogleStatus(urls);
  if (g.skip) return console.log(`⊘ SKIPPED — ${g.skip.check}: ${g.skip.reason}`);
  console.log(`✅ Google path works`);
  console.log(`   sitemap resubmitted : ${g.sitemapSubmitted}`);
  console.log(`   indexed             : ${g.indexed}/${urls.length}`);
  console.log(`   not indexed         : ${g.notIndexed.length}`);
  console.log(`   Indexing API pinged : ${g.indexingPinged}`);
  console.log(`   clicks / impressions: ${g.clicks} / ${g.impressions}`);
  console.log(`   avg position        : ${g.avgPosition}`);
}
void main();
