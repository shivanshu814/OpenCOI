import type { Post } from "@/content/blog/types";

export const post: Post = {
  slug: "vendor-coi-expired-what-to-do",
  title: "A Vendor's COI Expired — What to Do Now",
  h1: "A vendor's certificate of insurance expired. What now?",
  description:
    "The first 48 hours when a vendor's insurance lapses: who to contact, whether to stop work, what to document, and how to prevent the repeat.",
  answer:
    "When a vendor's certificate of insurance expires, stop assigning new work, contact the vendor's insurance producer the same day requesting a current certificate with endorsements, and document the date you identified the lapse. If work is already in progress, get written confirmation of coverage from the producer before it continues, and record that confirmation with the vendor's file.",
  published: "2026-07-31",
  category: "Guides",
  keywords: [
    "vendor coi expired",
    "certificate of insurance expired",
    "vendor insurance lapsed",
    "uninsured contractor on site",
  ],
  readingMinutes: 6,
  body: [
    {
      kind: "callout",
      title: "Not legal advice",
      text: "This is an operational playbook, not legal or insurance advice. Where a lapse coincides with an incident, involve your broker and counsel immediately rather than working from a checklist.",
    },
    { kind: "h2", text: "Hour one: establish what actually expired" },
    {
      kind: "p",
      text: "\"The COI expired\" usually means one policy line expired. Check which. A general liability policy that lapsed is a different problem from an auto policy that lapsed, and workers' compensation lapsing while people are physically on your property is the most urgent of the three. Pull the certificate and read the expiration column line by line rather than the certificate date at the top.",
    },
    {
      kind: "ul",
      items: [
        "Which coverage lines have expired, and on what dates.",
        "Whether the vendor has performed work since that date.",
        "Whether any incident has been reported in the gap period.",
        "Whether the vendor is currently on site.",
      ],
    },
    { kind: "h2", text: "Hour two: contact the producer, not the vendor" },
    {
      kind: "p",
      text: "The agency that issued the last certificate can tell you in minutes whether the policy renewed, whether it lapsed, or whether it renewed with a different carrier and nobody sent the new certificate — which is by far the most common answer. Email the producer directly, name the policy number and the expired line, copy the vendor, and ask for a current certificate with the endorsement pages attached.",
    },
    {
      kind: "p",
      text: "In a large share of cases the coverage never actually lapsed; the paperwork did. That is a much better outcome, and you only find out by asking the person who issues the paperwork.",
    },
    { kind: "h2", text: "Day one: decide about work in progress" },
    {
      kind: "table",
      head: ["Situation", "Reasonable action"],
      rows: [
        [
          "Vendor not currently on site",
          "Suspend new assignments until a current certificate is verified",
        ],
        [
          "Work in progress, low hazard, producer confirms coverage in force",
          "Continue, with the written confirmation saved to the vendor file",
        ],
        [
          "Work in progress, producer cannot confirm",
          "Stop work; the exposure while uninsured is yours, not theirs",
        ],
        [
          "High-hazard work — roofing, electrical, heights, hot work",
          "Stop until verified regardless of how far along the job is",
        ],
        [
          "An incident has already occurred in the gap",
          "Notify your broker and counsel today; do not handle this operationally",
        ],
      ],
    },
    { kind: "h2", text: "Document as you go" },
    {
      kind: "p",
      text: "Whatever the outcome, the record matters as much as the action. If a claim ever arises from that period, the question will be what you required, when you noticed, and what you did about it. Keep a dated trail:",
    },
    {
      kind: "ol",
      items: [
        "The date and time you identified the lapse, and how.",
        "The message you sent to the producer, with the timestamp.",
        "Any confirmation received, saved as a document rather than a memory.",
        "The decision you made about work in progress, and who made it.",
        "The date the compliant certificate was finally received and verified.",
      ],
    },
    { kind: "h2", text: "Week one: fix the cause, not the instance" },
    {
      kind: "p",
      text: "A lapse that gets discovered after the expiry date is a monitoring failure, not a vendor failure. The vendor's policy expiring was knowable months in advance — it was printed on the certificate you already had.",
    },
    {
      kind: "ul",
      items: [
        "Move the first reminder to 30 days before expiry, addressed to the producer.",
        "Add an escalation at 14 days and again at 3 days.",
        "Make non-compliance actually block work assignment, or the reminder is advisory.",
        "Re-verify limits and endorsements on the renewal certificate rather than assuming last year's terms carried over.",
        "Send reminders in Spanish as well as English where your vendor base warrants it.",
      ],
    },
    {
      kind: "cta",
      text: "The whole cadence, written out.",
      href: "/blog/how-to-track-vendor-insurance-certificates",
      label: "How to track vendor insurance certificates",
    },
    { kind: "h2", text: "The lapse you cannot see" },
    {
      kind: "p",
      text: "One honest caveat: everything above is about expirations, which are predictable. A policy cancelled mid-term is not — carriers notify the named insured, and current ACORD wording defers notice to the policy provisions rather than promising it to certificate holders. The mitigations that exist are requiring a notice-of-cancellation endorsement in your contract, keeping written confirmations from producers on file, and re-verifying every new document that arrives. Nobody, including us, can promise to detect a silent cancellation.",
    },
  ],
  faq: [
    {
      q: "Can I let a vendor keep working with an expired COI?",
      a: "It is a risk decision, not a rule. If the producer confirms in writing that coverage is in force and only the certificate lapsed, continuing on low-hazard work is common practice. Without that confirmation, the uninsured period is your exposure.",
    },
    {
      q: "Who do I contact when a certificate expires?",
      a: "The producer — the insurance agency named on the certificate — with the vendor copied. They can confirm renewal status and reissue the document immediately, which the vendor usually cannot.",
    },
    {
      q: "How often do expired certificates mean expired coverage?",
      a: "Frequently they do not. The most common cause is a policy that renewed while nobody requested the new certificate, or renewed with a different carrier. Asking the producer is the fastest way to find out which one you are dealing with.",
    },
    {
      q: "What if the vendor is uninsured and something already happened?",
      a: "Stop working from a checklist and involve your broker and counsel the same day. Preserve everything — the certificate history, the chase record, the work orders, the incident report — before anything is reorganized.",
    },
    {
      q: "How do I stop this happening again?",
      a: "Reminders starting 30 days out and addressed to the producer, an escalation ladder, and non-compliance that actually blocks work assignment. If nobody is opening the tracker weekly, automate the reminder rather than relying on the habit.",
    },
  ],
  related: [
    "how-to-track-vendor-insurance-certificates",
    "what-to-check-on-a-certificate-of-insurance",
    "what-is-a-certificate-of-insurance",
  ],
};
