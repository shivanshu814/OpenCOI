import type { Post } from "@/content/blog/types";

export const post: Post = {
  slug: "how-much-insurance-should-a-contractor-have",
  title: "How Much Insurance Should a Contractor Have?",
  h1: "How much insurance should a contractor have?",
  description:
    "Typical liability limits required of roofers, plumbers, electricians, landscapers and cleaners — and how to set requirements you can actually enforce.",
  answer:
    "Most US property managers and general contractors require vendors to carry at least $1,000,000 per occurrence and $2,000,000 general aggregate on general liability, statutory workers' compensation with $1,000,000 employers liability, and $1,000,000 combined single limit on commercial auto. Higher-hazard trades such as roofing, structural and electrical work commonly carry an additional $1,000,000 to $5,000,000 in umbrella coverage.",
  published: "2026-07-31",
  category: "Benchmarks",
  keywords: [
    "how much insurance should a contractor have",
    "contractor insurance requirements",
    "how much insurance should a roofer have",
    "subcontractor insurance limits",
  ],
  readingMinutes: 7,
  body: [
    {
      kind: "callout",
      title: "Read this first",
      text: "These are commonly observed market practices, not advice. The right limits for your contracts depend on your exposure, your own policy, your lender and owner requirements, and your state's law. Have your broker and counsel set the numbers you put in a contract.",
    },
    { kind: "h2", text: "The baseline almost everyone starts from" },
    {
      kind: "table",
      head: ["Coverage", "Common minimum", "What it is protecting against"],
      rows: [
        [
          "General liability — each occurrence",
          "$1,000,000",
          "One incident: injury to a resident, damage to a unit",
        ],
        [
          "General liability — general aggregate",
          "$2,000,000",
          "Everything that vendor causes all policy year, everywhere",
        ],
        [
          "Products-completed operations aggregate",
          "$1,000,000–$2,000,000",
          "Claims that arise after the work is finished",
        ],
        [
          "Workers' compensation",
          "Statutory",
          "Injuries to the vendor's employees on your property",
        ],
        [
          "Employers liability",
          "$1,000,000 each accident / disease",
          "Injury claims that fall outside the comp system",
        ],
        [
          "Commercial auto",
          "$1,000,000 combined single limit",
          "The vendor's truck in your parking structure",
        ],
        [
          "Umbrella / excess",
          "$1,000,000–$5,000,000",
          "The severity tail — where the real money in a bad claim sits",
        ],
      ],
    },
    { kind: "h2", text: "Where the baseline is not enough" },
    {
      kind: "p",
      text: "Limits should track severity, not the size of the invoice. A $900 job can produce a seven-figure claim, which is exactly why cheap high-hazard trades are the most dangerous line on a vendor list.",
    },
    {
      kind: "table",
      head: ["Trade", "Typical requirement", "Why"],
      rows: [
        [
          "Roofing",
          "$1M/$2M GL plus $2M–$5M umbrella; completed operations non-negotiable",
          "Falls, fire from torch-down work, and water damage that surfaces years later",
        ],
        [
          "Electrical",
          "$1M/$2M GL plus $1M–$5M umbrella; completed operations",
          "Fire is the loss, and fire claims are catastrophic and delayed",
        ],
        [
          "Plumbing / HVAC",
          "$1M/$2M GL plus $1M–$2M umbrella; completed operations",
          "Water damage propagates through multiple units fast",
        ],
        [
          "Elevator / structural",
          "$2M/$4M GL plus $5M+ umbrella",
          "Life-safety exposure and long statutes of repose",
        ],
        [
          "Tree work",
          "$1M/$2M GL plus $1M–$2M umbrella; confirm no height exclusion",
          "Heights, chainsaws, and damage to adjacent property",
        ],
        [
          "Landscaping / janitorial",
          "$1M/$2M GL; auto matters more than umbrella",
          "Frequency risk — slips, chemical exposure, vehicle incidents",
        ],
        [
          "Pest control",
          "$1M/$2M GL plus pollution liability",
          "Chemical application is often excluded from a standard GL policy",
        ],
        [
          "Security services",
          "$1M/$2M GL; confirm no assault-and-battery exclusion",
          "The exact loss you are buying cover for is commonly excluded",
        ],
      ],
      caption:
        "Commonly observed requirement bands in US property management and construction. Set your own with your broker.",
    },
    {
      kind: "cta",
      text: "The full trade-by-trade table, including which endorsements to require for each.",
      href: "/vendor-insurance-requirements",
      label: "Vendor insurance requirements by trade",
    },
    { kind: "h2", text: "Limits are the easy half" },
    {
      kind: "p",
      text: "A vendor with $5M in limits and no additional insured endorsement has bought protection for themselves, not for you. In practice the endorsement requirements do more work than the numbers:",
    },
    {
      kind: "ul",
      items: [
        "Additional insured for ongoing operations (CG 20 10 or equivalent).",
        "Additional insured for completed operations (CG 20 37 or equivalent).",
        "Primary and non-contributory wording (CG 20 01 or blanket equivalent).",
        "Waiver of subrogation on general liability and workers' compensation.",
        "Per-project aggregate where a shared annual aggregate would be meaningless.",
        "Notice of cancellation to you, where the carrier will write it.",
      ],
    },
    { kind: "h2", text: "Setting requirements you can actually enforce" },
    {
      kind: "p",
      text: "The most common mistake is copying an enterprise requirement schedule onto a vendor base that cannot meet it. If half your trades cannot produce the paperwork, the requirement is not a standard — it is a stack of exceptions, and exceptions are where the uninsured vendors hide.",
    },
    {
      kind: "ol",
      items: [
        "Pick two or three tiers, not a bespoke schedule per vendor.",
        "Set limits your actual vendor market carries, then raise them at renewal rather than mid-relationship.",
        "Make the endorsement requirements absolute even where you flex on limits — they cost the vendor little and protect you most.",
        "Write the exact additional-insured entity wording into the agreement so it can be checked mechanically.",
        "Decide in advance what happens when a vendor fails, and apply it consistently. A requirement with no consequence is a preference.",
      ],
    },
  ],
  faq: [
    {
      q: "Is $1 million in general liability enough for a contractor?",
      a: "It is the common floor for low- and medium-hazard trades. For roofing, electrical, structural and elevator work, most owners layer an umbrella on top, because the per-occurrence limit is what stands between you and a severe claim.",
    },
    {
      q: "How much insurance should a roofer have?",
      a: "Commonly $1,000,000 per occurrence and $2,000,000 aggregate on general liability, plus $2,000,000 to $5,000,000 umbrella, with completed-operations additional insured status treated as non-negotiable because roofing failures surface years later.",
    },
    {
      q: "Do small vendors need workers' compensation?",
      a: "In most states, yes, once they have employees — and even sole proprietors on your property create exposure. Watch for owner-officer exclusions: the policy exists, the certificate looks compliant, and the one person actually doing the work is not covered by it.",
    },
    {
      q: "Should limits scale with contract value?",
      a: "Only loosely. Severity, not invoice size, drives claims — a small electrical job can burn a building. Set limits by hazard tier, not by spend.",
    },
    {
      q: "What if a good vendor cannot meet my limits?",
      a: "Options are a documented, time-boxed exception approved by whoever owns the risk; requiring an umbrella that closes the gap; or narrowing their scope to lower-hazard work. What does not work is an undocumented exception that outlives the person who granted it.",
    },
  ],
  related: [
    "what-to-check-on-a-certificate-of-insurance",
    "how-to-track-vendor-insurance-certificates",
    "cg-20-10-vs-cg-20-37",
  ],
};
