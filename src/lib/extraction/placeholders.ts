/**
 * Blank-form placeholder defence.
 *
 * Vendors routinely send the ACORD 25 *specimen* their property manager handed
 * them ("SAMPLE ONLY — HIGHLIGHTED FIELDS INDICATE NECESSARY INFORMATION")
 * instead of their own certificate. On that page the model does not see an
 * empty box: it sees the words "NAME OF VENDOR" printed where a name belongs,
 * and can return that string with high confidence.
 *
 * High confidence is exactly what makes this dangerous — the <0.90 review gate
 * (CLAUDE.md rule 1) would not catch it, and the pipeline would happily create
 * an insured named "NAME OF VENDOR" with policy number "POLICY NUMBER".
 *
 * Prompting alone cannot be trusted for this, so the values are scrubbed
 * deterministically after extraction: the field becomes null and its
 * confidence drops to 0, which forces the document into human review.
 */

/**
 * Stand-in for a required non-nullable field whose only candidate value was a
 * form placeholder. Reviewers see it verbatim in the queue, so it reads as an
 * instruction rather than a name.
 */
export const UNREADABLE_FIELD = "[unreadable — blank form]";

/**
 * Every pattern below was taken from a real specimen ACORD 25 in
 * `public/samples/` — NYC's vendor handout, DASNY's demo certificate, the
 * blank ACORD fillable, and the Parker Smith & Feek sample. They fall into
 * three families:
 *
 *   1. field labels printed where data belongs  — "NAME OF VENDOR"
 *   2. instructional stand-ins in a filled form — "Your Insurance Company"
 *   3. dummy data                               — "MM/DD/YY", "XYZ-123",
 *                                                 "CITY, STATE 00000-0000"
 *
 * Family 3 is the dangerous one: it is shaped like real data, so the model
 * returns it confidently and the value looks plausible downstream.
 */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  // 1 — form labels
  /^name of (the )?(vendor|insurance company|company|agent|producer|insured|contractor)$/,
  /^(company|agency|producer|insured|vendor|carrier|contractor|insured) name$/,
  /^insurance carrier\(?s\)? names$/,
  /^insurer\(?s\)? affording coverage$/,
  /^insurer [a-f]$/,
  /^policy ?(number|no\.?|#)$/,
  /^(effective|expiration|issue|exp|eff) ?date$/,
  /^(street )?address( line ?\d?)?$/,
  /^city ?,? ?state ?,? ?zip( code)?$/,
  /^agency (phone number|email|phone)$/,
  /^(contact|email|producer) (name|address)$/,
  /^phone( number)?$/,
  /^naic ?#?$/,
  /^certificate (number|holder|holder name)$/,
  /^description of operations$/,
  /^authorized representative$/,

  // 2 — instructional stand-ins ("Your …", "Sample …", "Demo …").
  // Deliberately enumerated rather than a blanket /^your /: a real contractor
  // can be called "Your Home Services LLC", and scrubbing a genuine insured
  // would be a worse failure than missing an unusual specimen wording.
  /^your (name|company|company name|business|business name)$/,
  /^your (insurance company|insurer|carrier)$/,
  /^your (agent|broker|agent or broker|agent\/broker representative|agency)$/,
  /^sample( only)?$/,
  /^sample certificate( prepared for)?$/,
  /^for demo purposes only$/,
  /^demo( only)?$/,
  /^(specimen|example|template)$/,

  // 3 — dummy data shaped like the real thing
  /^m{2}\/d{2}\/y{2,4}$/,
  /^0{1,2}\/0{1,2}\/0{2,4}$/,
  /^x{2,3}-\d{3}$/,
  /^(abc|xyz|aaa|bbb|ccc|lll|mck|wcb)-?\d{3}$/,
  /^city ?, ?state ?,? ?0{5}(-0{4})?$/,
  /^0{5}(-0{4})?$/,
  /^as needed$/,
  /^contract value$/,
  // Print-and-fill templates leave underscore rules where data belongs; OCR
  // returns the rule itself ("________") as the field value.
  /^[_\-.—–\s]{3,}$/,
  /^n\/?a$/,
  /^tbd$/,
  /^x+$/,
];

/** True when a value is ACORD form boilerplate rather than real data. */
export function isTemplatePlaceholder(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const normalized = value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[:.]+$/, "")
    .toLowerCase();
  if (!normalized) return false;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(normalized));
}

/**
 * Null out placeholder strings anywhere in an extraction payload and zero the
 * confidence of every object that contained one.
 *
 * Runs on the raw tool-call JSON *before* zod parsing. Appendix A marks a few
 * fields as required non-nullable strings (`insured.name`, `insurers[].name`),
 * so nulling those would fail validation and surface as "the AI returned
 * malformed extraction data" — blaming the model for our own scrubbing. Call
 * `repairRequiredStrings` on the result to convert those specific nulls into
 * an explicit unreadable marker.
 */
export function scrubTemplatePlaceholders(input: unknown): {
  value: unknown;
  /** JSON paths that were scrubbed — surfaced in low_confidence_paths. */
  scrubbed: string[];
} {
  const scrubbed: string[] = [];

  function walk(node: unknown, path: string): unknown {
    if (Array.isArray(node)) {
      return node.map((item, i) => walk(item, `${path}[${i}]`));
    }
    if (node === null || typeof node !== "object") return node;

    const obj = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    let hitInThisObject = false;

    for (const [key, raw] of Object.entries(obj)) {
      const childPath = path ? `${path}.${key}` : key;
      if (key === "confidence") {
        out[key] = raw;
        continue;
      }
      if (isTemplatePlaceholder(raw)) {
        scrubbed.push(childPath);
        hitInThisObject = true;
        out[key] = null;
        continue;
      }
      out[key] = walk(raw, childPath);
    }

    // A blank field means the whole block is untrustworthy, not just that key.
    if (hitInThisObject && typeof out.confidence === "number") {
      out.confidence = 0;
    }
    return out;
  }

  return { value: walk(input, ""), scrubbed };
}

/**
 * Turn "required string was scrubbed to null" into an explicit unreadable
 * marker, driven by the schema rather than a hand-maintained path list.
 *
 * Zod is asked to validate; every complaint of the form "expected string,
 * received null" is patched with {@link UNREADABLE_FIELD} and validation is
 * retried. Doing it from the reported issue paths means a future Appendix A
 * change that adds another required string is handled automatically, instead
 * of failing extraction until someone remembers to update a constant.
 */
export function repairRequiredStrings<T>(
  schema: { safeParse: (input: unknown) => SafeParseLike<T> },
  input: unknown,
  maxPasses = 3,
): { value: unknown; repaired: string[] } {
  // Patched in place by `setAtPath`, so the binding itself never changes.
  const value = input;
  const repaired: string[] = [];

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const result = schema.safeParse(value);
    if (result.success) break;

    const nullStringIssues = (result.error?.issues ?? []).filter(
      (issue) =>
        issue.code === "invalid_type" &&
        issue.expected === "string" &&
        issue.path.length > 0 &&
        getAtPath(value, issue.path) === null,
    );
    if (nullStringIssues.length === 0) break;

    for (const issue of nullStringIssues) {
      setAtPath(value, issue.path, UNREADABLE_FIELD);
      repaired.push(issue.path.join("."));
    }
  }

  return { value, repaired };
}

type SafeParseLike<T> = {
  success: boolean;
  data?: T;
  error?: { issues: ReadonlyArray<ZodIssueLike> };
};

type ZodIssueLike = {
  code: string;
  expected?: string;
  path: ReadonlyArray<PropertyKey>;
};

function getAtPath(root: unknown, path: ReadonlyArray<PropertyKey>): unknown {
  let node: unknown = root;
  for (const key of path) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<PropertyKey, unknown>)[key];
  }
  return node;
}

function setAtPath(
  root: unknown,
  path: ReadonlyArray<PropertyKey>,
  value: unknown,
): void {
  if (path.length === 0) return;
  let node: unknown = root;
  for (const key of path.slice(0, -1)) {
    if (node == null || typeof node !== "object") return;
    node = (node as Record<PropertyKey, unknown>)[key];
  }
  if (node == null || typeof node !== "object") return;
  (node as Record<PropertyKey, unknown>)[path[path.length - 1]!] = value;
}
