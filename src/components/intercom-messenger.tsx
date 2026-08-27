"use client";

/**
 * Boots the Intercom messenger for a signed-in customer, once, after the app
 * has gone idle.
 *
 * Two modes, and the difference matters:
 *
 * - **Verified** (`identity` with a `userHash`) — signed-in customers inside
 *   /app. Intercom ties the conversation to the account across devices.
 * - **Anonymous** (`allowAnonymous`, no identity) — marketing visitors. Boots
 *   with the public app id only; Intercom keeps the thread in a cookie. This
 *   mode needs no secret, which is why it works the moment it deploys.
 *
 * Never boot an identified session without a hash: that is the impersonation
 * hole (`lib/intercom.ts`). A signed-in user with no hash falls through to
 * anonymous rather than to an unverified identified session.
 *
 * The SDK is behind a dynamic `import()` for the same reason Sentry is
 * (`lib/lazy-sentry.ts`): a static import would put the messenger loader into
 * the synchronous load of every page, competing with the content the visitor
 * actually came for. Nothing here blocks first paint.
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
  allowAnonymous = false,
  appId,
}: {
  identity?: IntercomIdentity | null;
  /** Boot for unidentified visitors (marketing pages). Needs no secret. */
  allowAnonymous?: boolean;
  /** Public app id — required when there is no identity to carry it. */
  appId?: string;
}) {
  useEffect(() => {
    const verified = identity?.userHash ? identity : null;
    const resolvedAppId = verified?.appId ?? appId;
    // Identified-without-hash degrades to anonymous, never to unverified.
    if (!resolvedAppId) return;
    if (!verified && !allowAnonymous) return;

    let cancelled = false;
    let shutdown: (() => void) | null = null;

    const boot = () => {
      void import("@intercom/messenger-js-sdk")
        .then(({ default: Intercom, shutdown: shutdownMessenger }) => {
          if (cancelled) return;
          Intercom({
            app_id: resolvedAppId,
            ...(verified
              ? {
                  user_id: verified.userId,
                  user_hash: verified.userHash,
                  ...(verified.email ? { email: verified.email } : {}),
                  ...(verified.company
                    ? {
                        company: {
                          company_id: verified.company.id,
                          name: verified.company.name,
                        },
                      }
                    : {}),
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
  }, [identity, allowAnonymous, appId]);

  return null;
}
