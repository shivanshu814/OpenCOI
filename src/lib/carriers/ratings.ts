/**
 * B6 — Carrier quality (AM Best). Static NAIC → rating map for top US carriers.
 * Refresh quarterly from AM Best / NAIC filings. Missing NAIC → review signal, not FAIL.
 */

export type AmBestRating =
  | "A++"
  | "A+"
  | "A"
  | "A-"
  | "B++"
  | "B+"
  | "B"
  | "B-"
  | "C++"
  | "C+"
  | "C"
  | "C-"
  | "D"
  | "E"
  | "F"
  | "S"
  | "NR";

const RANK: Record<AmBestRating, number> = {
  "A++": 15,
  "A+": 14,
  A: 13,
  "A-": 12,
  "B++": 11,
  "B+": 10,
  B: 9,
  "B-": 8,
  "C++": 7,
  "C+": 6,
  C: 5,
  "C-": 4,
  D: 3,
  E: 2,
  F: 1,
  S: 0,
  NR: -1,
};

/** Common P&C / WC carriers by NAIC (normalized digits only). */
export const CARRIER_RATINGS_BY_NAIC: Record<string, AmBestRating> = {
  "20281": "A++", // Federal Insurance (Chubb)
  "20397": "A++", // Vigilant (Chubb)
  "20443": "A++", // Continental Casualty (CNA)
  "19429": "A+", // Insurance Co of the State of PA (AIG)
  "23817": "A+", // National Union Fire (AIG)
  "19445": "A+", // National Union (alt)
  "25615": "A+", // Charter Oak / Travelers
  "25674": "A+", // Travelers Indemnity
  "25658": "A+", // Travelers Property Casualty
  "19038": "A+", // Travelers Casualty
  "27847": "A+", // Zurich American
  "16535": "A+", // Zurich American Insurance
  "40142": "A+", // American Zurich
  "20478": "A+", // National Fire (Hartford)
  "22357": "A+", // Hartford Fire
  "19682": "A+", // Hartford Accident
  "29459": "A+", // Twin City Fire (Hartford)
  "21482": "A+", // Employers Insurance of Wausau
  "42404": "A+", // Liberty Mutual Insurance
  "23035": "A+", // Liberty Mutual Fire
  "23043": "A+", // LM Insurance
  "33600": "A+", // LM General
  "24198": "A", // Peerless / Liberty
  "11150": "A+", // Arch Insurance
  "21113": "A+", // United States Fire
  "21105": "A+", // North River
  "35351": "A", // American Alternative
  "22667": "A+", // Ace American (Chubb)
  "20699": "A++", // Ace Property & Casualty
  "19976": "A+", // American Guarantee (Zurich)
  "20532": "A+", // Clarendon
  "37885": "A-", // Markel American
  "38970": "A-", // Essex / Markel
  "39926": "A-", // Evanston
  "25038": "A", // The Cincinnati Insurance
  "10677": "A", // Cincinnati Casualty
  "23280": "A+", // Great Northern (Travelers)
  "24740": "A+", // GEICO / Berkshire affiliates often NR for specialty — map conservatively
  "25143": "A++", // State Farm Fire and Casualty
  "25178": "A++", // State Farm General
  "25135": "A++", // State Farm Mutual Automobile
  "23787": "A+", // Nationwide Mutual Fire
  "23779": "A+", // Nationwide Mutual
  "25453": "A+", // Nationwide Property
  "21261": "A+", // Electric Insurance
  "22292": "A", // Selective Insurance
  "12572": "A-", // Scottsdale
  "19380": "A+", // American Home Assurance (AIG)
  "22713": "A", // Rockhill
  "14117": "A-", // Hiscox
  "37001": "A-", // Hiscox Insurance
  "32620": "A+", // Berkshire Hathaway Homestate
  "20044": "A+", // Berkshire Hathaway Specialty
  "21970": "A", // Employers Mutual Casualty
  "21407": "A", // EMCASCO
  "10111": "B++", // Amerisure Mutual (example mid-tier)
  "23469": "A-", // Progressive Casualty
  "24260": "A-", // Progressive Direct
};

export function normalizeNaic(naic: string | null | undefined): string | null {
  if (!naic) return null;
  const digits = naic.replace(/\D/g, "");
  return digits.length ? digits : null;
}

export function parseAmBestRating(
  raw: string | null | undefined,
): AmBestRating | null {
  if (!raw) return null;
  const t = raw.trim().toUpperCase() as AmBestRating;
  return t in RANK ? t : null;
}

export function ratingMeetsMinimum(
  actual: AmBestRating | null,
  minimum: AmBestRating,
): boolean {
  if (!actual || actual === "NR") return false;
  return RANK[actual] >= RANK[minimum];
}

export function lookupCarrierRating(
  naic: string | null | undefined,
): AmBestRating | null {
  const key = normalizeNaic(naic);
  if (!key) return null;
  return CARRIER_RATINGS_BY_NAIC[key] ?? null;
}

export type CarrierCheckResult = {
  naic: string | null;
  name: string;
  rating: AmBestRating | null;
  meets: boolean;
  unknown: boolean;
};

export function evaluateCarriersAgainstFloor(
  insurers: { name: string; naic: string | null }[],
  minimum: AmBestRating = "A-",
): {
  allMeet: boolean;
  anyUnknown: boolean;
  anyBelow: boolean;
  results: CarrierCheckResult[];
} {
  const results: CarrierCheckResult[] = insurers.map((ins) => {
    const rating = lookupCarrierRating(ins.naic);
    const unknown = rating == null;
    const meets = unknown ? false : ratingMeetsMinimum(rating, minimum);
    return {
      naic: normalizeNaic(ins.naic),
      name: ins.name,
      rating,
      meets,
      unknown,
    };
  });

  if (results.length === 0) {
    return { allMeet: false, anyUnknown: true, anyBelow: false, results };
  }

  const anyUnknown = results.some((r) => r.unknown);
  const anyBelow = results.some((r) => !r.unknown && !r.meets);
  const allMeet = results.every((r) => r.meets);

  return { allMeet, anyUnknown, anyBelow, results };
}
