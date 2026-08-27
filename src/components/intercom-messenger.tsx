"use client";

/**
 * Boots the Intercom messenger for a signed-in customer, once, after the app
 * has gone idle.
 *
 * The SDK is behind a dynamic `import()` for the same reason Sentry is
 * (`lib/lazy-sentry.ts`): a static import would put the messenger loader into
 * the synchronous load of every `/app` page, competing with the dashboard the
 * customer actually came for. Nothing here blocks first paint.
 */

import { useEffect } from "react";

export type IntercomIdentity = {
  appId: string;
  userId: string;
  userHash: string;
  email: string | null;
  company: { id: string; name: string } | null;
};

export function IntercomMessenger({
  identity,
}: {
  identity: IntercomIdentity | null;
}) {
  useEffect(() => {
    // No identity, or no verification hash, means no messenger. See the
    // "degrades to absent, never to insecure" note in `lib/intercom.ts`.
    if (!identity?.userHash) return;

    let cancelled = false;
    let shutdown: (() => void) | null = null;

    const boot = () => {
      void import("@intercom/messenger-js-sdk")
        .then(({ default: Intercom, shutdown: shutdownMessenger }) => {
          if (cancelled) return;
          Intercom({
            app_id: identity.appId,
            user_id: identity.userId,
            user_hash: identity.userHash,
            ...(identity.email ? { email: identity.email } : {}),
            ...(identity.company
              ? {
                  company: {
                    company_id: identity.company.id,
                    name: identity.company.name,
                  },
                }
              : {}),
          });
          shutdown = shutdownMessenger;
        })
        .catch(() => {
          // A blocked or failed widget must never surface to the customer —
          // support chat is not load-bearing for any workflow in the app.
        });
    };

    // `requestIdleCallback` is still absent in Safari; the timeout is the
    // fallback, and the flag tells the cleanup which one to cancel.
    const canIdle = "requestIdleCallback" in window;
    const idle = canIdle
      ? window.requestIdleCallback(boot, { timeout: 4000 })
      : window.setTimeout(boot, 2000);

    return () => {
      cancelled = true;
      if (canIdle) {
        window.cancelIdleCallback(idle);
      } else {
        window.clearTimeout(idle);
      }
      // Clear the session on sign-out/unmount so the next user on a shared
      // browser does not inherit the previous customer's conversation.
      shutdown?.();
    };
  }, [identity]);

  return null;
}
