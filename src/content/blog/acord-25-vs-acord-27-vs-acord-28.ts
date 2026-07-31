import type { Post } from "@/content/blog/types";

export const post: Post = {
  slug: "acord-25-vs-acord-27-vs-acord-28",
  title: "ACORD 25 vs 27 vs 28 — Which Form You Need",
  h1: "ACORD 25 vs ACORD 27 vs ACORD 28",
  description:
    "ACORD 25 evidences liability coverage, 27 and 28 evidence property coverage. Which form to request from a vendor, and what each one proves.",
  answer:
    "ACORD 25 is the Certificate of Liability Insurance — the form used to evidence general liability, auto, umbrella and workers' compensation. ACORD 27 is the Evidence of Property Insurance, used mainly for lender and mortgagee interests. ACORD 28 is the Evidence of Commercial Property Insurance, a fuller commercial property form. Vendor compliance almost always means ACORD 25.",
  published: "2026-07-31",
  category: "Definitions",
  keywords: [
    "acord 25 vs acord 27",
    "acord 28 form",
    "acord forms explained",
    "evidence of property insurance",
  ],
  readingMinutes: 5,
  body: [
    {
      kind: "p",
      text: "ACORD is the industry body that standardizes insurance forms in the US. Because nearly every agency management system produces the same forms, a certificate from a Florida roofer and one from an Oregon landscaper have identical field layouts — which is exactly what makes automated reading of certificates practical at all.",
    },
    {
      kind: "table",
      head: ["Form", "Official name", "Evidences", "You will use it for"],
      rows: [
        [
          "ACORD 25",
          "Certificate of Liability Insurance",
          "General liability, automobile, umbrella/excess, workers' compensation and employers liability",
          "Essentially all vendor and subcontractor compliance",
        ],
        [
          "ACORD 27",
          "Evidence of Property Insurance",
          "Property coverage on a specific location, with mortgagee/loss payee interests",
          "Lender requests, leases, financed equipment",
        ],
        [
          "ACORD 28",
          "Evidence of Commercial Property Insurance",
          "Commercial property coverage in more detail, including perils and deductibles",
          "Commercial leases and larger property interests",
        ],
        [
          "ACORD 855 / others",
          "Various state and purpose-specific certificates",
          "Trade or state-mandated evidence, e.g. certain contractor filings",
          "Occasional, jurisdiction-specific requests",
        ],
      ],
    },
    { kind: "h2", text: "When a vendor sends the wrong form" },
    {
      kind: "p",
      text: "It happens more than you would expect, usually because a request said only \"send me your insurance\". If you receive an ACORD 27 or 28 when you asked for liability evidence, you have proof that a building is insured and no proof that the vendor can pay for injuring someone in it. Send it back and ask specifically for the ACORD 25 with endorsements.",
    },
    {
      kind: "callout",
      title: "Non-ACORD documents are not automatically invalid",
      text: "Some carriers issue their own certificate layouts, and surplus-lines or specialty policies sometimes come with a carrier letter instead. These can be perfectly legitimate. They just cannot be read by pattern — a non-standard document should route to a person rather than be scored automatically, which is how we handle it too.",
    },
    { kind: "h2", text: "What the ACORD 25 will never tell you" },
    {
      kind: "ul",
      items: [
        "Which endorsement forms are attached to the policy — there is no field for form numbers.",
        "Whether the policy has an exclusion that guts the coverage you care about, such as a residential or roofing exclusion.",
        "The deductible or self-insured retention behind the limits.",
        "Whether the aggregate limit has already been eroded by prior claims this policy year.",
        "Whether the policy was cancelled the week after the certificate was issued.",
      ],
    },
    {
      kind: "p",
      text: "Those five blind spots are why serious requirement lists ask for endorsement pages alongside the certificate, and why high-value relationships get a written confirmation from the producer rather than relying on the PDF alone.",
    },
    {
      kind: "cta",
      text: "Once you know the form, the question becomes what to verify on it.",
      href: "/blog/what-to-check-on-a-certificate-of-insurance",
      label: "The 12-point COI check",
    },
  ],
  faq: [
    {
      q: "Which ACORD form do I ask a subcontractor for?",
      a: "ACORD 25, the Certificate of Liability Insurance, plus the endorsement pages for additional insured, primary and non-contributory, and waiver of subrogation. Property forms are not relevant to most subcontractor risk.",
    },
    {
      q: "What is the difference between ACORD 27 and ACORD 28?",
      a: "Both evidence property insurance. ACORD 27 is the shorter form aimed at lender and mortgagee interests; ACORD 28 is the fuller commercial property version showing more coverage detail, and is what commercial leases usually call for.",
    },
    {
      q: "Is an ACORD 25 required by law?",
      a: "No. ACORD forms are industry standards, not statutes. They are required because contracts require them, which is also why your vendor agreement should name the form and the endorsements explicitly.",
    },
    {
      q: "Can a certificate be issued on a carrier's own form instead?",
      a: "Yes, and it is legitimate. It simply cannot be validated by layout, so a non-ACORD document should be reviewed by a person rather than pattern-matched.",
    },
    {
      q: "Does the ACORD 25 list endorsement form numbers?",
      a: "No. It has checkboxes for additional insured and waiver of subrogation and a free-text description box, but no field for form numbers or edition dates. The endorsement pages are the only place those appear.",
    },
  ],
  related: [
    "what-is-a-certificate-of-insurance",
    "what-to-check-on-a-certificate-of-insurance",
    "additional-insured-vs-certificate-holder",
  ],
};
