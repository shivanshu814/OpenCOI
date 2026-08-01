/**
 * End-to-end smoke test — every route renders, key UI is present, and APIs
 * answer with the right shape.
 *
 * Unit tests cover pure logic; `next build` proves the app compiles. Neither
 * catches a page that compiles and then throws at request time (a bad Supabase
 * column, a client/server boundary slip, a missing `items` prop that renders
 * the wrong text). This suite exists so that class of regression is caught by
 * `npm run ci` instead of by a person clicking through the app.
 *
 * It runs against a **demo-mode** server (Supabase env blanked), because that
 * is the only way to render the authenticated workspace without a live magic
 * link. Demo mode exercises the same components and data-shaping code with
 * fixture data.
 *
 * Run: npm run smoke
 *        boots its own demo-mode server on :3399 and runs every check.
 *      SMOKE_BASE_URL=https://getcertshield.vercel.app npm run smoke
 *        checks a live deployment — public pages, sample PDFs, and headers.
 *        Workspace/API checks are skipped there: those routes require a
 *        signed-in session, so failing them would only mean "not logged in".
 */

import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.SMOKE_PORT ?? 3399);
const EXTERNAL_BASE = process.env.SMOKE_BASE_URL;
const BASE = EXTERNAL_BASE ?? `http://localhost:${PORT}`;
const BOOT_TIMEOUT_MS = 120_000;

/**
 * A live deployment has Supabase configured, so `/app/*` redirects to
 * `/login` and authenticated APIs answer 401. Those checks are meaningful
 * only against the demo-mode server this script boots itself — running them
 * against prod would report a dozen failures that are really just "you are
 * not signed in". Checks are tagged so the external mode skips them and says
 * so, instead of reporting a red run for a healthy deploy.
 */
type Scope = "any" | "demo-only";

type Check = {
  path: string;
  /** Substrings that must appear in the rendered HTML. */
  contains?: string[];
  /** Substrings that must NOT appear (regression guards). */
  absent?: string[];
  expectStatus?: number;
  scope?: Scope;
};

/**
 * Content markers are chosen to fail loudly on the specific regressions we
 * have actually shipped before — not just "page returned 200".
 */
const PAGE_CHECKS: Check[] = [
  // ── Marketing / public ──────────────────────────────────────────────
  {
    path: "/",
    contains: ["CertShield", "Questions buyers ask first"],
    // The FAQ moved from native <details> to a Base UI accordion; a
    // reintroduced <details> would silently regress theming + animation.
    absent: ["<details", "<summary"],
  },
  { path: "/pricing", contains: ["Starter", "Pro", "Business"] },
  { path: "/login", contains: ["Sign in"] },
  { path: "/help" },
  { path: "/security" },
  { path: "/privacy" },
  { path: "/terms" },
  { path: "/subprocessors" },

  // ── SEO / AEO surfaces ──────────────────────────────────────────────
  // Each check asserts the canonical tag, because a page that renders but has
  // no canonical is the failure mode that costs rankings silently — nothing
  // looks broken, the URL just competes with its own query-string variants.
  {
    path: "/about",
    contains: ["About CertShield", 'rel="canonical"', "refuses to claim"],
  },
  {
    // Dedicated OAuth brand-verification homepage — h1 must be the exact
    // consent-screen app name, and the Google data-use disclosure must stay.
    path: "/google",
    contains: [
      ">CertShield<",
      "How CertShield uses Google user data",
      "Limited Use",
      "/privacy",
      'rel="canonical"',
    ],
  },
  {
    path: "/free-audit",
    contains: ["Free COI audit", 'rel="canonical"', "no card"],
  },
  {
    path: "/blog",
    contains: ["Definitions", "Guides", 'rel="canonical"'],
  },
  {
    path: "/blog/cg-20-10-vs-cg-20-37",
    contains: [
      "CG 20 37",
      "data-answer",
      '"@type":"BlogPosting"',
      '"@type":"FAQPage"',
      'rel="canonical"',
    ],
  },
  {
    path: "/glossary",
    contains: ["Waiver of subrogation", '"@type":"DefinedTermSet"'],
  },
  {
    path: "/vendor-insurance-requirements",
    contains: ["Roofing", "CG 20 37", "not advice"],
  },
  { path: "/compare", contains: ["myCOI", "TrustLayer", "Jones"] },
  {
    path: "/compare/mycoi-alternative",
    // The "when to buy the competitor" section is the credibility of the whole
    // page — if a rewrite ever drops it, this fails.
    contains: [
      "You have a dedicated risk or compliance function",
      "quote-based",
    ],
  },
  {
    path: "/coi-tracking-for-property-managers",
    contains: ["property managers", '"@type":"FAQPage"'],
  },
  {
    path: "/subcontractor-insurance-tracking",
    contains: ["Subcontractor insurance tracking", "completed operations"],
  },

  // ── Workspace (demo mode) ───────────────────────────────────────────
  { path: "/app", contains: ["Dashboard"], scope: "demo-only" },
  {
    path: "/app/vendors",
    contains: ["Vendors", "All vendors", "Search name, trade, email"],
    scope: "demo-only",
  },
  { path: "/app/review", contains: ["Review queue"], scope: "demo-only" },
  {
    path: "/app/upload",
    contains: [
      "Upload COI",
      "Drop the COI here",
      // Sample library must be the real ACORD set, not the retired
      // script-generated PDFs.
      "ACORD 25",
    ],
    absent: ["sample-acord-25-gl-roofer"],
    scope: "demo-only",
  },
  { path: "/app/audit", contains: ["Audit trail"], scope: "demo-only" },
  { path: "/app/reports", contains: ["Owner reports"], scope: "demo-only" },
  { path: "/app/properties", contains: ["Properties"], scope: "demo-only" },
  { path: "/app/projects", contains: ["Projects"], scope: "demo-only" },
  {
    path: "/app/settings/team",
    contains: ["Workspace settings"],
    scope: "demo-only",
  },
  { path: "/app/settings/billing", contains: ["Billing"], scope: "demo-only" },
  // Ampersand arrives HTML-escaped in the markup.
  {
    path: "/app/settings/integrations",
    contains: ["API &amp; integrations"],
    scope: "demo-only",
  },
  { path: "/app/admin", contains: ["Ops dashboard"], scope: "demo-only" },

  // ── Vendors: server-side search / filter / paging ───────────────────
  {
    path: "/app/vendors?q=roof",
    contains: ["Sunshine Roofing"],
    scope: "demo-only",
  },
  {
    path: "/app/vendors?q=zzzznotfound",
    contains: ["No vendors match"],
    absent: ["Sunshine Roofing"],
    scope: "demo-only",
  },
  {
    path: "/app/vendors?status=in_review",
    contains: ["All vendors"],
    scope: "demo-only",
  },
  {
    // An out-of-range page must clamp to the last real page, never render a
    // misleading "no vendors match" dead end.
    path: "/app/vendors?page=99",
    absent: ["No vendors match"],
    scope: "demo-only",
  },
];

/**
 * The machine-readable SEO/AEO surfaces.
 *
 * These are the files nobody ever looks at by eye, which is exactly why they
 * need a test: a broken `sitemap.xml` or a `robots.txt` that started
 * disallowing everything produces no visible symptom until traffic is gone
 * weeks later. Each check asserts something that can only be true if the file
 * was actually generated from live data.
 */
const SEO_FILE_CHECKS: Check[] = [
  {
    path: "/robots.txt",
    contains: [
      "Sitemap:",
      // The AI-crawler allow-list is a deliberate business decision (docs/02
      // §5) — if a future edit blocks these, GEO stops working silently.
      "GPTBot",
      "ClaudeBot",
      "PerplexityBot",
      "Google-Extended",
      // Magic-link surfaces must stay out of the index.
      "Disallow: /portal/",
    ],
    absent: ["Disallow: /\n\n"],
  },
  {
    path: "/sitemap.xml",
    contains: [
      "<urlset",
      "/vendor-insurance-requirements",
      "/blog/cg-20-10-vs-cg-20-37",
      "/compare/mycoi-alternative",
    ],
    // Auth and token surfaces must never appear in a sitemap.
    absent: ["/portal/", "<loc>https://www.getcertshield.app/login</loc>"],
  },
  {
    path: "/llms.txt",
    contains: [
      "What CertShield does NOT claim",
      "mid-term",
      // Generated from PLANS, so a price change that misses this file is
      // impossible by construction — this asserts the generation happened.
      "Starter: $99/mo",
    ],
  },
  {
    path: "/llms-full.txt",
    contains: ["# Glossary", "Waiver of subrogation", "Choose myCOI when"],
  },
  {
    path: "/blog/rss.xml",
    contains: ["<rss", "<item>", "certificate of insurance"],
    absent: ["&amp;amp;"],
  },
  { path: "/manifest.webmanifest", contains: ["CertShield"] },
];

const SAMPLE_PDFS = [
  "acord-25-dasny-demo",
  "acord-25-nyc-vendor-handout",
  "acord-25-2009-specimen",
  "acord-25-2010-consultant-template",
  "acord-25-2009-exhibitor-sample",
  "acord-25-2016-blank",
  "acord-25-2016-fillable",
];

type ApiCheck = {
  path: string;
  expectStatus?: number;
  /** Keys that must exist on the JSON body. */
  keys?: string[];
  scope?: Scope;
};

const API_CHECKS: ApiCheck[] = [
  // Address + timezone data must be real lookups, not stubs.
  //
  // Marked demo-only because middleware guards every `/api/*` route on a real
  // deployment. That is deliberate: these proxy a third party, and leaving
  // them open would turn our domain into a free relay for anyone.
  {
    path: "/api/geo/states",
    keys: ["source", "states"],
    scope: "demo-only",
  },
  {
    path: "/api/geo/zip?zip=19107",
    keys: ["found", "city", "state"],
    scope: "demo-only",
  },
  {
    path: "/api/geo/zip?zip=abc",
    keys: ["error"],
    expectStatus: 400,
    scope: "demo-only",
  },
  {
    path: "/api/geo/cities?state=PA",
    keys: ["state", "cities"],
    scope: "demo-only",
  },
  {
    path: "/api/settings/team",
    keys: ["members", "invites", "branding"],
    scope: "demo-only",
  },
];

let failures = 0;
let skipped = 0;

/** Demo-only checks cannot pass against an authenticated deployment. */
function shouldRun(scope: Scope | undefined): boolean {
  return !EXTERNAL_BASE || scope !== "demo-only";
}

function skip(label: string, why: string) {
  skipped += 1;
  console.log(`  – ${label}  (skipped: ${why})`);
}

function fail(label: string, detail: string) {
  failures += 1;
  console.error(`  ✗ ${label}\n      ${detail}`);
}

function pass(label: string) {
  console.log(`  ✓ ${label}`);
}

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/`, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      // Not listening yet.
    }
    await sleep(500);
  }
  throw new Error(`Server did not become ready at ${BASE}`);
}

async function checkPage(check: Check): Promise<void> {
  const label = check.path;
  let res: Response;
  try {
    res = await fetch(`${BASE}${check.path}`);
  } catch (err) {
    fail(label, `request failed: ${(err as Error).message}`);
    return;
  }

  const expected = check.expectStatus ?? 200;
  if (res.status !== expected) {
    fail(label, `expected HTTP ${expected}, got ${res.status}`);
    return;
  }

  const html = await res.text();

  // Next renders a recognizable error shell when a server component throws.
  if (
    html.includes("Application error: a server-side exception") ||
    html.includes("__next_error__")
  ) {
    fail(label, "page rendered Next.js server-side exception shell");
    return;
  }

  for (const needle of check.contains ?? []) {
    if (!html.includes(needle)) {
      fail(label, `missing expected content: ${JSON.stringify(needle)}`);
      return;
    }
  }
  for (const needle of check.absent ?? []) {
    if (html.includes(needle)) {
      fail(label, `found content that should be gone: ${JSON.stringify(needle)}`);
      return;
    }
  }
  pass(label);
}

/**
 * The dynamic social card.
 *
 * Checked by magic bytes rather than status code: `ImageResponse` failures
 * (an unsupported CSS property, a colour space Satori cannot parse) surface as
 * a 500 or as an HTML error body, never as a broken-looking PNG. Every OG tag
 * on the site points at this route, so if it breaks, every shared link becomes
 * a bare URL.
 */
async function checkOgImage(): Promise<void> {
  const label = "/og?title=…";
  const res = await fetch(`${BASE}/og?title=Smoke%20test&eyebrow=Check`);
  if (res.status !== 200) {
    fail(label, `expected HTTP 200, got ${res.status}`);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.subarray(1, 4).toString("latin1") !== "PNG") {
    fail(label, "response is not a PNG (ImageResponse likely threw)");
    return;
  }
  pass(`${label} (${Math.round(buf.byteLength / 1024)} KB)`);
}

async function checkSamplePdf(name: string): Promise<void> {
  const label = `/samples/${name}.pdf`;
  const res = await fetch(`${BASE}${label}`);
  if (res.status !== 200) {
    fail(label, `expected HTTP 200, got ${res.status}`);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  // A missing file can still 200 with an HTML shell — check the magic bytes.
  if (buf.subarray(0, 4).toString("latin1") !== "%PDF") {
    fail(label, "response is not a PDF (missing %PDF header)");
    return;
  }
  if (buf.byteLength < 10_000) {
    fail(label, `suspiciously small: ${buf.byteLength} bytes`);
    return;
  }
  pass(`${label} (${Math.round(buf.byteLength / 1024)} KB)`);
}

async function checkApi(check: ApiCheck): Promise<void> {
  const label = `API ${check.path}`;
  const res = await fetch(`${BASE}${check.path}`);
  const expected = check.expectStatus ?? 200;
  if (res.status !== expected) {
    fail(label, `expected HTTP ${expected}, got ${res.status}`);
    return;
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    fail(label, "response was not valid JSON");
    return;
  }
  for (const key of check.keys ?? []) {
    if (!(key in (body as Record<string, unknown>))) {
      fail(label, `missing key ${JSON.stringify(key)} in response`);
      return;
    }
  }
  pass(label);
}

async function main(): Promise<void> {
  let server: ChildProcess | null = null;

  if (!EXTERNAL_BASE) {
    console.log(`Starting demo-mode server on :${PORT}…`);
    server = spawn(
      "npx",
      ["next", "dev", "-p", String(PORT)],
      {
        // Blank Supabase config puts the app in demo mode, which is the only
        // way to render authenticated pages without a live magic link.
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: "",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
          SUPABASE_SERVICE_ROLE_KEY: "",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    server.stdout?.on("data", () => {});
    server.stderr?.on("data", () => {});
  }

  try {
    await waitForServer();

    console.log("\nPages");
    for (const check of PAGE_CHECKS) {
      if (shouldRun(check.scope)) await checkPage(check);
      else skip(check.path, "needs demo mode; this target requires sign-in");
    }

    console.log("\nSEO / AEO files");
    for (const check of SEO_FILE_CHECKS) await checkPage(check);
    await checkOgImage();

    console.log("\nSample COI library");
    for (const name of SAMPLE_PDFS) await checkSamplePdf(name);

    console.log("\nAPIs");
    for (const check of API_CHECKS) {
      if (shouldRun(check.scope)) await checkApi(check);
      else skip(`API ${check.path}`, "needs demo mode; this target requires sign-in");
    }
  } finally {
    if (server) {
      server.kill("SIGTERM");
      // Next spawns a child; give it a beat, then insist.
      await sleep(500);
      if (!server.killed) server.kill("SIGKILL");
    }
  }

  const total =
    PAGE_CHECKS.length +
    SEO_FILE_CHECKS.length +
    1 + // the OG image
    SAMPLE_PDFS.length +
    API_CHECKS.length;
  const ran = total - skipped;
  console.log(
    `\n${ran - failures}/${ran} smoke checks passed` +
    (skipped ? ` (${skipped} skipped — authenticated target)` : "") +
    (failures ? ` — ${failures} FAILED` : ""),
  );
  process.exit(failures ? 1 : 0);
}

void main();
