/** Simple token-overlap fuzzy match for email-in vendor attachment (B1). */

const NOISE = new Set([
  "llc",
  "inc",
  "corp",
  "co",
  "company",
  "ltd",
  "the",
  "and",
  "of",
  "dba",
]);

export function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(name: string): Set<string> {
  const out = new Set<string>();
  for (const t of normalizeVendorName(name).split(" ")) {
    if (t.length < 2 || NOISE.has(t)) continue;
    out.add(t);
  }
  return out;
}

/** Dice coefficient on name tokens (0–1). */
export function nameSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) {
    const na = normalizeVendorName(a);
    const nb = normalizeVendorName(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    if (na.includes(nb) || nb.includes(na)) return 0.75;
    return 0;
  }
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return (2 * inter) / (ta.size + tb.size);
}

export type VendorMatchCandidate = {
  id: string;
  name: string;
  legal_name?: string | null;
};

export type VendorMatchResult = {
  vendorId: string;
  score: number;
  matchedName: string;
};

const DEFAULT_THRESHOLD = 0.55;

/**
 * Pick best vendor for email-in. Tries each candidate name against vendor
 * display + legal names. Returns null when below threshold.
 */
export function matchVendorByNames(
  candidates: string[],
  vendors: VendorMatchCandidate[],
  threshold = DEFAULT_THRESHOLD,
): VendorMatchResult | null {
  let best: VendorMatchResult | null = null;

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed.length < 2) continue;

    for (const v of vendors) {
      const names = [v.name, v.legal_name].filter(
        (n): n is string => Boolean(n && n.trim()),
      );
      for (const n of names) {
        const score = nameSimilarity(trimmed, n);
        if (!best || score > best.score) {
          best = { vendorId: v.id, score, matchedName: n };
        }
      }
    }
  }

  if (!best || best.score < threshold) return null;
  return best;
}

/** Pull likely company names from subject / from / body for matching. */
export function extractNameHints(input: {
  subject?: string | null;
  fromName?: string | null;
  textBody?: string | null;
}): string[] {
  const hints: string[] = [];
  const subject = input.subject?.trim();
  if (subject) {
    hints.push(subject);
    const forMatch = subject.match(
      /(?:coi|certificate|insurance|for|from|re:?)\s*[:\-]?\s*(.+)$/i,
    );
    if (forMatch?.[1]) hints.push(forMatch[1].trim());
  }
  if (input.fromName?.trim()) hints.push(input.fromName.trim());

  const body = input.textBody?.trim();
  if (body) {
    const firstLine = body.split(/\r?\n/).find((l) => l.trim().length > 2);
    if (firstLine) hints.push(firstLine.trim().slice(0, 120));
  }

  return [...new Set(hints)];
}
