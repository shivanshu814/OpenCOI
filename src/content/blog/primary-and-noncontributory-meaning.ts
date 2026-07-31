import type { Post } from "@/content/blog/types";

export const post: Post = {
  slug: "primary-and-noncontributory-meaning",
  title: "Primary and Non-Contributory — What It Means",
  h1: "Primary and non-contributory, explained",
  description:
    "Primary and non-contributory decides whose insurance pays first. What the CG 20 01 endorsement does and how to verify it on a vendor's certificate.",
  answer:
    "Primary and non-contributory means the vendor's policy pays first on a covered claim and does not ask your policy to share the loss. \"Primary\" makes their coverage respond before yours; \"non-contributory\" removes their insurer's right to demand contribution from your insurer. Without it, both policies can be pulled in and your loss history takes the hit.",
  published: "2026-07-31",
  category: "Definitions",
  keywords: [
    "primary and noncontributory meaning",
    "primary and non-contributory endorsement",
    "cg 20 01",
    "whose insurance pays first",
  ],
  readingMinutes: 5,
  body: [
    { kind: "h2", text: "Why this phrase exists at all" },
    {
      kind: "p",
      text: "Standard general liability policies contain an \"other insurance\" clause saying that when more than one policy covers a loss, they share it proportionally. That default is fine between strangers and terrible for you: it means a claim caused entirely by your plumber can be split between the plumber's insurer and yours, putting a loss on your record and eroding your limits for something you did not do.",
    },
    {
      kind: "p",
      text: "Primary and non-contributory wording overrides that default. It is two promises: their policy responds first, and their insurer will not seek contribution from yours.",
    },
    { kind: "h2", text: "The two halves, separately" },
    {
      kind: "table",
      head: ["Term", "What it changes", "What happens without it"],
      rows: [
        [
          "Primary",
          "The vendor's policy responds before any policy you hold",
          "Both policies can be triggered at once and argue over order",
        ],
        [
          "Non-contributory",
          "Their insurer waives the right to demand your insurer share the loss",
          "Their insurer bills yours for a proportional share of the settlement",
        ],
      ],
    },
    {
      kind: "p",
      text: "Requiring only \"primary\" is a half-measure that shows up in a lot of older vendor agreements. It gets the order right and still lets the vendor's carrier come after yours for contribution.",
    },
    { kind: "h2", text: "How it is added to a policy" },
    {
      kind: "p",
      text: "Most commonly through ISO form CG 20 01 (Primary and Noncontributory — Other Insurance Condition), or through primary-and-non-contributory language built into a blanket additional insured endorsement. Note the dependency: this wording modifies how coverage responds for an additional insured, so it is only meaningful if additional insured status actually exists. Requiring primary and non-contributory without requiring the additional insured endorsement is asking for priority in a policy you are not on.",
    },
    {
      kind: "callout",
      title: "The order of the three requirements",
      text: "Additional insured status first (CG 20 10 and CG 20 37), then primary and non-contributory (CG 20 01 or blanket equivalent), then waiver of subrogation (CG 24 04 and the workers' compensation waiver). Each one assumes the previous one is in place. A requirements list that mentions the third without the first does not do what its author thinks it does.",
    },
    { kind: "h2", text: "Verifying it" },
    {
      kind: "p",
      text: "The ACORD 25 has no primary-and-non-contributory checkbox. It shows up, if at all, as free text in the Description of Operations box — which means it is a typed assertion with nothing behind it unless the endorsement is attached. This is the requirement most likely to be claimed on a certificate and least likely to be evidenced.",
    },
    {
      kind: "ol",
      items: [
        "Read the Description of Operations box for primary and non-contributory wording.",
        "Ask the producer for the CG 20 01 or the blanket endorsement that contains the wording.",
        "Confirm the endorsement applies to the coverage lines your contract names.",
        "File it with the certificate and the additional insured endorsements.",
      ],
    },
    {
      kind: "cta",
      text: "This is one of five endorsement-level checks that certificates routinely fail.",
      href: "/blog/what-to-check-on-a-certificate-of-insurance",
      label: "See what to check on every COI",
    },
  ],
  faq: [
    {
      q: "What does primary and non-contributory mean in simple terms?",
      a: "Their insurance pays first, and their insurer will not ask your insurer to chip in. It keeps a claim caused by your vendor off your policy.",
    },
    {
      q: "Which endorsement provides primary and non-contributory coverage?",
      a: "Most often ISO form CG 20 01, the Primary and Noncontributory Other Insurance Condition endorsement, or equivalent wording written into a blanket additional insured endorsement.",
    },
    {
      q: "Is primary and non-contributory shown on the ACORD 25?",
      a: "There is no dedicated checkbox. It appears, when it appears at all, as free text in the Description of Operations field — which is why the endorsement page is the only real verification.",
    },
    {
      q: "Do I need additional insured status for primary and non-contributory to matter?",
      a: "Yes. The wording governs how a policy responds for an insured party. If you were never added as an additional insured, there is no coverage for it to prioritize.",
    },
    {
      q: "Does primary and non-contributory increase the vendor's premium?",
      a: "It can, modestly, since it removes the carrier's ability to share a loss. Like waivers of subrogation, that small cost is the reason it sometimes gets claimed on paper and never endorsed onto the policy.",
    },
  ],
  related: [
    "waiver-of-subrogation-meaning",
    "cg-20-10-vs-cg-20-37",
    "additional-insured-vs-certificate-holder",
  ],
};
