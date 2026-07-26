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
