/**
 * Comparison pages (docs/02 §5.6).
 *
 * Two hard rules, because "X alternative" pages are the easiest place on a
 * marketing site to publish something untrue:
 *
 *  1. No claim about a competitor's price, feature set or customer count is
 *     stated as fact. None of these vendors publish list pricing, so every
 *     commercial statement is framed as "quote-based, verify with them".
 *     A page that overstates a competitor gets skipped by answer engines and
 *     believed by nobody who has actually taken their demo.
 *  2. Every page carries a `whenThem` list that is a genuine recommendation to
 *     buy the other product. If the honest answer for a reader is "not us", the
 *     page has to say so — that is what makes the rest of it credible.
 */

export type Comparison = {
  slug: string;
  competitor: string;
  title: string;
  h1: string;
  description: string;
  /** 40–60 word extractable answer. */
  answer: string;
  keywords: readonly string[];
  /** Fair description of what the competitor is and who it serves. */
  positioning: string;
  /** What they genuinely do better. Not optional. */
  credit: readonly string[];
  rows: readonly { dimension: string; them: string; us: string }[];
  whenThem: readonly string[];
  whenUs: readonly string[];
  faq: readonly { q: string; a: string }[];
};

const SHARED_ROWS_TAIL: Comparison["rows"] = [
  {
    dimension: "Human review before a verdict publishes",
    them: "Varies — several use managed review teams; ask what happens on a low-confidence document",
    us: "Every verdict is reviewed by a person before it publishes; nothing auto-approves",
  },
  {
    dimension: "Chase language",
    them: "Ask — English is standard, Spanish varies",
    us: "English and Spanish, both live",
  },
  {
    dimension: "Mid-term cancellation detection",
    them: "Ask directly — the honest answer is that carriers do not broadcast these",
    us: "Not claimed. Mitigated with producer confirmations, notice-of-cancellation endorsements and re-verification",
  },
  {
    dimension: "Data export on cancellation",
    them: "Ask — request the format and the timeline in writing",
    us: "Full export in one click, any time",
  },
];

export const COMPARISONS: readonly Comparison[] = [
  {
    slug: "mycoi-alternative",
    competitor: "myCOI",
    title: "CertShield vs myCOI — SMB Alternative for COI Tracking",
    h1: "CertShield vs myCOI",
    description:
      "myCOI is built for enterprises. CertShield gives property managers the same COI compliance at SMB pricing — live in a day, no annual contract.",
    answer:
      "myCOI is an established enterprise vendor-compliance platform with quote-based pricing, an implementation period and a managed review service. CertShield covers the same core job — reading certificates, verifying limits and endorsements, chasing renewals — for small and mid-size firms at $99 to $499 per month, self-serve, with no annual contract.",
    keywords: [
      "mycoi alternative",
      "mycoi vs certshield",
      "mycoi pricing",
      "cheaper than mycoi",
    ],
    positioning:
      "myCOI is one of the longest-established names in certificate tracking, built around a compliance workflow plus a managed service that chases and reviews certificates on a customer's behalf. It is aimed at organisations with a real compliance function — construction firms, large property portfolios, franchise networks — and is sold through a quoted, contracted process rather than self-serve signup.",
    credit: [
      "Years of operating history and a large installed base in construction and enterprise property.",
      "A managed review service, which is genuinely valuable if you would rather outsource the work entirely than run it yourself.",
      "Depth of configuration for complex, multi-entity compliance programs.",
      "Established integrations and procurement processes that large buyers expect.",
    ],
    rows: [
      {
        dimension: "Built for",
        them: "Enterprise and upper mid-market with a dedicated compliance owner",
        us: "Property managers of 20–2,000 units and GCs with 10–100 subs",
      },
      {
        dimension: "Pricing",
        them: "Quote-based; no public list pricing — ask them directly",
        us: "$99 / $249 / $499 per month, published",
      },
      {
        dimension: "Commitment",
        them: "Typically an annual agreement — confirm the term before signing",
        us: "Monthly, cancel any time",
      },
      {
        dimension: "Time to first compliance snapshot",
        them: "Implementation project — ask for their median, in weeks",
        us: "Same day; import a vendor list and run your existing certificates",
      },
      {
        dimension: "Who does the reading",
        them: "Software plus a managed review team",
        us: "AI extraction with a person verifying every verdict",
      },
      ...SHARED_ROWS_TAIL,
    ],
    whenThem: [
      "You have a dedicated risk or compliance function and want to hand the process to a managed team.",
      "You are tracking thousands of vendors across many legal entities with materially different programs.",
      "Procurement requires a master services agreement, security questionnaire and formal vendor onboarding.",
      "You need integrations into enterprise construction or ERP systems that a small vendor will not have.",
    ],
    whenUs: [
      "COI tracking is somebody's second job, not a department.",
      "A multi-week implementation is not something you can absorb.",
      "You want to see the price before you talk to anyone.",
      "You would rather pay monthly and leave than sign an annual contract to find out.",
    ],
    faq: [
      {
        q: "Is CertShield a myCOI alternative?",
        a: "For small and mid-size property managers and contractors, yes — it does the same core work of reading certificates, verifying limits and endorsements, and chasing renewals. For an enterprise compliance program with a managed review team, myCOI is solving a larger problem.",
      },
      {
        q: "How much does myCOI cost?",
        a: "myCOI does not publish list pricing; it is quoted per customer based on scale and services. Ask them directly for a number, and ask specifically whether the quote includes the managed review service.",
      },
      {
        q: "Can I migrate off myCOI easily?",
        a: "Ask for your vendor list and document archive as an export before you commit to anything else — the export format and timeline are the questions worth asking in writing. CertShield imports vendor lists by CSV and reads existing certificates on upload.",
      },
      {
        q: "Does CertShield do everything myCOI does?",
        a: "No. myCOI has more years of enterprise configuration depth and a managed service. CertShield covers extraction, requirement checking, endorsement verification, chasing, audit trail and reporting — the core loop — at SMB pricing.",
      },
    ],
  },

  {
    slug: "trustlayer-alternative",
    competitor: "TrustLayer",
    title: "CertShield vs TrustLayer — COI Tracking Compared",
    h1: "CertShield vs TrustLayer",
    description:
      "Compare TrustLayer and CertShield for vendor insurance verification: pricing, AI accuracy, setup time, and who each is really built for.",
    answer:
      "TrustLayer is a modern insurtech platform for certificate verification, commonly reached through an insurance broker partnership and sold on a quoted, contracted basis. CertShield targets the smaller end of the same problem: self-serve, published pricing from $99 per month, no broker relationship required, and no annual commitment.",
    keywords: [
      "trustlayer alternative",
      "trustlayer vs certshield",
      "trustlayer pricing",
      "coi verification software comparison",
    ],
    positioning:
      "TrustLayer is a well-funded insurtech built around verifying certificates and building a shared verification network, frequently distributed in partnership with insurance brokers who bring it to their clients. Its product is polished, its risk-management framing is strong, and it is aimed at mid-market and enterprise buyers.",
    credit: [
      "A genuinely modern product with a strong user experience.",
      "The broker distribution model means many customers get it bundled through a relationship they already have.",
      "Verification-network thinking — reusing verified insurance data across counterparties — is the right long-term idea for this category.",
      "Deeper risk-management surface area than a focused SMB tool.",
    ],
    rows: [
      {
        dimension: "Built for",
        them: "Mid-market and enterprise, often via a broker relationship",
        us: "SMB property managers and contractors buying directly",
      },
      {
        dimension: "How you buy it",
        them: "Sales process, frequently introduced by your broker",
        us: "Self-serve signup, or email us three certificates first",
      },
      {
        dimension: "Pricing",
        them: "Quote-based; no public list pricing — ask them directly",
        us: "$99 / $249 / $499 per month, published",
      },
      {
        dimension: "Commitment",
        them: "Typically contracted annually — confirm the term",
        us: "Monthly, cancel any time",
      },
      {
        dimension: "Time to value",
        them: "Onboarding process — ask for the median in weeks",
        us: "Same day",
      },
      ...SHARED_ROWS_TAIL,
    ],
    whenThem: [
      "Your broker already offers it and will absorb or subsidise the cost.",
      "You want a broader risk-management platform rather than a focused COI tool.",
      "You are large enough that a formal onboarding and annual contract is normal for you.",
      "Verification-network coverage across your counterparties matters more than price.",
    ],
    whenUs: [
      "You do not have a broker relationship that comes with software attached.",
      "You want to see pricing on a web page rather than on a call.",
      "Twenty-five to a few hundred vendors, and one person responsible for all of them.",
      "You want Spanish-language chasing running on day one.",
    ],
    faq: [
      {
        q: "Is CertShield a TrustLayer alternative?",
        a: "For smaller firms buying directly, yes. TrustLayer is frequently reached through a broker partnership and aimed at larger organisations; CertShield is bought directly, priced publicly, and sized for teams where COI tracking is one person's partial responsibility.",
      },
      {
        q: "How much does TrustLayer cost?",
        a: "TrustLayer does not publish list pricing — it is quoted, and in broker-distributed deals the commercial arrangement can differ again. Ask them directly, and ask what happens to the price if you leave the broker relationship.",
      },
      {
        q: "Does CertShield need my insurance broker to be involved?",
        a: "No. You buy it directly and your broker is not part of the transaction. Many brokers are happy about that — the certificate paperwork stops landing on them either way.",
      },
      {
        q: "Which has better extraction accuracy?",
        a: "Neither of us can honestly answer that for the other's product, and self-reported accuracy numbers are not comparable across different test sets. Take both demos with the same three difficult certificates — a scan, a rotated page and one with four endorsement pages — and compare the output yourself.",
      },
    ],
  },

  {
    slug: "jones-alternative",
    competitor: "Jones",
    title: "CertShield vs Jones — COI Compliance Compared",
    h1: "CertShield vs Jones",
    description:
      "Jones focuses on commercial real estate vendor and tenant compliance. Compare it with CertShield on pricing, scope, setup and who each fits.",
    answer:
      "Jones is a compliance platform focused on commercial real estate, handling vendor and tenant certificate approval workflows for property teams and their building operations. CertShield is a narrower, SMB-priced tool focused on vendor COI extraction, requirement checking and automated chasing, from $99 per month with no annual contract.",
    keywords: [
      "jones alternative",
      "jones coi vs certshield",
      "jones compliance software",
      "tenant coi compliance",
    ],
    positioning:
      "Jones is built around commercial real estate operations, where the compliance question spans vendors, tenants and their contractors, and where approvals often have to route through building management before someone is allowed on site. That workflow — access control tied to insurance approval — is a genuinely different problem from vendor list compliance, and Jones is shaped for it.",
    credit: [
      "Purpose-built for commercial real estate operations, including tenant and tenant-contractor compliance.",
      "Approval workflows that tie insurance status to building access, which vendor-list tools do not model.",
      "Established presence with large CRE owners and managers.",
      "Handles the multi-party structure of CRE — owner, manager, tenant, tenant's contractor — natively.",
    ],
    rows: [
      {
        dimension: "Primary problem",
        them: "CRE compliance across vendors, tenants and tenant contractors",
        us: "Vendor COI compliance for the company that hires the vendors",
      },
      {
        dimension: "Built for",
        them: "Commercial real estate owners and managers with building operations",
        us: "Residential and mixed property managers, and small to mid GCs",
      },
      {
        dimension: "Pricing",
        them: "Quote-based; no public list pricing — ask them directly",
        us: "$99 / $249 / $499 per month, published",
      },
      {
        dimension: "Commitment",
        them: "Typically contracted — confirm the term",
        us: "Monthly, cancel any time",
      },
      {
        dimension: "Tenant compliance",
        them: "Yes — a core part of the product",
        us: "No. Vendor compliance only; if you need tenant workflows, buy Jones",
      },
      ...SHARED_ROWS_TAIL,
    ],
    whenThem: [
      "You manage commercial buildings and need tenant and tenant-contractor compliance, not just vendor compliance.",
      "Insurance approval has to gate physical building access through a formal workflow.",
      "You are a large CRE owner or manager with a compliance team.",
      "Multi-party structures — owner, manager, tenant, tenant's contractor — are the norm for you.",
    ],
    whenUs: [
      "Your compliance problem is your own vendor list, not your tenants'.",
      "Residential, mixed-use or contractor work rather than large commercial buildings.",
      "You want published pricing and same-day setup.",
      "Spanish-language chasing matters for your trade base.",
    ],
    faq: [
      {
        q: "Does CertShield handle tenant insurance compliance?",
        a: "No. CertShield is vendor compliance only. If your main problem is tenants and their contractors in commercial buildings, Jones is built for that and we are not — buy the right tool.",
      },
      {
        q: "How much does Jones cost?",
        a: "Jones does not publish list pricing; it is quoted based on portfolio and scope. Ask them directly and clarify whether tenant compliance is priced separately from vendor compliance.",
      },
      {
        q: "Can I use both?",
        a: "Some organisations do run different tools for tenant and vendor compliance, though most prefer one system. If tenant compliance is the larger problem, start there.",
      },
      {
        q: "Is CertShield a Jones alternative?",
        a: "Only for the vendor half of the problem. For residential property managers and general contractors, that is the whole problem — and it is where CertShield's pricing and setup time are the advantage.",
      },
    ],
  },

  {
    slug: "coi-tracking-spreadsheet",
    competitor: "a spreadsheet",
    title: "COI Tracking: Spreadsheet vs Software — Honest Comparison",
    h1: "COI tracking: spreadsheet vs software",
    description:
      "When a COI tracking spreadsheet is genuinely enough, when it stops working, and what actually changes when you move to software.",
    answer:
      "A COI tracking spreadsheet works well below roughly 25 vendors with one requirement tier and one maintainer who opens it weekly. It stops working when requirements vary by trade or property, when more than one person edits it, or when you need history rather than current state — because a cell that changed from red to green keeps no record of when or why.",
    keywords: [
      "coi tracking spreadsheet vs software",
      "is a spreadsheet enough for coi tracking",
      "certificate of insurance spreadsheet",
      "when to buy coi software",
    ],
    positioning:
      "Almost everyone starts here, and for a lot of firms it is genuinely the right answer. A spreadsheet costs nothing, needs no procurement, and can be reshaped in thirty seconds when your requirements change. The failure mode is not the file — it is that the work the file implies quietly stops happening.",
    credit: [
      "Free, immediate, and needs no approval from anyone.",
      "Infinitely flexible — a new column takes seconds, not a product roadmap.",
      "Everyone can already use it, with no training.",
      "Perfectly adequate below about 25 vendors with a single requirement set.",
    ],
    rows: [
      {
        dimension: "Cost",
        them: "Free, plus roughly an hour a week of someone's time",
        us: "From $99 per month",
      },
      {
        dimension: "Reading the certificate",
        them: "A person, manually — roughly 40 comparisons per certificate",
        us: "AI extraction, with a person verifying every verdict",
      },
      {
        dimension: "Endorsement verification",
        them: "Only if someone opens the endorsement pages every time",
        us: "Checked on every document, including claimed-but-not-attached",
      },
      {
        dimension: "Renewal reminders",
        them: "Depend on someone opening the file",
        us: "Sent automatically to the producer, EN and ES, on a cadence",
      },
      {
        dimension: "History",
        them: "None — a cell overwrites its own past",
        us: "Append-only audit trail of every document, verdict and message",
      },
      {
        dimension: "Multiple requirement tiers",
        them: "Possible, but each tier multiplies the manual comparison",
        us: "Stored once, applied to every incoming document",
      },
      {
        dimension: "Answering \"what did we know, and when\"",
        them: "Reconstruct from email and file dates, if you can",
        us: "One export",
      },
    ],
    whenThem: [
      "Under about 25 vendors.",
      "One requirement tier, applied uniformly.",
      "One person maintaining the file, with a weekly calendar block they actually keep.",
      "No audit, owner-reporting or lender obligation that needs history.",
    ],
    whenUs: [
      "Requirements differ by trade, property or owner.",
      "More than one person edits the tracker and nobody is sure whose version is current.",
      "Renewals are being missed, or discovered after the expiry date.",
      "Someone has asked for evidence of what you checked and when — and it took more than an afternoon to answer.",
    ],
    faq: [
      {
        q: "Is a spreadsheet enough for COI tracking?",
        a: "Below roughly 25 vendors with a single requirement tier and a maintainer who opens it weekly, yes. It is a legitimate system and you do not need to buy anything. The problems start when any of those three conditions stops being true.",
      },
      {
        q: "What is the biggest risk with spreadsheet COI tracking?",
        a: "That the spreadsheet is accurate and nobody looks at it. Every failed program we have seen failed at the reminder step, not the data step — the expiration dates were sitting right there in the file.",
      },
      {
        q: "Can I get expiry alerts out of a spreadsheet?",
        a: "You can build a days-to-expiry formula and conditional formatting, which gives you the view. The alert still requires someone to open the file, unless you script it — at which point you are maintaining software without the support.",
      },
      {
        q: "What actually changes when you move to software?",
        a: "Three things: certificates get read in full including endorsement pages every time rather than when someone has an hour, reminders go out without anyone remembering, and you gain a history you can hand to an owner, auditor or lawyer.",
      },
    ],
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
