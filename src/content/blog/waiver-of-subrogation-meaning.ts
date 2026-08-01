import type { Post } from "@/content/blog/types";

export const post: Post = {
  slug: "waiver-of-subrogation-meaning",
  title: "Waiver of Subrogation — What It Means on a COI",
  h1: "Waiver of subrogation: what it means and why you require it",
  description:
    "A waiver of subrogation stops your vendor's insurer from suing you after it pays a claim. What the endorsement does and how to verify it on a certificate.",
  answer:
    "A waiver of subrogation is an endorsement in which an insurer gives up its right to recover, from a named third party, money it has paid on a claim. On a vendor's policy, a waiver in your favor means that after the insurer pays for a loss caused by that vendor, it cannot sue you to get that money back.",
  published: "2026-07-31",
  category: "Definitions",
  keywords: [
    "waiver of subrogation meaning",
    "waiver of subrogation coi",
    "subr wvd meaning",
    "cg 24 04",
  ],
  readingMinutes: 5,
  body: [
    { kind: "h2", text: "What subrogation is, in one paragraph" },
    {
      kind: "p",
      text: "When an insurer pays a claim, it steps into its policyholder's shoes and inherits their right to sue whoever caused the loss. That is subrogation. It is why a workers' compensation carrier that pays out for an injured subcontractor employee can then pursue the property owner it believes created the hazard — the employee could have sued you, so now the carrier can.",
    },
    {
      kind: "p",
      text: "A waiver of subrogation switches that off in advance, for a specified party. It does not reduce the vendor's coverage; it removes your exposure to their insurer's recovery action.",
    },
    { kind: "h2", text: "The forms you are actually asking for" },
    {
      kind: "table",
      head: ["Policy", "Typical form", "What it does"],
      rows: [
        [
          "General liability",
          "CG 24 04 — Waiver of Transfer of Rights of Recovery Against Others to Us",
          "Waives GL subrogation rights against the scheduled party",
        ],
        [
          "Workers' compensation",
          "WC 00 03 13 — Waiver of Our Right to Recover From Others",
          "Waives comp subrogation, usually for a small additional premium",
        ],
        [
          "Commercial auto / umbrella",
          "Carrier-specific waiver endorsements or blanket wording",
          "Same mechanism, different policy",
        ],
      ],
      caption:
        "Form numbers are the common ISO versions; carriers also use proprietary equivalents.",
    },
    {
      kind: "callout",
      title: "The workers' comp waiver is the one people forget",
      text: "In practice the workers' compensation waiver matters most: an injured worker's medical and indemnity claim is the loss most likely to be paid, and therefore the one most likely to be subrogated against the property owner or general contractor. It is also the one that carries a real premium charge, which is why vendors quietly leave it off.",
    },
    { kind: "h2", text: "How to read it on the ACORD 25" },
    {
      kind: "p",
      text: "The ACORD 25 has a \"SUBR WVD\" column with a checkbox per coverage line. Like the additional-insured column beside it, that checkbox is a claim typed by an agency employee — it is not the endorsement. Verify the same way: ask for the waiver endorsement page, check that your exact legal entity is scheduled (or that blanket wording reaches you), and confirm the policy number matches.",
    },
    {
      kind: "ol",
      items: [
        "Confirm SUBR WVD is checked on general liability and workers' compensation, not just one of them.",
        "Request the endorsement page for each policy line where you require it.",
        "Check the scheduled entity name against your exact legal name.",
        "Check that the waiver's effective dates cover your whole contract period.",
      ],
    },
    { kind: "h2", text: "Anti-subrogation wording in your contract" },
    {
      kind: "p",
      text: "The endorsement is only half of it. Your vendor agreement should also require the vendor to obtain the waiver and to keep it in force, so that a missing endorsement is a contract breach rather than a surprise. Some states restrict waivers of subrogation in specific contexts, particularly around workers' compensation and anti-indemnity statutes, so the wording is worth a one-time review by your counsel before it goes into your template.",
    },
    {
      kind: "cta",
      text: "Waivers, additional insured status and primary wording usually get checked together.",
      href: "/blog/what-to-check-on-a-certificate-of-insurance",
      label: "Get the full COI check list",
    },
  ],
  faq: [
    {
      q: "What does SUBR WVD mean on a certificate of insurance?",
      a: "It is the ACORD 25's abbreviation for \"subrogation waived\" — a checkbox indicating the agency believes a waiver of subrogation endorsement applies to that coverage line. It is an indicator, not proof; the endorsement page is the proof.",
    },
    {
      q: "Does a waiver of subrogation cost the vendor money?",
      a: "Usually a modest additional premium, particularly on workers' compensation where waivers are rated. That cost is exactly why the endorsement is sometimes claimed on a certificate but never actually added to the policy.",
    },
    {
      q: "Do I need a waiver of subrogation if I already have additional insured status?",
      a: "Yes — they solve different problems. Additional insured status gives you defense and indemnity under the vendor's policy. A waiver stops the vendor's insurer from recovering against you after it pays. Neither substitutes for the other.",
    },
    {
      q: "Can a waiver of subrogation be added after a loss?",
      a: "No. It has to be in place before the loss occurs. Waivers obtained after the fact do not retroactively give up rights the insurer already acquired when it paid.",
    },
    {
      q: "Is a blanket waiver of subrogation acceptable?",
      a: "Frequently, yes, as long as the blanket wording is triggered by a written contract requiring the waiver and that contract exists and was executed before the loss. Ask for the blanket form and read its trigger language.",
    },
  ],
  related: [
    "primary-and-noncontributory-meaning",
    "cg-20-10-vs-cg-20-37",
    "what-to-check-on-a-certificate-of-insurance",
  ],
};
