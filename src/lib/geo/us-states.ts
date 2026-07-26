/**
 * Offline fallback for the US state list, plus the normalizers that keep
 * state values canonical.
 *
 * The **live source is `/api/geo/states`**, which reads a public dataset; this
 * array only keeps address entry working when that lookup is unavailable, so
 * a customer is never blocked from saving an address by someone else's
 * downtime. `/api/geo/states` reports which path it used.
 *
 * Normalizing matters beyond tidiness: a free-text state box invites "Pa",
 * "penn", "P", and a non-canonical value later fails to match a certificate
 * holder's state during the D1 per-property wording check.
 */

export type UsState = { code: string; name: string };

export const FALLBACK_US_STATES: readonly UsState[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  // Territories — ACORD certificates do show these.
  { code: "AS", name: "American Samoa" },
  { code: "GU", name: "Guam" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "PR", name: "Puerto Rico" },
  { code: "VI", name: "U.S. Virgin Islands" },
] as const;

const BY_CODE = new Map(FALLBACK_US_STATES.map((s) => [s.code, s]));
const BY_NAME = new Map(
  FALLBACK_US_STATES.map((s) => [s.name.toLowerCase(), s]),
);

/** Select-friendly `{ value, label }` pairs from any state list. */
export function toStateItems(
  states: readonly UsState[],
): { value: string; label: string }[] {
  return states.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` }));
}

/** Accepts "pa", "PA", or "Pennsylvania" and returns the canonical code. */
export function normalizeStateCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim();
  if (!v) return null;
  const upper = v.toUpperCase();
  if (BY_CODE.has(upper)) return upper;
  return BY_NAME.get(v.toLowerCase())?.code ?? null;
}

export function stateName(code: string): string | null {
  return BY_CODE.get(code.toUpperCase())?.name ?? null;
}

/** US ZIP: five digits, optionally +4. */
export function isValidZip(input: unknown): boolean {
  return typeof input === "string" && /^\d{5}(-\d{4})?$/.test(input.trim());
}
