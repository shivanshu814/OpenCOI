import { insertAuditEvent } from "@/lib/audit/write";
import { canAdminSensitive } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import {
  getPaddleServer,
  isPaddleServerConfigured,
} from "@/lib/billing/paddle-server";
import { isSupabaseConfigured } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  billingCancelSchema,
  validationErrorBody,
} from "@/lib/validation/schemas";
import { ApiError } from "@paddle/paddle-node-sdk";
import { NextResponse } from "next/server";

/**
 * Cancel the org's Paddle subscription.
 *
 * Two modes, chosen by the user in the cancel dialog:
 *   - next_billing_period (default) — schedules the cancel; the customer
 *     keeps the access they already paid for. Paddle sets scheduledChange
 *     and the status stays `active` until the period actually ends.
 *   - immediately — Paddle cancels now and prorates a refund for the
 *     unused portion of the period.
 *
 * The webhook (subscription.updated / subscription.canceled) is what flips
 * the mirrored org plan — never this route. The cancellation reason and
 * free-text feedback land in append-only audit_events so churn feedback is
 * never lost.
 */
export async function POST(request: Request) {
  const parsed = billingCancelSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      validationErrorBody(parsed.error, "Invalid cancellation request"),
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured() || !isPaddleServerConfigured()) {
    return NextResponse.json(
      {
        error:
          "Live billing is not configured yet — cancellation needs Supabase + Paddle server keys.",
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
      { error: "Admin only — ask a workspace admin to cancel the plan." },
      { status: 403 },
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
      { error: "No Paddle subscription found for this org." },
      { status: 409 },
    );
  }

  const paddle = getPaddleServer();
  let canceled;
  try {
    canceled = await paddle.subscriptions.cancel(subscriptionId, {
      effectiveFrom: parsed.data.effectiveFrom,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === "entity_not_found" || err.code === "not_found") {
        return NextResponse.json(
          {
            error:
              "Your subscription record was created in a test billing environment and can't be canceled here. Contact support and we'll sort it out.",
            paddleCode: err.code,
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: `Cancellation was rejected by billing: ${err.detail || err.code}`,
          paddleCode: err.code,
        },
        { status: 502 },
      );
    }
    throw err;
  }

  const scheduledFor = canceled.scheduledChange?.effectiveAt ?? null;

  await insertAuditEvent(supabase, {
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    entity_type: "subscription",
    entity_id: subscriptionId,
    action: "subscription_cancel_requested",
    reason: parsed.data.reason,
    after_state: {
      effective_from: parsed.data.effectiveFrom,
      cancel_reason: parsed.data.reason,
      feedback: parsed.data.feedback ?? null,
      paddle_status: canceled.status,
      scheduled_for: scheduledFor,
    },
  });

  return NextResponse.json({
    ok: true,
    status: canceled.status,
    scheduledFor,
    message:
      parsed.data.effectiveFrom === "immediately"
        ? "Subscription canceled. Paddle will prorate a refund for the unused time."
        : scheduledFor
          ? `Cancellation scheduled — you keep access until ${new Date(scheduledFor).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
          : "Cancellation scheduled for the end of your current billing period.",
  });
}
