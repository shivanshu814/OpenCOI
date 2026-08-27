/**
 * Intercom Messenger — config and identity verification.
 *
 * Two decisions encoded here, both deliberate:
 *
 * 1. **App-only.** The messenger boots inside `/app` for signed-in customers
 *    and nowhere else. Intercom's widget is a few hundred KB of third-party
 *    JavaScript; putting it on the marketing pages would undo the 2026-08-01
 *    JS diet (which existed to fix PSI's "unused JavaScript" finding) in order
 *    to offer a chat box to anonymous visitors who already have `/help`, a
 *    booking link and an email address. Support belongs where the paying
 *    customer is.
 *
 * 2. **Identity verification is mandatory in production.** Without a `user_hash`
 *    anyone can boot the messenger claiming another customer's `user_id` and
 *    read that customer's conversation history. For a product whose whole
 *    pitch is tenant isolation (docs/01 rule 3), an impersonable support
 *    channel is not acceptable. `intercomUserHash()` returns null when the
 *    secret is absent, and the component refuses to boot on a null hash — so a
 *    missing secret degrades to "no messenger", never to "insecure messenger".
 */

import { createHmac } from "node:crypto";

/**
 * Public workspace id. Not a secret — it ships in the client bundle by design
 * (same reasoning as the LaunchZone verification token in `lib/seo/site.ts`).
 * Env override exists so a workspace change is a deploy, not a code change.
 */
export const INTERCOM_APP_ID =
  process.env.NEXT_PUBLIC_INTERCOM_APP_ID?.trim() || "ugmqc8ca";

/**
 * HMAC-SHA256 of the user id under the workspace's identity-verification
 * secret, per Intercom's spec. Server-only: `INTERCOM_SECRET_KEY` must never
 * reach the client, or verification is theatre.
 *
 * Returns null when the secret is unset (local dev, previews, or prod before
 * the founder adds it) — callers must treat null as "do not boot".
 */
export function intercomUserHash(userId: string): string | null {
  const secret = process.env.INTERCOM_SECRET_KEY?.trim();
  if (!secret || !userId) return null;
  return createHmac("sha256", secret).update(userId).digest("hex");
}
