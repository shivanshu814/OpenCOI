/**
 * Deterministic display formatters.
 *
 * Rule: never call `toLocaleString()` / `toLocaleDateString()` without an
 * explicit locale in product UI. The browser's locale differs from the server's
 * (Vercel renders en-US, a user in India renders en-IN), so unpinned calls
 * produce a different string on server and client — a React hydration mismatch
 * and, worse, wrong-looking limits ("₹10,00,000" instead of "$1,000,000").
 *
 * Everything here is pinned to en-US because CertShield sells to US property
 * managers and all COI limits are USD.
 */

const LOCALE = "en-US";

const integerFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** 1000000 → "1,000,000". Non-finite input renders as an em dash. */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return integerFormatter.format(value);
}

/** 1000000 → "$1,000,000". Non-finite input renders as an em dash. */
export function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return usdFormatter.format(value);
}

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dayWithWeekdayFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const dayWithWeekdayAndYearFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Jan 5, 2027" */
export function formatDate(
  value: Date | string | number | null | undefined,
): string {
  const d = toDate(value);
  return d ? dayFormatter.format(d) : "—";
}

/** "Jan 5, 2027, 9:44 AM" */
export function formatDateTime(
  value: Date | string | number | null | undefined,
): string {
  const d = toDate(value);
  return d ? dateTimeFormatter.format(d) : "—";
}

/**
 * Day heading for grouped timelines: "Today" / "Yesterday" / "Mon, Jan 5"
 * (year appended once the date leaves the current year).
 */
export function formatDayHeading(
  value: Date | string | number | null | undefined,
  now: Date = new Date(),
): string {
  const d = toDate(value);
  if (!d) return "—";

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfTarget.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return d.getFullYear() === now.getFullYear()
    ? dayWithWeekdayFormatter.format(d)
    : dayWithWeekdayAndYearFormatter.format(d);
}
