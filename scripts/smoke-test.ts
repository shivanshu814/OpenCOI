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
 * Run: npm run smoke        (boots its own server on :3399)
 *      SMOKE_BASE_URL=… npm run smoke   (test an already-running server)
 */

import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.SMOKE_PORT ?? 3399);
const EXTERNAL_BASE = process.env.SMOKE_BASE_URL;
const BASE = EXTERNAL_BASE ?? `http://localhost:${PORT}`;
const BOOT_TIMEOUT_MS = 120_000;

type Check = {
  path: string;
  /** Substrings that must appear in the rendered HTML. */
  contains?: string[];
  /** Substrings that must NOT appear (regression guards). */
  absent?: string[];
  expectStatus?: number;
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
  { path: "/app", contains: ["Dashboard"] },
  {
    path: "/app/vendors",
    contains: ["Vendors", "All vendors", "Search name, trade, email"],
  },
  { path: "/app/review", contains: ["Review queue"] },
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
  },
  { path: "/app/audit", contains: ["Audit trail"] },
  { path: "/app/reports", contains: ["Owner reports"] },
  { path: "/app/properties", contains: ["Properties"] },
  { path: "/app/projects", contains: ["Projects"] },
  { path: "/app/settings/team", contains: ["Workspace settings"] },
  { path: "/app/settings/billing", contains: ["Billing"] },
  // Ampersand arrives HTML-escaped in the markup.
  { path: "/app/settings/integrations", contains: ["API &amp; integrations"] },
  { path: "/app/admin", contains: ["Ops dashboard"] },

  // ── Vendors: server-side search / filter / paging ───────────────────
  { path: "/app/vendors?q=roof", contains: ["Sunshine Roofing"] },
  {
    path: "/app/vendors?q=zzzznotfound",
    contains: ["No vendors match"],
    absent: ["Sunshine Roofing"],
  },
  {
    path: "/app/vendors?status=in_review",
    contains: ["All vendors"],
  },
  {
    // An out-of-range page must clamp to the last real page, never render a
    // misleading "no vendors match" dead end.
    path: "/app/vendors?page=99",
    absent: ["No vendors match"],
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
};

const API_CHECKS: ApiCheck[] = [
  { path: "/api/settings/team", keys: ["members", "invites", "branding"] },
];

let failures = 0;

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
    for (const check of PAGE_CHECKS) await checkPage(check);

    console.log("\nSample COI library");
    for (const name of SAMPLE_PDFS) await checkSamplePdf(name);

    console.log("\nAPIs");
    for (const check of API_CHECKS) await checkApi(check);
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
  console.log(
    `\n${total - failures}/${total} smoke checks passed` +
    (failures ? ` — ${failures} FAILED` : ""),
  );
  process.exit(failures ? 1 : 0);
}

void main();
