/**
 * Appendix A (docs/01) binds policy dates to ISO "YYYY-MM-DD". ACORD forms
 * print US-format dates (MM/DD/YYYY) and the model sometimes echoes them
 * verbatim — normalize any recognizable date string to ISO so downstream date
 * math (requirements engine, chase cadence, reports) never misreads a real
 * date as "missing or unreadable". Unrecognized strings are returned
 * unchanged (never invent a date — the engine routes those to review).
 */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function toIso(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || y < 1900 || y > 2200) return null;
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  if (!Number.isInteger(d) || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function normalizeIsoDate(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const v = value.trim();
  if (!v) return null;

  // ISO YYYY-MM-DD (tolerate 1-digit parts and a trailing time component).
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(v);
  if (m) return toIso(Number(m[1]), Number(m[2]), Number(m[3])) ?? v;

  // US MM/DD/YYYY or MM-DD-YYYY (ACORD standard; 2-digit year → 20YY).
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(v);
  if (m) {
    const year = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return toIso(year, Number(m[1]), Number(m[2])) ?? v;
  }

  // YYYY/MM/DD
  m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(v);
  if (m) return toIso(Number(m[1]), Number(m[2]), Number(m[3])) ?? v;

  // Month-name formats: "January 1, 2027", "Jan 1 2027", "1 Jan 2027".
  m = /^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/.exec(v);
  if (m) {
    const month = MONTHS[m[1]!.slice(0, 3).toLowerCase()];
    if (month) return toIso(Number(m[3]), month, Number(m[2])) ?? v;
  }
  m = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(v);
  if (m) {
    const month = MONTHS[m[2]!.slice(0, 3).toLowerCase()];
    if (month) return toIso(Number(m[3]), month, Number(m[1])) ?? v;
  }

  // Unrecognized — keep what the model said; the engine treats a
  // non-ISO value as unreadable and routes it to internal review.
  return v;
}

/** True when a value is a strict, parseable ISO YYYY-MM-DD date. */
export function isIsoDate(value: string | null | undefined): value is string {
  return value != null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
