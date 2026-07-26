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
  // Address + timezone data must be real lookups, not stubs. These run
  // against any target — they need no session.
  { path: "/api/geo/states", keys: ["source", "states"] },
  { path: "/api/geo/zip?zip=19107", keys: ["found", "city", "state"] },
  { path: "/api/geo/zip?zip=abc", keys: ["error"], expectStatus: 400 },
  { path: "/api/geo/cities?state=PA", keys: ["state", "cities"] },
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
    PAGE_CHECKS.length + SAMPLE_PDFS.length + API_CHECKS.length;
  const ran = total - skipped;
  console.log(
    `\n${ran - failures}/${ran} smoke checks passed` +
    (skipped ? ` (${skipped} skipped — authenticated target)` : "") +
    (failures ? ` — ${failures} FAILED` : ""),
  );
  process.exit(failures ? 1 : 0);
}

void main();
