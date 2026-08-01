import { loadSentry } from "@/lib/lazy-sentry";

/**
 * Client-side observability. No-op until NEXT_PUBLIC_SENTRY_DSN is set.
 *
 * The SDK is deliberately NOT imported here — see `lib/lazy-sentry.ts` for the
 * bundle-size contract. This file only decides *when* it loads: once the main
 * thread goes idle, so the ~145 KB (gzip) of SDK never competes with fonts,
 * CSS and the LCP text for mobile bandwidth during the load window.
 *
 * What the deferral trades away, stated honestly:
 * - An error thrown before idle would normally be lost. Two tiny listeners
 *   buffer `error` / `unhandledrejection` events until the SDK lands, then
 *   replay them — reported late, not dropped. React render errors don't reach
 *   `window.onerror` in production; the error boundaries report those
 *   themselves through `reportClientError`.
 * - Pageload performance traces start from idle instead of navigation start,
 *   so client pageload spans are not trustworthy timing. Web-vitals telemetry
 *   comes from Vercel SpeedInsights; Sentry tracing earns its keep on the
 *   server side, which is untouched.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

type SentryModule = typeof import("@sentry/nextjs");

let sentry: SentryModule | null = null;

if (dsn && typeof window !== "undefined") {
  const buffered: unknown[] = [];
  const onError = (event: ErrorEvent) => {
    buffered.push(event.error ?? event.message);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    buffered.push(event.reason);
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  const start = () => {
    void loadSentry().then((mod) => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      if (!mod) return;
      sentry = mod;
      for (const item of buffered.splice(0)) {
        mod.captureException(item);
      }
    });
  };

  // `timeout` bounds the wait on pages that never go idle; 5s is past LCP on
  // even the throttled mobile profile PSI scores against.
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(start, { timeout: 5000 });
  } else {
    window.setTimeout(start, 3000);
  }
}

/**
 * Router-navigation tracing hook. Navigations before the SDK lands go
 * untraced — acceptable for a 10% sample whose job is spotting slow routes,
 * not counting every transition.
 */
export function onRouterTransitionStart(
  href: string,
  navigationType: string,
): void {
  sentry?.captureRouterTransitionStart(href, navigationType);
}
