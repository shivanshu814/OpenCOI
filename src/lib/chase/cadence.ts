import { isIsoDate, normalizeIsoDate } from "@/lib/extraction/dates";
import type { ChaseTemplateKey } from "./types";

/** Default cadence: 30/14/7/1 days before expiry + weekly after (docs/01 C2). */
export const DEFAULT_PRE_EXPIRY_DAYS = [30, 14, 7, 1] as const;
export const DEFAULT_MAX_ATTEMPTS = 8;
export const ESCALATION_AFTER_ATTEMPTS = 3;
export const POST_EXPIRY_INTERVAL_DAYS = 7;

const PRE_EXPIRY_KEYS: Record<(typeof DEFAULT_PRE_EXPIRY_DAYS)[number], ChaseTemplateKey> =
  {
    30: "expiry_30",
    14: "expiry_14",
    7: "expiry_7",
    1: "expiry_1",
  };

export function daysUntil(dateIso: string, now = new Date()): number {
  const target = parseDateOnly(dateIso);
  const start = startOfUtcDay(now);
  const ms = target.getTime() - start.getTime();
  return Math.round(ms / 86_400_000);
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Pick the vendor-facing chase template for today given earliest policy expiry
 * and what was already sent. Returns null if nothing due yet.
 */
export function pickChaseTemplate(input: {
  reason: "expiry" | "missing_docs";
  earliestExpirationDate: string | null;
  lastTemplateKey: ChaseTemplateKey | null;
  lastSentAt: string | null;
  attempts: number;
  maxAttempts?: number;
  now?: Date;
}): ChaseTemplateKey | null {
  const max = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  if (input.attempts >= max) return null;

  if (input.reason === "missing_docs") {
    if (input.lastTemplateKey === "doc_request" && input.lastSentAt) {
      const daysSince = daysBetween(input.lastSentAt, input.now ?? new Date());
      if (daysSince < POST_EXPIRY_INTERVAL_DAYS) return null;
    }
    return "doc_request";
  }

  if (!input.earliestExpirationDate) return "doc_request";

  const days = daysUntil(input.earliestExpirationDate, input.now);

  if (days < 0) {
    if (input.lastTemplateKey === "post_expiry_weekly" && input.lastSentAt) {
      const daysSince = daysBetween(input.lastSentAt, input.now ?? new Date());
      if (daysSince < POST_EXPIRY_INTERVAL_DAYS) return null;
    }
    return "post_expiry_weekly";
  }

  // Tightest matching window among 30/14/7/1 (e.g. day 10 → expiry_14).
  const matching = DEFAULT_PRE_EXPIRY_DAYS.filter((t) => days <= t);
  if (matching.length === 0) return null;

  const threshold = Math.min(...matching) as (typeof DEFAULT_PRE_EXPIRY_DAYS)[number];
  const key = PRE_EXPIRY_KEYS[threshold];
  const lastIdx = THRESHOLD_ORDER.indexOf(input.lastTemplateKey as ChaseTemplateKey);
  const candIdx = THRESHOLD_ORDER.indexOf(key);
  // Already sent this window or a later one.
  if (lastIdx >= 0 && candIdx >= 0 && lastIdx >= candIdx) return null;
  return key;
}

const THRESHOLD_ORDER: ChaseTemplateKey[] = [
  "expiry_30",
  "expiry_14",
  "expiry_7",
  "expiry_1",
  "post_expiry_weekly",
];

function daysBetween(iso: string, now: Date): number {
  const then = new Date(iso);
  const ms = startOfUtcDay(now).getTime() - startOfUtcDay(then).getTime();
  return Math.round(ms / 86_400_000);
}

export function shouldEscalate(attempts: number): boolean {
  return attempts === ESCALATION_AFTER_ATTEMPTS;
}

/** Earliest policy expiration_date from an extraction payload. */
export function earliestExpirationFromPolicies(
  policies: { expiration_date: string | null }[] | null | undefined,
): string | null {
  if (!policies?.length) return null;
  // Normalize before sorting — stored payloads may hold US-format dates,
  // which would sort lexicographically wrong and break the cadence math.
  const dates = policies
    .map((p) => normalizeIsoDate(p.expiration_date))
    .filter((d): d is string => isIsoDate(d))
    .sort();
  return dates[0] ?? null;
}
