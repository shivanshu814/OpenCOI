import type { Post } from "@/content/blog/types";

export const post: Post = {
  slug: "additional-insured-vs-certificate-holder",
  title: "Additional Insured vs Certificate Holder — The Difference",
  h1: "Additional insured vs certificate holder",
  description:
    "Certificate holder means you received a document. Additional insured means you are covered. How to tell which one you actually have on a COI.",
  answer:
    "A certificate holder is simply the party a certificate of insurance was sent to — the status confers no coverage and no rights. An additional insured has been added to the vendor's policy by endorsement, extending that policy's defense and indemnity to them for claims arising out of the vendor's work. Only the endorsement provides protection.",
  published: "2026-07-31",
  category: "Definitions",
  keywords: [
    "additional insured vs certificate holder",
    "certificate holder meaning",
    "additional insured endorsement",
    "am i covered on a coi",
  ],
  readingMinutes: 6,
  body: [
    {
      kind: "p",
      text: "This is the most expensive misunderstanding in vendor compliance. A property manager sees their company name printed on a certificate, assumes they are protected, and finds out during a claim that they were only on the mailing list.",
    },
    { kind: "h2", text: "Side by side" },
    {
      kind: "table",
      head: ["", "Certificate holder", "Additional insured"],
      rows: [
        [
          "What it is",
          "The recipient of the certificate document",
          "A party added to the policy itself",
        ],
        [
          "Created by",
          "Typing a name into a box on the ACORD 25",
          "An endorsement form attached to the policy",
        ],
        [
          "Coverage granted",
          "None",
          "Defense and indemnity for claims arising out of the named insured's work",
        ],
        [
          "Right to notice",
          "Only what the policy provisions actually require",
          "Depends on the endorsement and policy wording",
        ],
        [
          "Proof to demand",
          "The certificate",
          "The endorsement form itself (CG 20 10, CG 20 37 or equivalent)",
        ],
        [
          "Cost to the vendor",
          "Nothing",
          "Often a small premium charge, which is why it gets skipped",
        ],
      ],
    },
    { kind: "h2", text: "Why the checkbox is not enough" },
    {
      kind: "p",
      text: "The ACORD 25 has an \"ADDL INSD\" column with a checkbox per coverage line, and a Description of Operations box where an agency will often type wording like \"Certificate holder is named as additional insured as respects general liability per written contract.\" Both are statements typed by an agency employee. Neither is the endorsement. A checked box with no attached form is the single most common gap we see on real certificates.",
    },
    {
      kind: "callout",
      title: "The one-sentence rule",
      text: "If a certificate claims additional insured status, ask for the endorsement page. If the endorsement page does not arrive, you do not have additional insured status — you have a checkbox.",
    },
    { kind: "h2", text: "Which endorsement you should be asking for" },
    {
      kind: "ul",
      items: [
        "CG 20 10 — Additional Insured, Owners, Lessees or Contractors (Scheduled Person or Organization). Covers ongoing operations: the period while the work is being performed.",
        "CG 20 37 — Additional Insured, Owners, Lessees or Contractors (Completed Operations). Covers claims that arise after the work is finished, which is when most construction-defect claims actually surface.",
        "Blanket additional insured wording — some policies add anyone the named insured is required by written contract to add. Convenient, but you still want to see the blanket form, because its trigger language decides whether your contract qualifies.",
      ],
    },
    {
      kind: "cta",
      text: "The ongoing-operations versus completed-operations distinction is where most requirement lists fall short.",
      href: "/blog/cg-20-10-vs-cg-20-37",
      label: "Read: CG 20 10 vs CG 20 37",
    },
    { kind: "h2", text: "Getting the entity name right" },
    {
      kind: "p",
      text: "An endorsement that names \"Maple Property Group\" does not obviously protect \"Maple Property Group LLC\" or \"Maple PG Management, as agent for Maple Holdings II LP\" — and in a coverage dispute that ambiguity is the carrier's argument, not yours. Standardize the exact wording you require, put it in your vendor agreement, and check every incoming certificate against it character by character rather than by eye.",
    },
    {
      kind: "ol",
      items: [
        "Write the required additional-insured wording once, in your vendor agreement.",
        "Send that exact string to the vendor's agent when you request the certificate.",
        "On receipt, compare the certificate and the endorsement against the string.",
        "Store both documents together — the certificate alone is not the evidence you will want later.",
      ],
    },
    { kind: "h2", text: "What to do when the endorsement never shows up" },
    {
      kind: "p",
      text: "Go to the producer, not the vendor. The agency issued the certificate and can attach the endorsement in minutes; the vendor usually cannot find the policy documents at all. A short, specific email — naming the policy number, the endorsement form you need, and the exact additional-insured wording — resolves this far more often than a generic \"please send updated insurance\" request to the vendor.",
    },
  ],
  faq: [
    {
      q: "Does being a certificate holder mean I am covered?",
      a: "No. Certificate holder status means the certificate was addressed to you. It grants no coverage, and the ACORD 25 says so on its own face — the certificate is issued as a matter of information only and confers no rights upon the holder.",
    },
    {
      q: "Can I be both certificate holder and additional insured?",
      a: "Yes, and you normally should be. You want the document addressed to you so you have a record, and you want the endorsement so you have coverage. They are separate things and you should verify both.",
    },
    {
      q: "Is a blanket additional insured endorsement good enough?",
      a: "Often yes, but read the trigger. Blanket forms typically extend status only where the named insured is required by written contract, executed before the loss, to add that party. If you have no signed contract, or the contract is silent on insurance, the blanket may not reach you.",
    },
    {
      q: "Does additional insured status cover my own negligence?",
      a: "Generally not. Standard additional-insured endorsements cover liability arising out of the named insured's operations, and modern forms limit coverage to the extent permitted by law and to the vendor's fault. It is protection against being dragged into their claim, not blanket coverage for you.",
    },
    {
      q: "How do I verify additional insured status quickly?",
      a: "Ask for the endorsement page, confirm the form number and edition date, check that your exact legal entity is scheduled on it, and confirm the policy number matches the certificate. If any of the four does not line up, treat it as unverified.",
    },
  ],
  related: [
    "cg-20-10-vs-cg-20-37",
    "what-is-a-certificate-of-insurance",
    "what-to-check-on-a-certificate-of-insurance",
  ],
};
