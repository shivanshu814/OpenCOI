/**
 * The one place the browser Sentry SDK is allowed to enter the client bundle.
 *
 * A static `import * as Sentry from "@sentry/nextjs"` anywhere in client code
 * puts ~145 KB (gzip) of SDK into the synchronous load of every page — it was
 * the single largest script on the marketing pages and the whole of PSI's
 * "reduce unused JavaScript" finding. Behind `import()` the SDK becomes one
 * async chunk that is fetched when something actually wants it: the idle
 * callback in `instrumentation-client.ts`, or the first captured error,
 * whichever comes first.
 *
 * Everything client-side that talks to Sentry must go through this module.
 * One static import elsewhere silently re-bundles the SDK into the load path
 * and undoes the win with no visible failure.
 */

type SentryModule = typeof import("@sentry/nextjs");

let loading: Promise<SentryModule | null> | null = null;

/**
 * Fetch and initialize the SDK exactly once. Resolves `null` without a DSN so
 * builds and local dev stay green with no secrets — same contract as before,
 * except the no-DSN case now costs zero bytes instead of a dormant SDK.
 */
export function loadSentry(): Promise<SentryModule | null> {
  if (loading) return loading;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    loading = Promise.resolve(null);
    return loading;
  }

  loading = import("@sentry/nextjs")
    .then((Sentry) => {
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
      return Sentry;
    })
    // A failed chunk fetch (offline, network blip) must degrade to "no
    // telemetry this session" — a cached rejection here would instead surface
    // as unhandled-rejection noise from every later report call.
    .catch(() => null);
  return loading;
}

/**
 * Capture an exception from an error boundary. Loading on demand means the
 * first error on a cold page pays one extra chunk fetch before it reports —
 * an error boundary is already the slow path, so nobody is waiting on it.
 */
export function reportClientError(error: unknown): void {
  void loadSentry().then((sentry) => sentry?.captureException(error));
}
