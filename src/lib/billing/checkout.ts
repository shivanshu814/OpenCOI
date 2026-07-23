import { planById, type PlanId } from "@/lib/billing/plans";

export function planByIdOrThrow(id: PlanId) {
  const plan = planById(id);
  if (!plan) throw new Error(`Unknown plan ${id}`);
  return plan;
}

/** Lightweight helpers tested without Paddle network. */
export function resolveCheckoutPlan(planId: string): {
  ok: true;
  planId: PlanId;
  priceId: string;
} | { ok: false; error: string } {
  if (planId !== "starter" && planId !== "pro" && planId !== "business") {
    return { ok: false, error: "Invalid plan" };
  }
  const plan = planById(planId);
  if (!plan) return { ok: false, error: "Unknown plan" };
  if (!plan.paddlePriceId) {
    return {
      ok: false,
      error:
        "Paddle price ID not configured. Set NEXT_PUBLIC_PADDLE_PRICE_* in env after creating products in Paddle.",
    };
  }
  return { ok: true, planId, priceId: plan.paddlePriceId };
}
