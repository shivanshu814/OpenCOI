/** Pricing & packaging — docs/01 §8. Price IDs come from Paddle Dashboard via env. */

export type PlanId = "starter" | "pro" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthly: number;
  vendorLimit: number | null;
  /** Paddle price ID (pri_…) — empty until founder creates products in Paddle. */
  paddlePriceId: string;
  features: string[];
  /** Features that are "coming soon" — never claim as live in v0 (docs/01 §0). */
  comingSoon?: string[];
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 99,
    vendorLimit: 25,
    paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER ?? "",
    features: [
      "25 vendors tracked",
      "AI COI verification + endorsement checks",
      "Auto-chase email (EN + ES)",
      "Traffic-light dashboard + audit trail",
      "Compliance report PDFs",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 249,
    vendorLimit: 100,
    paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO ?? "",
    features: [
      "100 vendors tracked",
      "Everything in Starter",
      "Priority document review queue",
      "Per-property requirements",
      "Vendor magic-link portal",
      "SMS chasing (TCPA opt-in)",
      "Agent confirmations + fraud risk signals",
      "Carrier AM Best checks + compliance scores",
      "Weekly digest email",
    ],
    comingSoon: ["Owner reports"],
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 499,
    vendorLimit: null,
    paddlePriceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS ?? "",
    features: [
      "Unlimited vendors",
      "Everything in Pro",
      "Dedicated onboarding support",
    ],
    comingSoon: ["White-label, integrations, API, roles"],
  },
];

export function planById(id: string | null | undefined): Plan | undefined {
  if (!id) return undefined;
  return PLANS.find((p) => p.id === id);
}

export function planByPaddlePriceId(
  priceId: string | null | undefined,
): Plan | undefined {
  if (!priceId) return undefined;
  return PLANS.find((p) => p.paddlePriceId && p.paddlePriceId === priceId);
}
