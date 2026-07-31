import type { Post } from "@/content/blog/types";

export const post: Post = {
  slug: "cg-20-10-vs-cg-20-37",
  title: "CG 20 10 vs CG 20 37 — Ongoing vs Completed Operations",
  h1: "CG 20 10 vs CG 20 37: why you need both",
  description:
    "CG 20 10 covers you while the work happens. CG 20 37 covers you after it is finished. Requiring only one leaves the longer exposure uninsured.",
  answer:
    "CG 20 10 adds you as an additional insured for the vendor's ongoing operations — liability arising while the work is being performed. CG 20 37 adds you for completed operations — liability arising after the work is finished. They cover different time periods, so a requirement list that names only CG 20 10 leaves the post-completion years unprotected.",
  published: "2026-07-31",
  category: "Definitions",
  keywords: [
    "cg 20 10 vs cg 20 37",
    "completed operations additional insured",
    "ongoing operations endorsement",
    "cg 20 37 meaning",
  ],
  readingMinutes: 5,
  body: [
    {
      kind: "p",
      text: "These two ISO endorsement forms are the backbone of additional-insured protection in construction and property maintenance, and the difference between them is purely about when a claim arises.",
    },
    {
      kind: "table",
      head: ["", "CG 20 10", "CG 20 37"],
      rows: [
        [
          "Full name",
          "Additional Insured — Owners, Lessees or Contractors — Scheduled Person Or Organization",
          "Additional Insured — Owners, Lessees or Contractors — Completed Operations",
        ],
        [
          "Covers claims arising",
          "During the vendor's ongoing operations",
          "After the vendor's work is complete",
        ],
        [
          "Typical trigger",
          "A worker drops a ladder through a window mid-job",
          "A roof installed two years ago leaks and damages three units",
        ],
        [
          "Exposure window",
          "Weeks or months",
          "Years, limited by the policy and the statute of repose",
        ],
        [
          "Commonly required by",
          "Almost everyone",
          "Far fewer people than should",
        ],
      ],
    },
    { kind: "h2", text: "Why CG 20 10 alone is a trap" },
    {
      kind: "p",
      text: "Most losses that end up in litigation are completed-operations losses. The roofer finished in April; the ceiling fails in November of the following year. If your endorsement only reached ongoing operations, your additional-insured status expired the moment the job did — right before the period when the claim was most likely to appear.",
    },
    {
      kind: "p",
      text: "There is a second wrinkle: the 2004 and later editions of CG 20 10 removed products-completed operations from the grant of coverage that some earlier editions were read to include. That is why edition date matters and why insurance-savvy owners specify both forms by number.",
    },
    {
      kind: "callout",
      title: "The edition date is part of the requirement",
      text: "An endorsement form number without an edition date is only half a specification. CG 20 10 04 13 and CG 20 10 10 01 are different documents with different coverage triggers. Write the edition you want into your vendor agreement, and check it on receipt rather than assuming.",
    },
    { kind: "h2", text: "How to word the requirement" },
    {
      kind: "p",
      text: "A workable, plain requirement for a general contractor or property manager looks like this:",
    },
    {
      kind: "ul",
      items: [
        "Additional insured status for [exact legal entity], on a primary and non-contributory basis, for both ongoing and completed operations.",
        "Evidenced by ISO forms CG 20 10 and CG 20 37 (or equivalent blanket wording, with the blanket form supplied).",
        "Maintained for the full duration of the contract and for [3–5] years after substantial completion.",
        "Waiver of subrogation in favor of [exact legal entity] on the general liability and workers' compensation policies.",
      ],
    },
    {
      kind: "cta",
      text: "Not sure what the rest of that paragraph should say?",
      href: "/vendor-insurance-requirements",
      label: "See typical requirements by trade",
    },
    { kind: "h2", text: "Verifying it on the certificate" },
    {
      kind: "p",
      text: "On the ACORD 25 you will see the ADDL INSD box checked against the general liability line, and often a Description of Operations note. Neither identifies which form was used. To actually verify, you need the endorsement pages, and you need to check four things: the form number, the edition date, that your exact entity is scheduled (or that blanket wording reaches you), and that the policy number matches the certificate.",
    },
    {
      kind: "ol",
      items: [
        "Request the endorsement pages with the certificate, not after it.",
        "Confirm CG 20 10 and CG 20 37 are both present, or one blanket form that grants both.",
        "Check the edition dates against your requirement.",
        "Confirm the scheduled entity name matches your legal name exactly.",
        "File the endorsements with the certificate — together, they are the evidence.",
      ],
    },
    { kind: "h2", text: "Completed operations and the certificate limits box" },
    {
      kind: "p",
      text: "Separately from the endorsement, look at the Products-Completed Operations Aggregate limit on the certificate. A vendor can hold a valid CG 20 37 while carrying a products-completed operations aggregate far below what your contract requires — the status is real, the money behind it is not. Both need to be checked, and they are different boxes on the form.",
    },
  ],
  faq: [
    {
      q: "Do I need both CG 20 10 and CG 20 37?",
      a: "For any work that could fail after completion — roofing, plumbing, electrical, structural, HVAC — yes. CG 20 10 protects you during the job and CG 20 37 protects you afterwards, and the post-completion window is both longer and more litigious.",
    },
    {
      q: "What is the difference between ongoing and completed operations?",
      a: "Ongoing operations means liability arising while the work is actively being performed. Completed operations means liability arising out of work that has been finished or abandoned, once it has been put to its intended use.",
    },
    {
      q: "Is blanket additional insured wording as good as CG 20 10 and CG 20 37?",
      a: "It can be, but only if the blanket form grants both ongoing and completed operations and its trigger reaches your contract. Ask for the blanket form itself and read the grant — some blanket endorsements are silent on completed operations.",
    },
    {
      q: "How long should completed operations coverage be required after a job?",
      a: "Commonly three to five years, and longer for structural work in states with long statutes of repose. The requirement belongs in the contract, because once the job is closed you have no leverage left to add it.",
    },
    {
      q: "Does the certificate show which endorsement form was used?",
      a: "Almost never. The ACORD 25 has a checkbox and free-text description, not a form number field. The only reliable verification is the endorsement page itself.",
    },
  ],
  related: [
    "additional-insured-vs-certificate-holder",
    "what-to-check-on-a-certificate-of-insurance",
    "waiver-of-subrogation-meaning",
  ],
};
