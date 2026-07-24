import * as Sentry from "@sentry/nextjs";

/**
 * Client-side observability. No-op until NEXT_PUBLIC_SENTRY_DSN is set — the SDK
 * is bundled but never initialized without a DSN, so builds stay green with no
 * secrets. Session replay is left off; flip the sample rates to enable it.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
    ),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

/** Router-navigation tracing hook (no-op when Sentry is not initialized). */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
