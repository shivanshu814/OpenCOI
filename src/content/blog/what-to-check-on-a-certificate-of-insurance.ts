import type { Post } from "@/content/blog/types";

export const post: Post = {
  slug: "what-to-check-on-a-certificate-of-insurance",
  title: "What to Check on a Certificate of Insurance — 12 Points",
  h1: "What to check on a certificate of insurance",
  description:
    "A 12-point checklist for reviewing a vendor COI: entity names, limits, dates, endorsements, carrier rating, and the traps on page two.",
  answer:
    "Check twelve things on every certificate: the insured's exact legal entity, your entity as certificate holder, required coverage lines, limits against your requirements, policy effective and expiration dates, additional insured endorsements for ongoing and completed operations, primary and non-contributory wording, waiver of subrogation, carrier admitted status and rating, producer contact details, description of operations, and that endorsement pages are attached.",
  published: "2026-07-31",
  category: "Guides",
  keywords: [
    "what to check on a certificate of insurance",
    "coi review checklist",
    "how to read a certificate of insurance",
    "coi verification checklist",
  ],
  readingMinutes: 8,
  body: [
    {
      kind: "p",
      text: "Most COI reviews stop at three things: is there a certificate, does it say general liability, and has it expired. That catches the obvious failures and misses every expensive one. Here is the full list, in the order it is fastest to work through.",
    },
    { kind: "h2", text: "The 12 points" },
    {
      kind: "ol",
      items: [
        "Insured name matches the entity you contracted with — exactly, including LLC/Inc and any DBA.",
        "Certificate holder is your exact legal entity, at the right address, spelled correctly.",
        "Every coverage line your contract requires is present: general liability, auto, workers' compensation, umbrella, and any trade-specific line such as pollution or professional.",
        "Each limit meets or beats your requirement — each occurrence, general aggregate, products-completed operations aggregate, auto combined single limit, employers liability.",
        "Policy effective dates start on or before the work starts.",
        "Policy expiration dates run past the end of the work, or you have a plan to re-verify mid-job.",
        "Additional insured status for ongoing operations, evidenced by the endorsement, not the checkbox.",
        "Additional insured status for completed operations, which is a separate endorsement and the one most often missing.",
        "Primary and non-contributory wording, backed by an endorsement rather than a sentence in the description box.",
        "Waiver of subrogation on general liability and on workers' compensation.",
        "Carrier is admitted in the state and financially rated; the NAIC number is present and resolves to a real carrier.",
        "Endorsement pages are physically attached — a certificate that claims four endorsements and attaches none is one document, not five.",
      ],
    },
    {
      kind: "cta",
      text: "Want the checklist applied to your own certificates instead?",
      href: "/free-audit",
      label: "Get a free 3-certificate audit",
    },
    { kind: "h2", text: "The four traps that catch experienced reviewers" },
    { kind: "h3", text: "1. The aggregate is shared" },
    {
      kind: "p",
      text: "A $2M general aggregate is not $2M for your project. It is $2M across everything that vendor does all policy year, and it can already be half gone. If a vendor works for twenty owners, you are all sharing one limit. For meaningful work, a per-project aggregate endorsement is the fix, and it is a separate thing to require and verify.",
    },
    { kind: "h3", text: "2. The certificate is fresh but the policy is not" },
    {
      kind: "p",
      text: "Certificates get reissued. A document dated last week can describe a policy that expires next week. Always read the policy expiration column rather than the issue date at the top of the form — it is a surprisingly common substitution when people are moving fast.",
    },
    { kind: "h3", text: "3. Workers' compensation with an owner exclusion" },
    {
      kind: "p",
      text: "Small trade businesses often carry a workers' compensation policy that excludes the owner-officers. The certificate looks compliant. If the person who falls off your roof is the owner, there is no comp coverage behind them, and the claim comes to you. The exclusion generally shows in the description box or on the policy, not in the limits grid.",
    },
    { kind: "h3", text: "4. The umbrella that does not follow form" },
    {
      kind: "p",
      text: "An umbrella limit only helps if the umbrella sits above the policies you care about and extends the same additional insured status. A vendor can carry a $5M umbrella that does not follow the additional insured grant of the underlying general liability. If the umbrella is doing real work in your requirement, ask whether it follows form and whether additional insureds are included.",
    },
    { kind: "h2", text: "Fraud signals worth a second look" },
    {
      kind: "ul",
      items: [
        "Producer contact details that go to a free email domain rather than an agency domain.",
        "A NAIC number that does not match the carrier named beside it.",
        "Fonts or alignment that change mid-document, or numbers that sit slightly off the field baseline.",
        "Limits that are unusually round and identical across every line.",
        "A certificate emailed by the vendor rather than issued by the agency, when everything else about the relationship is high-value.",
      ],
    },
    {
      kind: "callout",
      title: "The escalation that actually settles it",
      text: "For anything material, email the producer directly and ask them to confirm in writing that the policy is in force, that the endorsements are attached, and that the entity name is scheduled correctly. It takes one email, it creates a record, and it is the only check that does not depend on the PDF being genuine.",
    },
    { kind: "h2", text: "Doing this at scale" },
    {
      kind: "p",
      text: "Twelve checks across four coverage lines is roughly forty comparisons per certificate. It is entirely doable for five vendors and completely unrealistic for two hundred — which is how the check quietly degrades into \"is there a PDF in the folder\". If you are past the point where a careful person can hold the whole list, the answer is either fewer requirements or a system that applies the whole list every time.",
    },
    {
      kind: "cta",
      text: "CertShield runs every one of these checks on upload, and routes anything unclear to a person before you see a verdict.",
      href: "/pricing",
      label: "See how it works",
    },
  ],
  faq: [
    {
      q: "What is the most commonly missed item on a COI?",
      a: "Completed-operations additional insured status. The certificate's checkbox covers additional insured generally, the endorsement attached is often ongoing operations only, and the gap does not surface until a claim arrives after the job is finished.",
    },
    {
      q: "How long does it take to review a certificate properly?",
      a: "A careful manual review across all coverage lines and endorsements takes ten to twenty minutes per certificate, longer if endorsement pages have to be chased. That is the real reason spreadsheet-based tracking degrades — not laziness, arithmetic.",
    },
    {
      q: "Should I require a copy of the actual policy?",
      a: "For most vendor relationships, no — certificates plus endorsement pages are the practical standard. For large or high-hazard work, requesting the declarations page and key endorsements is reasonable and commonly agreed to.",
    },
    {
      q: "What limits should I require?",
      a: "It depends on the trade and the exposure. A common baseline for property maintenance vendors is $1M per occurrence and $2M aggregate on general liability, statutory workers' compensation with $1M employers liability, and $1M combined single limit on auto — with higher limits for roofing, structural and elevator work.",
    },
    {
      q: "Can this be automated?",
      a: "The reading and comparison can be. The judgment calls — an unusual exclusion, a non-standard carrier letter, an entity name that is close but not identical — should route to a person. Any tool that claims to automate all of it without review is overselling.",
    },
  ],
  related: [
    "how-to-track-vendor-insurance-certificates",
    "cg-20-10-vs-cg-20-37",
    "what-is-a-certificate-of-insurance",
  ],
};
