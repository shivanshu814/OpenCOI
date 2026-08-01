import type { Post } from "@/content/blog/types";

export const post: Post = {
  slug: "coi-tracking-spreadsheet-template",
  title: "Free COI Tracking Spreadsheet Template (CSV)",
  h1: "Free COI tracking spreadsheet template",
  description:
    "A free certificate of insurance tracking spreadsheet with the columns that actually matter — plus the formulas for expiry alerts. No email required.",
  answer:
    "A usable COI tracking spreadsheet needs one row per vendor per coverage line, with the insured's legal name, carrier and NAIC number, policy number, effective and expiration dates, each required limit, which endorsements are on file, and the producer's contact details. Download the template below, free and with no email required.",
  published: "2026-07-31",
  category: "Templates",
  keywords: [
    "coi tracking spreadsheet template",
    "certificate of insurance tracking spreadsheet",
    "free coi tracker excel",
    "vendor insurance spreadsheet",
  ],
  readingMinutes: 5,
  body: [
    {
      kind: "cta",
      text: "The template is a CSV — open it in Excel, Google Sheets or Numbers. No signup, no email gate.",
      href: "/downloads/coi-tracking-template.csv",
      label: "Download the CSV template",
    },
    { kind: "h2", text: "What is in it" },
    {
      kind: "p",
      text: "Most COI spreadsheets fail for the same reason: one row per vendor. Policies do not renew together — a general liability policy can run to March while the workers' compensation policy expires in September, and a single expiration column cannot represent that. This template uses one row per vendor per coverage line, which is the smallest change that makes the sheet honest.",
    },
    {
      kind: "table",
      head: ["Column", "What goes in it"],
      rows: [
        ["Vendor legal name", "The exact entity on the contract, including LLC/Inc"],
        ["Trade / tier", "Which requirement set applies to this vendor"],
        ["Coverage line", "General liability, auto, workers' comp, umbrella, other"],
        ["Carrier", "Insurer named on the certificate"],
        ["NAIC #", "Carrier identifier — lets you verify admitted status"],
        ["Policy number", "What you quote when you email the producer"],
        ["Effective date", "Policy start"],
        ["Expiration date", "Drives every reminder in the sheet"],
        ["Each occurrence limit", "Per-claim limit for this line"],
        ["Aggregate limit", "Annual limit, shared across all the vendor's work"],
        [
          "Products-completed ops aggregate",
          "The limit behind post-completion claims",
        ],
        ["Required limit met? (Y/N)", "The verdict, recorded rather than remembered"],
        ["AI ongoing ops on file?", "CG 20 10 or equivalent, endorsement seen"],
        ["AI completed ops on file?", "CG 20 37 or equivalent, endorsement seen"],
        ["Primary & non-contributory?", "Endorsement seen, not description-box text"],
        ["Waiver of subrogation?", "GL and workers' comp separately"],
        ["Producer agency", "Who issued the certificate"],
        ["Producer email", "Who you chase — the agent, not the vendor"],
        ["Certificate file link", "Where the PDF and endorsements live"],
        ["Last verified date", "By whom, and when — this is your audit trail"],
        ["Notes", "Exclusions, owner-officer exclusions, per-project aggregate"],
      ],
    },
    { kind: "h2", text: "The two formulas worth adding" },
    {
      kind: "p",
      text: "Once the sheet is open, add a Days to Expiry column and a Status column. In Google Sheets, with the expiration date in column H:",
    },
    {
      kind: "ul",
      items: [
        "Days to expiry: =IF(H2=\"\",\"\",H2-TODAY())",
        "Status: =IF(H2=\"\",\"MISSING\",IF(H2<TODAY(),\"EXPIRED\",IF(H2-TODAY()<=30,\"EXPIRING\",\"OK\")))",
      ],
    },
    {
      kind: "p",
      text: "Then apply conditional formatting on Status — red for EXPIRED and MISSING, amber for EXPIRING, green for OK — and sort by Days to expiry ascending. That view, opened every Monday, is the whole job.",
    },
    {
      kind: "callout",
      title: "Set a real calendar reminder, not a mental one",
      text: "The sheet cannot email anyone. Whatever else you do, put a recurring weekly calendar block against it. Every failed COI program we have looked at failed at exactly this step: the data was fine, and nobody opened the file.",
    },
    { kind: "h2", text: "Where the spreadsheet stops being enough" },
    {
      kind: "p",
      text: "Honestly: below about twenty-five vendors with one requirement tier, a spreadsheet plus a weekly calendar block is a legitimate system, and you do not need software. It breaks down when the requirement set stops being uniform, when more than one person edits the file, when vendors span properties with different requirements, or when you need the history rather than the current state — because a cell that changed from red to green keeps no record of when, or why, or who decided.",
    },
    {
      kind: "cta",
      text: "When the sheet stops keeping up, the same columns exist as a system that reads the certificates and sends the reminders itself.",
      href: "/compare/coi-tracking-spreadsheet",
      label: "Spreadsheet vs software — an honest comparison",
    },
  ],
  faq: [
    {
      q: "Is the COI tracking template really free?",
      a: "Yes, and there is no email gate on it. It is a plain CSV that opens in Excel, Google Sheets or Numbers.",
    },
    {
      q: "Why one row per coverage line instead of one row per vendor?",
      a: "Because policies expire on different dates. A vendor with general liability expiring in March and workers' compensation expiring in September cannot be represented by a single expiration column without hiding one of the two risks.",
    },
    {
      q: "How do I get expiry alerts out of a spreadsheet?",
      a: "A Days to Expiry formula plus conditional formatting gives you the view; the alert still depends on someone opening the file. Google Sheets can be scripted to email on a schedule, but at that point you are maintaining software without the support.",
    },
    {
      q: "How many vendors can a spreadsheet realistically handle?",
      a: "Roughly twenty-five, with one requirement tier and one maintainer. Past that, the number of comparisons per renewal cycle exceeds what the file will actually get.",
    },
    {
      q: "Can I share this template with my team or clients?",
      a: "Yes. Use it, edit it, and send it to anyone — your team, your clients, or their vendors. Attribution is appreciated but never required.",
    },
  ],
  related: [
    "how-to-track-vendor-insurance-certificates",
    "what-to-check-on-a-certificate-of-insurance",
    "how-much-insurance-should-a-contractor-have",
    "best-coi-tracking-software-buyers-guide",
  ],
};
