import type { Post } from "@/content/blog/types";

export const post: Post = {
  slug: "how-to-track-vendor-insurance-certificates",
  title: "How to Track Vendor Insurance Certificates (2026 Guide)",
  h1: "How to track vendor insurance certificates",
  description:
    "A working system for collecting, verifying, renewing and evidencing vendor COIs — from a spreadsheet that survives to when to automate it.",
  answer:
    "Track vendor insurance certificates by keeping one record per vendor with the insured's legal name, each policy's carrier, number, limits and expiration date, and the endorsements on file. Verify each certificate against written requirements on arrival, start chasing renewals 30 days before expiry, and store every document with a dated trail of what was checked and by whom.",
  published: "2026-07-31",
  category: "Guides",
  keywords: [
    "how to track vendor insurance certificates",
    "coi tracking process",
    "vendor insurance tracking",
    "certificate of insurance management",
  ],
  readingMinutes: 8,
  body: [
    {
      kind: "p",
      text: "COI tracking fails in a predictable way. It is not that people do not know what to check — it is that the checking is front-loaded and the risk is back-loaded. Everyone verifies the certificate on day one, when they are motivated and the vendor is eager. Nobody re-verifies in month eleven, when the policy quietly lapses and the vendor is already on site.",
    },
    {
      kind: "p",
      text: "A system that works has to survive that asymmetry. Here is the shape of one.",
    },
    { kind: "h2", text: "Step 1 — Write the requirements down once" },
    {
      kind: "p",
      text: "Before anything can be tracked, there has to be something to track against. Write a requirement set per trade tier — not per vendor — covering coverage lines, limits, endorsements and the exact additional-insured entity wording. Three tiers is usually enough: low-hazard interior work, general trades, and high-hazard work such as roofing, structural and anything involving heat or heights.",
    },
    {
      kind: "cta",
      text: "Starting from scratch? Use a typical baseline and adjust.",
      href: "/vendor-insurance-requirements",
      label: "See requirements by trade",
    },
    { kind: "h2", text: "Step 2 — Collect before work starts, not after" },
    {
      kind: "p",
      text: "The only leverage you will ever have is the moment before the vendor is engaged. Make the certificate a condition of the first work order, send the required wording with the request, and address the request to the vendor's insurance agent with the vendor copied — the agent is the one who can actually produce the document.",
    },
    { kind: "h2", text: "Step 3 — Record the fields that matter, not the PDF" },
    {
      kind: "p",
      text: "A folder full of PDFs is not tracking. What you need extracted into rows you can sort:",
    },
    {
      kind: "table",
      head: ["Field", "Why you need it as data"],
      rows: [
        ["Insured legal name", "Catches the DBA mismatch before a claim does"],
        [
          "Coverage line",
          "One row per line — GL, auto, WC, umbrella all expire independently",
        ],
        ["Carrier + NAIC number", "Lets you check admitted status and rating"],
        ["Policy number", "The key when you email the producer to confirm"],
        [
          "Effective and expiration date",
          "The whole renewal calendar is built from this column",
        ],
        [
          "Each limit",
          "So a requirement change can be re-run across every vendor at once",
        ],
        [
          "Endorsements on file",
          "Which of AI-ongoing, AI-completed, P&NC, waiver you actually hold",
        ],
        ["Producer name and email", "Who you chase — never chase the vendor first"],
      ],
    },
    { kind: "h2", text: "Step 4 — Verify against the requirement, in writing" },
    {
      kind: "p",
      text: "Verification is a comparison, and comparisons should produce a recorded verdict: pass, fail, or missing, per requirement line, with a date and a person's name against it. That record is the thing you will want two years later when someone asks what you knew and when. A green cell in a spreadsheet with no history is not evidence.",
    },
    { kind: "h2", text: "Step 5 — Chase on a schedule, not on a feeling" },
    {
      kind: "p",
      text: "Renewals are the entire operational cost of COI tracking. A cadence that works in practice:",
    },
    {
      kind: "ol",
      items: [
        "Day −30: first reminder to the vendor's producer, with the vendor copied, naming the exact endorsements required.",
        "Day −14: second reminder, same thread, slightly firmer.",
        "Day −3: escalate to the vendor's owner or your operations contact.",
        "Day 0: mark non-compliant and stop assigning work until resolved.",
        "Day +7: final notice referencing the contract clause.",
      ],
    },
    {
      kind: "callout",
      title: "Write the chase emails in Spanish too",
      text: "A large share of trade vendors in US property maintenance and construction operate primarily in Spanish. A reminder in English that goes unread is not a reminder. Sending the sequence bilingually is one of the cheapest response-rate improvements available.",
    },
    { kind: "h2", text: "Step 6 — Keep the trail" },
    {
      kind: "p",
      text: "Store every certificate version, every endorsement page, every chase message and every verdict, with dates. When a claim lands, the question is rarely \"were they insured\" — it is \"what did you require, what did you check, and when did you know\". A dated trail answers that in an afternoon. A shared drive does not.",
    },
    { kind: "h2", text: "When a spreadsheet stops working" },
    {
      kind: "p",
      text: "A spreadsheet is genuinely fine below about twenty-five vendors with one requirement set. It stops working at the point where any of these becomes true:",
    },
    {
      kind: "ul",
      items: [
        "More than one requirement tier, so the comparison is no longer a single rule.",
        "More than one person maintaining it, so nobody is sure whose edit is current.",
        "Vendors working across multiple properties or owners with different requirements.",
        "Renewal reminders that depend on someone remembering to open the file.",
        "An audit, an owner request or a claim, where you need the history and not just the current state.",
      ],
    },
    {
      kind: "p",
      text: "The honest framing: the spreadsheet does not fail because it is a spreadsheet. It fails because the work it implies — forty comparisons per certificate, a chase cadence per vendor, a version history per document — is more than the tool asks you to do, so it silently does not get done.",
    },
    {
      kind: "cta",
      text: "If you want the spreadsheet first, take ours — it has the right columns already.",
      href: "/blog/coi-tracking-spreadsheet-template",
      label: "Download the free COI tracking template",
    },
  ],
  faq: [
    {
      q: "How often should vendor certificates be re-verified?",
      a: "At every renewal, and any time the vendor's scope or your requirements change. Coverage quietly shrinks between policy years — a limit reduced at renewal is invisible unless you compare the new certificate against the requirement rather than against last year's certificate.",
    },
    {
      q: "Who should I chase for a renewal, the vendor or their agent?",
      a: "The agent, with the vendor copied. The producer can issue the certificate and attach the endorsements in minutes; the vendor usually has to forward the request to the agent anyway, which adds days and loses detail.",
    },
    {
      q: "How far in advance should renewal reminders start?",
      a: "Thirty days is the practical floor. It gives the agency time to issue, gives you time to reject a non-compliant document, and leaves room for one escalation before the policy actually lapses.",
    },
    {
      q: "What should I do when a vendor's certificate expires and they are mid-job?",
      a: "Stop new assignments, escalate to the vendor's owner and their agent the same day, and document the date you flagged it. If work must continue, get written confirmation of coverage from the producer before it does — and record that too.",
    },
    {
      q: "Can COI tracking be fully automated?",
      a: "The reading, comparison and chasing can be. Judgment on unusual documents should stay with a person, and no system can promise to catch a mid-term cancellation, because carriers do not broadcast those to certificate holders.",
    },
  ],
  related: [
    "what-to-check-on-a-certificate-of-insurance",
    "coi-tracking-spreadsheet-template",
    "how-much-insurance-should-a-contractor-have",
    "vendor-coi-expired-what-to-do",
  ],
};
