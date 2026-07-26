/**
 * B6 — Carrier quality (AM Best).
 *
 * A carrier the dataset does not know is a **review signal, never a FAIL**:
 * the product must not tell a property manager their vendor's insurer is
 * unacceptable on the strength of a gap in our own data.
 */
import amBestDataset from "./am-best-ratings.json";

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

/**
 * Carrier ratings are **data, not code**.
 *
 * The table lives in `am-best-ratings.json` so refreshing it is replacing a
 * file — no code change, no deploy risk, and a licensed AM Best export can be
 * dropped in wholesale. It previously sat inline in this module, which meant
 * expanding beyond a few dozen carriers required editing TypeScript, and one
 * entry had in fact been hand-written as an "example mid-tier" guess. That is
 * the failure mode this guards against: an invented rating is not a harmless
 * placeholder, it produces a wrong FAIL against a real vendor's real carrier.
 */
type RatingsDataset = {
  source: string;
  /** ISO date the ratings were transcribed. Drives the staleness guard. */
  as_of: string;
  notes?: string;
  carriers: { naic: string; rating: string; name: string }[];
};

const DATASET = amBestDataset as RatingsDataset;

/**
 * How long a rating snapshot may be trusted to *fail* a carrier.
 *
 * AM Best downgrades happen between refreshes. Past this age the data is
 * still shown, but it stops being grounds for a FAIL — the check degrades to
 * "unknown", which routes to human review. Silently asserting a verdict from
 * a year-old snapshot is the more dangerous option.
 */
const MAX_DATASET_AGE_DAYS = 180;

export const CARRIER_RATINGS_BY_NAIC: Record<string, AmBestRating> =
  Object.fromEntries(
    DATASET.carriers
      .map((c) => [normalizeNaicInternal(c.naic), parseRating(c.rating)])
      .filter((pair): pair is [string, AmBestRating] =>
        Boolean(pair[0] && pair[1]),
      ),
  );

const CARRIER_NAMES_BY_NAIC: Record<string, string> = Object.fromEntries(
  DATASET.carriers
    .map((c) => [normalizeNaicInternal(c.naic), c.name])
    .filter((pair): pair is [string, string] => Boolean(pair[0] && pair[1])),
);

function normalizeNaicInternal(naic: string | null | undefined): string | null {
  if (!naic) return null;
  const digits = naic.replace(/\D/g, "");
  return digits.length ? digits : null;
}

function parseRating(raw: string | null | undefined): AmBestRating | null {
  if (!raw) return null;
  const t = raw.trim().toUpperCase() as AmBestRating;
  return t in RANK ? t : null;
}

/** Provenance for the admin page and for the staleness guard below. */
export function carrierDatasetInfo(now: Date = new Date()): {
  source: string;
  asOf: string;
  carrierCount: number;
  ageDays: number;
  stale: boolean;
} {
  const asOfDate = new Date(`${DATASET.as_of}T00:00:00Z`);
  const ageDays = Number.isNaN(asOfDate.getTime())
    ? Number.POSITIVE_INFINITY
    : Math.floor((now.getTime() - asOfDate.getTime()) / 86_400_000);
  return {
    source: DATASET.source,
    asOf: DATASET.as_of,
    carrierCount: Object.keys(CARRIER_RATINGS_BY_NAIC).length,
    ageDays,
    stale: ageDays > MAX_DATASET_AGE_DAYS,
  };
}

/** Carrier name as recorded in the dataset, for display next to a NAIC. */
export function carrierNameForNaic(naic: string | null | undefined): string | null {
  const key = normalizeNaicInternal(naic);
  return key ? (CARRIER_NAMES_BY_NAIC[key] ?? null) : null;
}

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
  /** Why `unknown` — lets the UI say "not in our data" vs "data is stale". */
  reason: "rated" | "not_in_dataset" | "dataset_stale";
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
  // Past the freshness window the snapshot may not reflect a downgrade, so it
  // stops being grounds for a verdict and every carrier routes to review.
  const { stale } = carrierDatasetInfo();

  const results: CarrierCheckResult[] = insurers.map((ins) => {
    const rating = lookupCarrierRating(ins.naic);
    const unknown = rating == null || stale;
    const meets = unknown ? false : ratingMeetsMinimum(rating, minimum);
    return {
      naic: normalizeNaic(ins.naic),
      name: ins.name,
      rating,
      meets,
      unknown,
      reason:
        rating == null
          ? "not_in_dataset"
          : stale
            ? "dataset_stale"
            : "rated",
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
