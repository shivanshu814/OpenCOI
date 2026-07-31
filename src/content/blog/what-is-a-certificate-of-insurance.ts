import type { Post } from "@/content/blog/types";

export const post: Post = {
  slug: "what-is-a-certificate-of-insurance",
  title: "What Is a Certificate of Insurance (ACORD 25)?",
  h1: "What is a certificate of insurance (ACORD 25)?",
  description:
    "A certificate of insurance is a one-page summary of a vendor's coverage. What ACORD 25 proves, what it does not, and how to read every box on it.",
  answer:
    "A certificate of insurance (COI) is a one-page summary of an insurance policy, almost always issued on the ACORD 25 form. It lists the insured business, its carriers, policy numbers, coverage types, limits and expiration dates. It is evidence that coverage existed on the date it was issued — it is not the policy, and it grants no rights by itself.",
  published: "2026-07-31",
  category: "Definitions",
  keywords: [
    "what is a certificate of insurance",
    "acord 25",
    "certificate of insurance meaning",
    "coi meaning insurance",
  ],
  readingMinutes: 6,
  body: [
    {
      kind: "h2",
      text: "The one thing most people get wrong about a COI",
    },
    {
      kind: "p",
      text: "A certificate of insurance is a snapshot, not a contract. The ACORD 25 form says so in its own header: it is issued as a matter of information only, confers no rights upon the certificate holder, and does not amend, extend or alter the coverage of the policies it describes. Everything that actually protects you — additional insured status, waiver of subrogation, primary and non-contributory wording — lives in endorsements attached to the policy, not in the boxes on the certificate.",
    },
    {
      kind: "p",
      text: "That distinction is the whole game. A vendor can hand you a certificate with the additional-insured box checked and still not have named you on the policy. The certificate is the claim; the endorsement is the proof.",
    },
    {
      kind: "h2",
      text: "What each section of the ACORD 25 actually tells you",
    },
    {
      kind: "table",
      head: ["Section", "What it says", "What to actually check"],
      rows: [
        [
          "Producer",
          "The insurance agency that issued the certificate",
          "A real, reachable agency — this is who you email to confirm coverage",
        ],
        [
          "Insured",
          "The business the policy covers",
          "The exact legal entity you contracted with, not a similar-sounding DBA",
        ],
        [
          "Insurer(s) Affording Coverage + NAIC #",
          "The carriers behind each line, with their NAIC identifier",
          "Carrier is admitted and financially rated; NAIC # is present, not blank",
        ],
        [
          "Type of Insurance",
          "General liability, auto, umbrella, workers' comp, and so on",
          "Every coverage line your contract requires is present",
        ],
        [
          "Addl Insd / Subr Wvd columns",
          "Checkboxes claiming additional insured and waiver of subrogation",
          "The matching endorsement form is actually attached",
        ],
        [
          "Policy Eff / Policy Exp",
          "The dates the policy starts and ends",
          "Coverage is live for the whole work period, not expiring mid-job",
        ],
        [
          "Limits",
          "Each-occurrence, aggregate, products-completed operations, and more",
          "Each limit meets or beats your written requirement",
        ],
        [
          "Description of Operations",
          "Free text — job references, AI wording, project numbers",
          "Names the right project, and any wording claimed here is backed by a form",
        ],
        [
          "Certificate Holder",
          "Who received the certificate",
          "Your exact legal entity and address, spelled correctly",
        ],
        [
          "Cancellation",
          "Notice language",
          "Read it honestly — see the cancellation section below",
        ],
      ],
    },
    { kind: "h2", text: "Certificate holder is not the same as additional insured" },
    {
      kind: "p",
      text: "Being listed as the certificate holder means one thing: someone sent you a copy of the document. It gives you no coverage and, on its own, no right to be notified of anything. Additional insured status is a change to the policy itself, made by endorsement, that extends the vendor's liability coverage to defend and indemnify you for claims arising out of their work. Different mechanism, different paperwork, entirely different level of protection.",
    },
    {
      kind: "cta",
      text: "This is the single most common gap we find on real certificates.",
      href: "/blog/additional-insured-vs-certificate-holder",
      label: "Read: additional insured vs certificate holder",
    },
    { kind: "h2", text: "The cancellation language is weaker than people assume" },
    {
      kind: "p",
      text: "Older certificates promised 30 days' written notice of cancellation to the certificate holder. Current ACORD 25 wording says notice will be delivered in accordance with the policy provisions — and most policies only obligate the carrier to notify the named insured, not you. In practice, carriers do not broadcast mid-term cancellations to certificate holders.",
    },
    {
      kind: "callout",
      title: "What that means for tracking",
      text: "Expirations are knowable in advance and can be chased automatically. A silent mid-term cancellation is not broadcast to anyone but the policyholder, so no software can promise to catch it. The realistic mitigations are: written confirmations from the producer on file, requiring a notice-of-cancellation endorsement in your contract, and re-verifying every new document that arrives.",
    },
    { kind: "h2", text: "How long a certificate stays meaningful" },
    {
      kind: "p",
      text: "Exactly as long as the shortest policy period on it. A certificate showing a general liability policy expiring in four months is worthless in five. That is why COI management is a calendar problem more than a reading problem: the document was accurate the day it was issued, and the risk is that nobody looks again until a claim arrives.",
    },
    {
      kind: "ul",
      items: [
        "Collect the certificate before work starts, never after.",
        "Record every expiration date the moment the document lands.",
        "Start chasing the renewal 30 days out, not on the expiry date.",
        "Re-verify limits and endorsements on each renewal — coverage silently shrinks between years.",
      ],
    },
    { kind: "h2", text: "Who issues a COI, and what it costs" },
    {
      kind: "p",
      text: "The vendor's insurance agency (the producer) issues it, usually free and usually within a day or two. If a vendor tells you a certificate will take weeks or cost money, that is a signal worth following up on — most agencies produce them on demand from their management system.",
    },
  ],
  faq: [
    {
      q: "Is a certificate of insurance proof of coverage?",
      a: "It is evidence that coverage existed on the date the certificate was issued. It is not the policy, it does not amend the policy, and it can go out of date the day after it is issued. Treat it as a starting point that has to be re-verified, not a guarantee.",
    },
    {
      q: "What is ACORD 25?",
      a: "ACORD 25 is the standard Certificate of Liability Insurance form used across the US insurance industry. It is the form nearly every COI you receive will be issued on, which is what makes automated reading practical — the layout and fields are consistent.",
    },
    {
      q: "How long is a certificate of insurance valid?",
      a: "Until the earliest policy expiration date shown on it. A certificate is not separately valid or invalid; it simply describes policies that expire on specific dates, and it stops meaning anything once those dates pass.",
    },
    {
      q: "Can a vendor fake a certificate of insurance?",
      a: "Certificates are PDFs, and edited ones do turn up. The defenses are checking the producer is a real agency, confirming the carrier and NAIC number, watching for layout and font anomalies, and — for anything high-value — asking the producer directly to confirm the policy in writing.",
    },
    {
      q: "Does the certificate holder get notified if the policy is cancelled?",
      a: "Usually not. Current ACORD wording defers to the policy provisions, and most policies only require notice to the named insured. Requiring a notice-of-cancellation endorsement in your contract is the way to change that.",
    },
  ],
  related: [
    "additional-insured-vs-certificate-holder",
    "what-to-check-on-a-certificate-of-insurance",
    "acord-25-vs-acord-27-vs-acord-28",
  ],
};
