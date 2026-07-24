/**
 * Free-tier intake cap. Non-paying orgs can submit a limited number of COIs for
 * audit per day; paying orgs are uncapped and their documents jump the internal
 * review queue. This keeps the "try a free audit" funnel from being abused
 * without building a second product.
 */

export const FREE_DAILY_AUDIT_CAP = 10;

/** SLA copy shown to free-tier submitters (spec §0 — 24h onboarding/turnaround). */
export const FREE_AUDIT_SLA_NOTE =
  "Free audits are reviewed within 24 hours. Paid plans are uncapped and reviewed first.";

/**
 * Paid = the org has an active-ish subscription. Paddle sets `plan` only while a
 * subscription is active/trialing/past_due (see paddle-server), and clears it
 * otherwise, so `plan` presence is the reliable signal. `subscription_status`
 * is accepted as a fallback for robustness.
 */
export function isPaidPlan(
  plan: string | null | undefined,
  subscriptionStatus?: string | null,
): boolean {
  if (plan) return true;
  return (
    subscriptionStatus === "active" ||
    subscriptionStatus === "trialing" ||
    subscriptionStatus === "past_due"
  );
}

/** Start of the current UTC day as an ISO string (for a per-day count window). */
export function startOfUtcDay(now: Date): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  return d.toISOString();
}

export type DailyCapCheck = {
  allowed: boolean;
  used: number;
  cap: number;
  remaining: number;
};

/** Pure decision helper — given today's count, decide if another submission fits. */
export function checkDailyCap(
  usedToday: number,
  cap: number = FREE_DAILY_AUDIT_CAP,
): DailyCapCheck {
  const used = Math.max(0, usedToday);
  const remaining = Math.max(0, cap - used);
  return { allowed: used < cap, used, cap, remaining };
}
