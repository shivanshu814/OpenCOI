import * as Sentry from "@sentry/nextjs";

/**
 * Server + edge observability. Entirely a no-op until a DSN is set, so `npm run
 * ci` / prod builds are unaffected when Sentry is not yet configured. Set
 * NEXT_PUBLIC_SENTRY_DSN (or SENTRY_DSN) to enable error + basic performance
 * capture. Source-map upload is intentionally not wired (no build-time plugin,
 * no auth token needed).
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

export async function register() {
  if (!dsn) return;
  const runtime = process.env.NEXT_RUNTIME;
  if (runtime === "nodejs" || runtime === "edge") {
    Sentry.init({
      dsn,
      environment:
        process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      tracesSampleRate: Number(
        process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
      ),
    });
  }
}

/**
 * Next.js server-error hook. `captureRequestError` is a no-op when Sentry was
 * never initialized (no DSN), so this is safe to always export.
 */
export const onRequestError = Sentry.captureRequestError;
