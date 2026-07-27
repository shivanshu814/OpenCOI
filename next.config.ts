import type { NextConfig } from "next";

/**
 * Baseline security headers (free Vercel/Next built-in).
 * Deliberately NO Content-Security-Policy: Paddle.js, Supabase, Sentry and
 * Vercel Analytics would each need allowlist entries — a wrong CSP breaks
 * checkout/auth silently. Revisit post-launch with report-only mode first.
 */
const securityHeaders = [
  // HTTPS only (Vercel always serves TLS; safe to assert for 6 months)
  {
    key: "Strict-Transport-Security",
    value: "max-age=15552000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // App + portal + report surfaces are never meant to be embedded elsewhere
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    /**
     * Client-cache lifetimes for already-visited route segments.
     *
     * Every workspace route is dynamic (auth cookies), and Next 15 changed the
     * `dynamic` default to 0 — so navigating Dashboard → Vendors → back to
     * Dashboard threw away the Dashboard segment and re-fetched it from the
     * server, replaying the route skeleton each time. That is the "why is it
     * loading again" feeling on a screen the user just looked at.
     *
     * 30s is the pre-Next-15 default and is safe here specifically BECAUSE
     * the workspace is live: `RealtimeRefresh` calls `router.refresh()` within
     * ~250ms of any row actually changing (with a 30s poll if the socket is
     * down), and every mutation refreshes too — both invalidate this cache.
     * So the window is "nothing changed", where reusing the segment is simply
     * correct. Do not raise this without keeping that invalidation intact: a
     * compliance verdict must never be shown as current once it is not.
     */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
