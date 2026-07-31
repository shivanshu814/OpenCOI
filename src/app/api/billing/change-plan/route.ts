import { canAdminSensitive } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { resolveCheckoutPlan } from "@/lib/billing/checkout";
import {
  getPaddleServer,
  isPaddleServerConfigured,
} from "@/lib/billing/paddle-server";
import { planById } from "@/lib/billing/plans";
import { isSupabaseConfigured } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  billingCheckoutSchema,
  validationErrorBody,
} from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

/**
 * Change the plan on an existing Paddle subscription.
 *
 * Distinct from /api/billing/checkout on purpose:
 *   - checkout  → user has NO active sub; opens the Paddle overlay
 *   - change-plan → user HAS an active sub; PATCHes the sub in place
 *
 * Without this route the checkout overlay would open a SECOND subscription
 * for the same org, and the customer would be billed for both — a double-
 * charge dressed up as an "Upgrade" button. Paddle's own change-plan API
 * handles proration automatically (prorated_immediately here), so a mid-
 * cycle upgrade produces one invoice for the price difference.
 *
 * onPaymentFailure=prevent_change: if the card declines the prorated
 * charge, keep the customer on the old plan rather than letting them use
 * a plan they haven't paid for.
 */
export async function POST(request: Request) {
  const parsed = billingCheckoutSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      validationErrorBody(parsed.error, "Unknown plan"),
      { status: 400 },
    );
  }
  const planId = parsed.data.planId?.trim() ?? "";
  const resolved = resolveCheckoutPlan(planId);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  if (!isSupabaseConfigured() || !isPaddleServerConfigured()) {
    return NextResponse.json(
      {
        error:
          "Live billing is not configured yet — plan changes need Supabase + Paddle server keys.",
      },
      { status: 503 },
    );
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAdminSensitive(session.role)) {
    return NextResponse.json(
      { error: "Admin only — ask a workspace admin to change the plan." },
      { status: 403 },
    );
  }

  // Idempotent no-op: clicking "Current plan" (or racing a plan switch) must
  // never produce a Paddle write, an audit event, or a prorated invoice.
  if (session.plan === resolved.planId) {
    return NextResponse.json({
      ok: true,
      noop: true,
      planId: resolved.planId,
      message: "You are already on this plan.",
    });
  }

  const status = (session.subscriptionStatus ?? "").toLowerCase();
  if (status !== "active" && status !== "trialing") {
    // past_due, paused, canceled, or missing — the sub cannot accept an
    // items change until the underlying billing issue is resolved.
    return NextResponse.json(
      {
        error:
          "Your subscription is not currently active. Update your payment method or contact support before changing plans.",
        subscriptionStatus: session.subscriptionStatus,
      },
      { status: 409 },
    );
  }

  const supabase = createAdminClient();
  const { data: org, error: orgErr } = await supabase
    .from("orgs")
    .select("paddle_subscription_id")
    .eq("id", session.orgId)
    .maybeSingle();

  if (orgErr) {
    return NextResponse.json({ error: orgErr.message }, { status: 500 });
  }
  const subscriptionId = (org?.paddle_subscription_id as string | null) ?? null;
  if (!subscriptionId) {
    return NextResponse.json(
      {
        error:
          "No Paddle subscription found for this org. Complete checkout first.",
      },
      { status: 409 },
    );
  }

  const paddle = getPaddleServer();
  const updated = await paddle.subscriptions.update(subscriptionId, {
    items: [{ priceId: resolved.priceId, quantity: 1 }],
    prorationBillingMode: "prorated_immediately",
    onPaymentFailure: "prevent_change",
  });

  // The subscription.updated webhook will sync the DB (plans, status, period).
  // Returning the fresh Paddle state lets the UI show the change immediately
  // instead of waiting for the round-trip.
  const newPlan = planById(resolved.planId);
  return NextResponse.json({
    ok: true,
    planId: resolved.planId,
    planName: newPlan?.name ?? resolved.planId,
    subscriptionId: updated.id,
    status: updated.status,
    nextBilledAt: updated.nextBilledAt ?? null,
  });
}
