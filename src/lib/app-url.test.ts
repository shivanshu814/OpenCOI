import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { appBaseUrl } from "./app-url";

const KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("appBaseUrl precedence", () => {
  it("prefers the explicitly configured canonical domain", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.certshield.com";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "web.vercel.app";
    process.env.VERCEL_URL = "web-abc123-team.vercel.app";
    assert.equal(appBaseUrl(), "https://app.certshield.com");
  });

  it("falls back to the stable production alias before the deployment host", () => {
    // VERCEL_URL is per-deployment: a portal link minted at build time would
    // point at a host that rots and is gated by deployment protection.
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "getcertshield.vercel.app";
    process.env.VERCEL_URL = "web-abc123-team.vercel.app";
    assert.equal(appBaseUrl(), "https://getcertshield.vercel.app");
  });

  it("uses the per-deployment host only when nothing stabler exists", () => {
    process.env.VERCEL_URL = "web-abc123-team.vercel.app";
    assert.equal(appBaseUrl(), "https://web-abc123-team.vercel.app");
  });

  it("falls back to production when no env var is set", () => {
    // The owned app host, not the `*.vercel.app` alias it replaced: portal and
    // magic-link URLs minted from this fallback are emailed to vendors and have
    // to keep resolving after the Vercel alias is eventually retired.
    assert.equal(appBaseUrl(), "https://app.getcertshield.app");
  });

  it("adds the scheme Vercel omits and never double-adds one", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "getcertshield.vercel.app";
    assert.equal(appBaseUrl(), "https://getcertshield.vercel.app");

    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.certshield.com";
    assert.equal(appBaseUrl(), "https://app.certshield.com");
  });

  it("strips trailing slashes so callers can append a path safely", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.certshield.com//";
    assert.equal(appBaseUrl(), "https://app.certshield.com");
  });

  it("treats a whitespace-only value as unset", () => {
    process.env.NEXT_PUBLIC_APP_URL = "   ";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "getcertshield.vercel.app";
    assert.equal(appBaseUrl(), "https://getcertshield.vercel.app");
  });
});
