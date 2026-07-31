import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  _resetPaddleIpCacheForTests,
  clientIpFromHeaders,
  isPaddleWebhookIp,
} from "./paddle-ips";

// A real Paddle live IP at time of writing; used as the "should match" case.
// If Paddle rotates these, the fetch will return the current list and this
// test still passes because we stub the network below.
const REAL_PADDLE_IP = "34.237.3.244";

/**
 * Mock the /ips endpoint so tests are hermetic — hitting the real Paddle
 * network in CI would give flaky results if Paddle briefly slows down.
 */
function stubFetchWithCidrs(cidrs: string[]) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ data: { ipv4_cidrs: cidrs, ipv6_cidrs: [] } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

function stubFetchFailure() {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

describe("isPaddleWebhookIp", () => {
  afterEach(() => {
    _resetPaddleIpCacheForTests();
  });

  it("allows an IP that exactly matches a /32 in the list", async () => {
    const restore = stubFetchWithCidrs([`${REAL_PADDLE_IP}/32`, "1.2.3.4/32"]);
    const check = await isPaddleWebhookIp(REAL_PADDLE_IP);
    restore();
    assert.equal(check.allowed, true);
  });

  it("rejects an IP that isn't in the list", async () => {
    const restore = stubFetchWithCidrs([`${REAL_PADDLE_IP}/32`]);
    const check = await isPaddleWebhookIp("8.8.8.8");
    restore();
    assert.equal(check.allowed, false);
  });

  it("respects a broader CIDR like /24 (covers the whole block)", async () => {
    // Not something Paddle uses today, but the check must handle it.
    const restore = stubFetchWithCidrs(["10.0.0.0/24"]);
    const inRange = await isPaddleWebhookIp("10.0.0.99");
    const outRange = await isPaddleWebhookIp("10.0.1.99");
    restore();
    assert.equal(inRange.allowed, true);
    assert.equal(outRange.allowed, false);
  });

  it("rejects when the client IP is missing entirely", async () => {
    const restore = stubFetchWithCidrs([`${REAL_PADDLE_IP}/32`]);
    const check = await isPaddleWebhookIp(null);
    restore();
    assert.equal(check.allowed, false);
  });

  /**
   * Critical: if we can't fetch the allowlist AND we have no cached copy,
   * fail OPEN so a Paddle DNS blip doesn't drop every webhook. Signature
   * verification is still the primary defence.
   */
  it("fails open when the allowlist fetch fails and there is no cache", async () => {
    _resetPaddleIpCacheForTests();
    const restore = stubFetchFailure();
    const check = await isPaddleWebhookIp("8.8.8.8");
    restore();
    assert.equal(check.allowed, true);
    assert.match(check.reason, /fail-open/);
  });

  it("uses stale cache when a later fetch fails (fresh once, then blip)", async () => {
    const restore1 = stubFetchWithCidrs([`${REAL_PADDLE_IP}/32`]);
    await isPaddleWebhookIp(REAL_PADDLE_IP); // primes cache
    restore1();
    const restore2 = stubFetchFailure();
    // Even though fetch fails, the cache should still gate the check.
    // Note: cache TTL means this stays in-cache until 15 min elapses,
    // so the immediate re-call re-uses the cached list without fetching.
    const check = await isPaddleWebhookIp("8.8.8.8");
    restore2();
    assert.equal(check.allowed, false); // 8.8.8.8 not in cache → rejected
  });
});

describe("clientIpFromHeaders", () => {
  it("takes the FIRST entry from x-forwarded-for (true client per RFC 7239)", () => {
    const h = new Headers({
      "x-forwarded-for": "203.0.113.1, 10.0.0.1, 10.0.0.2",
    });
    assert.equal(clientIpFromHeaders(h), "203.0.113.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const h = new Headers({ "x-real-ip": "203.0.113.9" });
    assert.equal(clientIpFromHeaders(h), "203.0.113.9");
  });

  it("returns null when neither header is present", () => {
    assert.equal(clientIpFromHeaders(new Headers()), null);
  });

  it("trims whitespace inside x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "   203.0.113.1   , 10.0.0.1" });
    assert.equal(clientIpFromHeaders(h), "203.0.113.1");
  });
});
