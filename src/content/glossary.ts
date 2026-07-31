/**
 * COI glossary — the definitional layer of the AEO strategy (docs/02 §4, TOFU).
 *
 * These are the terms an answer engine gets asked to define, and a short,
 * self-contained, correct definition is the format it can lift. Every entry is
 * written to stand alone: no "see above", no pronoun pointing at the heading.
 */

export type GlossaryTerm = {
  slug: string;
  term: string;
  /** One or two sentences. Must be liftable verbatim. */
  definition: string;
  /** Extra context for humans; not part of the DefinedTerm description. */
  detail?: string;
  /** Deeper reading, if a post covers it. */
  readMore?: { label: string; href: string };
  group: "The document" | "Coverage" | "Endorsements" | "Limits" | "Parties";
};

export const GLOSSARY: readonly GlossaryTerm[] = [
  {
    slug: "certificate-of-insurance",
    term: "Certificate of insurance (COI)",
    definition:
      "A one-page summary of an insurance policy showing the insured business, its carriers, policy numbers, coverage types, limits and expiration dates. It is evidence that coverage existed on the date it was issued — not the policy itself, and it grants no rights on its own.",
    readMore: {
      label: "What is a certificate of insurance?",
      href: "/blog/what-is-a-certificate-of-insurance",
    },
    group: "The document",
  },
  {
    slug: "acord-25",
    term: "ACORD 25",
    definition:
      "The standard US Certificate of Liability Insurance form. It is the form nearly every COI is issued on, covering general liability, automobile, umbrella and workers' compensation in a fixed field layout.",
    readMore: {
      label: "ACORD 25 vs 27 vs 28",
      href: "/blog/acord-25-vs-acord-27-vs-acord-28",
    },
    group: "The document",
  },
  {
    slug: "acord-27-28",
    term: "ACORD 27 / ACORD 28",
    definition:
      "Evidence of Property Insurance (27) and Evidence of Commercial Property Insurance (28). Both evidence property coverage rather than liability, and are typically requested by lenders and landlords rather than for vendor compliance.",
    group: "The document",
  },
  {
    slug: "endorsement",
    term: "Endorsement",
    definition:
      "A document that amends an insurance policy — adding a party, changing a condition, or altering coverage. Everything that actually protects a third party on a vendor's policy lives in an endorsement, not on the certificate.",
    group: "Endorsements",
  },
  {
    slug: "declarations-page",
    term: "Declarations page",
    definition:
      "The front section of an insurance policy listing the named insured, policy period, coverage parts, limits and premium. It is more authoritative than a certificate because it comes from the policy itself.",
    group: "The document",
  },
  {
    slug: "named-insured",
    term: "Named insured",
    definition:
      "The business or person the policy was written for. The named insured has full rights under the policy, including the right to make changes and to receive notice of cancellation.",
    group: "Parties",
  },
  {
    slug: "additional-insured",
    term: "Additional insured",
    definition:
      "A party added to someone else's policy by endorsement, extending that policy's defense and indemnity to them for claims arising out of the named insured's work. Additional insured status is created by the endorsement, never by the certificate.",
    readMore: {
      label: "Additional insured vs certificate holder",
      href: "/blog/additional-insured-vs-certificate-holder",
    },
    group: "Parties",
  },
  {
    slug: "certificate-holder",
    term: "Certificate holder",
    definition:
      "The party a certificate of insurance was addressed to. Certificate holder status confers no coverage and, by itself, no right to notice — it means only that a copy of the document was sent.",
    readMore: {
      label: "Additional insured vs certificate holder",
      href: "/blog/additional-insured-vs-certificate-holder",
    },
    group: "Parties",
  },
  {
    slug: "producer",
    term: "Producer",
    definition:
      "The insurance agency or broker that issued the certificate, named in the top-left box of the ACORD 25. The producer is who to contact for renewals, endorsement copies and written confirmation that a policy is in force.",
    group: "Parties",
  },
  {
    slug: "naic-number",
    term: "NAIC number",
    definition:
      "A five-digit identifier assigned to an insurance carrier by the National Association of Insurance Commissioners. It appears beside each insurer on the certificate and is the reliable way to confirm which carrier is actually behind a coverage line.",
    group: "Parties",
  },
  {
    slug: "cg-20-10",
    term: "CG 20 10",
    definition:
      "The ISO additional insured endorsement for ongoing operations — Additional Insured, Owners, Lessees or Contractors, Scheduled Person or Organization. It covers liability arising while the vendor's work is being performed.",
    readMore: { label: "CG 20 10 vs CG 20 37", href: "/blog/cg-20-10-vs-cg-20-37" },
    group: "Endorsements",
  },
  {
    slug: "cg-20-37",
    term: "CG 20 37",
    definition:
      "The ISO additional insured endorsement for completed operations. It covers liability arising after the vendor's work is finished, which is when most construction-defect and installation-failure claims actually surface.",
    readMore: { label: "CG 20 10 vs CG 20 37", href: "/blog/cg-20-10-vs-cg-20-37" },
    group: "Endorsements",
  },
  {
    slug: "waiver-of-subrogation",
    term: "Waiver of subrogation",
    definition:
      "An endorsement in which an insurer gives up its right to recover, from a named third party, money it has paid on a claim. On a vendor's policy, a waiver in your favor stops their insurer suing you after it pays.",
    readMore: {
      label: "Waiver of subrogation explained",
      href: "/blog/waiver-of-subrogation-meaning",
    },
    group: "Endorsements",
  },
  {
    slug: "subrogation",
    term: "Subrogation",
    definition:
      "An insurer's right, after paying a claim, to step into its policyholder's position and pursue whoever caused the loss. Subrogation is why a vendor's carrier can end up suing the property owner.",
    group: "Coverage",
  },
  {
    slug: "primary-and-non-contributory",
    term: "Primary and non-contributory",
    definition:
      "Wording making the vendor's policy respond first on a covered claim and removing their insurer's right to demand contribution from yours. Usually added by ISO form CG 20 01 or by blanket additional insured wording.",
    readMore: {
      label: "Primary and non-contributory, explained",
      href: "/blog/primary-and-noncontributory-meaning",
    },
    group: "Endorsements",
  },
  {
    slug: "each-occurrence-limit",
    term: "Each occurrence limit",
    definition:
      "The maximum a general liability policy will pay for any single incident. It is the number that matters most in a severe claim, and is commonly required at $1,000,000 for vendors.",
    group: "Limits",
  },
  {
    slug: "general-aggregate",
    term: "General aggregate",
    definition:
      "The maximum a general liability policy will pay across all claims in a policy year, shared by everyone the vendor works for. A $2,000,000 aggregate can already be substantially eroded before your claim arrives.",
    group: "Limits",
  },
  {
    slug: "products-completed-operations-aggregate",
    term: "Products-completed operations aggregate",
    definition:
      "A separate annual limit covering claims arising out of work the vendor has already finished. It is the money behind a completed-operations additional insured endorsement, and is a different box on the certificate from the general aggregate.",
    group: "Limits",
  },
  {
    slug: "per-project-aggregate",
    term: "Per-project aggregate",
    definition:
      "An endorsement giving each project its own aggregate limit instead of sharing one annual limit across all of a vendor's work. It is the fix for an aggregate that would otherwise be meaningless on a large job.",
    group: "Limits",
  },
  {
    slug: "combined-single-limit",
    term: "Combined single limit (CSL)",
    definition:
      "A single limit covering both bodily injury and property damage in one number rather than splitting them. Commercial auto requirements are usually written as a combined single limit, commonly $1,000,000.",
    group: "Limits",
  },
  {
    slug: "employers-liability",
    term: "Employers liability",
    definition:
      "The part of a workers' compensation policy that responds to injury claims falling outside the workers' compensation system. It is shown separately on the certificate and is commonly required at $1,000,000.",
    group: "Coverage",
  },
  {
    slug: "umbrella-excess",
    term: "Umbrella / excess liability",
    definition:
      "A policy sitting above the underlying general liability, auto and employers liability policies, paying once those limits are exhausted. Whether it extends additional insured status depends on whether it follows form.",
    group: "Coverage",
  },
  {
    slug: "admitted-vs-surplus-lines",
    term: "Admitted vs surplus lines carrier",
    definition:
      "An admitted carrier is licensed by the state and backed by that state's guaranty fund; a surplus lines (non-admitted) carrier is not. Surplus lines coverage is legitimate and common for high-hazard trades, but carries no guaranty-fund backstop.",
    group: "Parties",
  },
  {
    slug: "am-best-rating",
    term: "AM Best rating",
    definition:
      "A financial-strength grade assigned to an insurance carrier by AM Best, from A++ down. Many vendor requirement lists specify a minimum rating such as A- VII to make sure limits are backed by a carrier able to pay.",
    group: "Parties",
  },
  {
    slug: "notice-of-cancellation",
    term: "Notice of cancellation",
    definition:
      "An obligation to tell a party that a policy has been cancelled. Current ACORD 25 wording defers this to the policy provisions, and most policies only require notice to the named insured — so a certificate holder is not automatically notified.",
    group: "Coverage",
  },
  {
    slug: "hold-harmless",
    term: "Hold harmless / indemnity clause",
    definition:
      "A contract clause in which one party agrees to absorb specified liabilities of another. It is a contractual promise rather than insurance, and its enforceability varies by state under anti-indemnity statutes.",
    group: "Coverage",
  },
  {
    slug: "loss-run",
    term: "Loss run",
    definition:
      "A carrier-produced report of a policyholder's claims history over a period. Requesting loss runs is uncommon in routine vendor compliance and normal for large or high-hazard engagements.",
    group: "Coverage",
  },
];

export function glossaryByGroup(): {
  group: GlossaryTerm["group"];
  terms: readonly GlossaryTerm[];
}[] {
  const order: GlossaryTerm["group"][] = [
    "The document",
    "Parties",
    "Endorsements",
    "Limits",
    "Coverage",
  ];
  return order.map((group) => ({
    group,
    terms: GLOSSARY.filter((t) => t.group === group),
  }));
}
