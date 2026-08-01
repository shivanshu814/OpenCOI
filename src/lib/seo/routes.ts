/**
 * The public route map — one list, consumed by the sitemap, the footer's
 * site index and the `llms.txt` generator.
 *
 * Kept free of any content imports so it stays cheap: `hosts.ts` (which runs in
 * middleware on every request) mirrors these prefixes and must never end up
 * pulling the blog corpus into the edge bundle.
 */

export type PublicRoute = {
  path: string;
  /** Short label for footer / site-index links. */
  label: string;
  /** One-line purpose — feeds `llms.txt` so answer engines get page intent. */
  summary: string;
  priority: number;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  /** Grouping for the footer's site index. */
  group: "Product" | "Learn" | "Compare" | "Company" | "Legal";
};

export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  {
    path: "/",
    label: "COI tracking software",
    summary:
      "Home — what CertShield does, how the AI verification and auto-chase work, pricing summary.",
    priority: 1,
    changeFrequency: "weekly",
    group: "Product",
  },
  {
    path: "/pricing",
    label: "Pricing",
    summary: "Plans and prices: Starter $99, Pro $249, Business $499 per month.",
    priority: 0.9,
    changeFrequency: "monthly",
    group: "Product",
  },
  {
    path: "/free-audit",
    label: "Free COI audit",
    summary:
      "Free three-certificate audit — upload COIs and get gaps flagged, no card required.",
    priority: 0.9,
    changeFrequency: "monthly",
    group: "Product",
  },
  {
    path: "/coi-tracking-for-property-managers",
    label: "For property managers",
    summary:
      "COI tracking for residential and commercial property management companies.",
    priority: 0.85,
    changeFrequency: "monthly",
    group: "Product",
  },
  {
    path: "/subcontractor-insurance-tracking",
    label: "For contractors",
    summary:
      "Subcontractor insurance tracking and verification for small and mid-size general contractors.",
    priority: 0.85,
    changeFrequency: "monthly",
    group: "Product",
  },
  {
    path: "/security",
    label: "Security",
    summary:
      "Data residency, tenant isolation, encryption, AI vendor and retention answers.",
    priority: 0.6,
    changeFrequency: "monthly",
    group: "Product",
  },
  {
    path: "/help",
    label: "Help",
    summary: "How to upload, review, chase, use the portal and the API.",
    priority: 0.5,
    changeFrequency: "monthly",
    group: "Product",
  },

  {
    path: "/blog",
    label: "Blog",
    summary:
      "Plain-English guides on certificates of insurance, ACORD forms, endorsements and vendor risk.",
    priority: 0.8,
    changeFrequency: "weekly",
    group: "Learn",
  },
  {
    path: "/glossary",
    label: "COI glossary",
    summary:
      "Definitions of certificate of insurance terminology — ACORD 25, additional insured, CG 20 10, waiver of subrogation and more.",
    priority: 0.75,
    changeFrequency: "monthly",
    group: "Learn",
  },
  {
    path: "/vendor-insurance-requirements",
    label: "Requirements by trade",
    summary:
      "Commonly required insurance limits and endorsements by vendor trade, from janitorial to roofing.",
    priority: 0.8,
    changeFrequency: "monthly",
    group: "Learn",
  },

  {
    path: "/compare",
    label: "Compare",
    summary: "Side-by-side comparisons of COI tracking approaches and tools.",
    priority: 0.7,
    changeFrequency: "monthly",
    group: "Compare",
  },
  {
    path: "/compare/mycoi-alternative",
    label: "vs myCOI",
    summary: "CertShield compared with myCOI for small and mid-size firms.",
    priority: 0.75,
    changeFrequency: "monthly",
    group: "Compare",
  },
  {
    path: "/compare/trustlayer-alternative",
    label: "vs TrustLayer",
    summary: "CertShield compared with TrustLayer for COI verification.",
    priority: 0.75,
    changeFrequency: "monthly",
    group: "Compare",
  },
  {
    path: "/compare/jones-alternative",
    label: "vs Jones",
    summary:
      "CertShield compared with Jones for vendor and tenant insurance compliance.",
    priority: 0.75,
    changeFrequency: "monthly",
    group: "Compare",
  },
  {
    path: "/compare/coi-tracking-spreadsheet",
    label: "vs a spreadsheet",
    summary:
      "When a COI tracking spreadsheet is genuinely enough, and when it stops working.",
    priority: 0.75,
    changeFrequency: "monthly",
    group: "Compare",
  },

  {
    path: "/about",
    label: "About",
    summary: "Who builds CertShield, what it claims, and what it refuses to claim.",
    priority: 0.6,
    changeFrequency: "monthly",
    group: "Company",
  },
  {
    path: "/google",
    label: "Google sign-in",
    summary:
      "CertShield application home for Google OAuth — what the product does and how Google account data is used for sign-in.",
    priority: 0.3,
    changeFrequency: "yearly",
    group: "Company",
  },
  {
    path: "/careers",
    label: "Careers",
    summary: "Open roles at CertShield.",
    priority: 0.4,
    changeFrequency: "weekly",
    group: "Company",
  },

  {
    path: "/terms",
    label: "Terms",
    summary: "Terms of service for the CertShield subscription and website.",
    priority: 0.3,
    changeFrequency: "yearly",
    group: "Legal",
  },
  {
    path: "/privacy",
    label: "Privacy",
    summary: "Privacy policy and data handling.",
    priority: 0.3,
    changeFrequency: "yearly",
    group: "Legal",
  },
  {
    path: "/subprocessors",
    label: "Subprocessors",
    summary: "Third-party services that process customer data.",
    priority: 0.3,
    changeFrequency: "yearly",
    group: "Legal",
  },
  {
    path: "/refund",
    label: "Refund policy",
    summary: "How to cancel your subscription and when refunds apply.",
    priority: 0.3,
    changeFrequency: "yearly",
    group: "Legal",
  },
];

export function routesByGroup(): {
  group: PublicRoute["group"];
  routes: readonly PublicRoute[];
}[] {
  const order: PublicRoute["group"][] = [
    "Product",
    "Learn",
    "Compare",
    "Company",
    "Legal",
  ];
  return order.map((group) => ({
    group,
    routes: PUBLIC_ROUTES.filter((r) => r.group === group),
  }));
}
