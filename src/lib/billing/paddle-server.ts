import {
  planByPaddlePriceId,
  type PlanId,
} from "@/lib/billing/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditEvent } from "@/lib/audit/write";
import { Environment, Paddle, type EventEntity } from "@paddle/paddle-node-sdk";

export function isPaddleServerConfigured(): boolean {
  return Boolean(
    process.env.PADDLE_API_KEY?.trim() &&
      process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET?.trim(),
  );
}

export function getPaddleServer(): Paddle {
  const apiKey = process.env.PADDLE_API_KEY?.trim();
  if (!apiKey) throw new Error("PADDLE_API_KEY missing");
  const environment =
    process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
      ? Environment.production
      : Environment.sandbox;
  return new Paddle(apiKey, { environment });
}

export async function verifyPaddleWebhook(
  rawBody: string,
  signature: string | null,
): Promise<EventEntity> {
  const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("PADDLE_NOTIFICATION_WEBHOOK_SECRET missing");
  if (!signature) throw new Error("Missing Paddle-Signature header");
  const paddle = getPaddleServer();
  return paddle.webhooks.unmarshal(rawBody, secret, signature);
}

type SubLike = {
  id: string;
  status: string;
  customerId?: string | null;
  customData?: unknown;
  items?: Array<{ price?: { id?: string } | null }> | null;
  currentBillingPeriod?: {
    startsAt?: string | null;
    endsAt?: string | null;
  } | null;
};

function orgIdFromCustomData(customData: unknown): string | null {
  if (!customData || typeof customData !== "object") return null;
  const data = customData as Record<string, unknown>;
  const orgId = data.org_id ?? data.orgId;
  return typeof orgId === "string" && orgId.length > 0 ? orgId : null;
}

function planFromSub(sub: SubLike): PlanId | null {
  const priceId = sub.items?.[0]?.price?.id;
  return planByPaddlePriceId(priceId)?.id ?? null;
}

/** Upsert subscription row + mirror plan onto org. Idempotent on paddle_subscription_id. */
export async function syncSubscriptionFromPaddle(
  sub: SubLike,
): Promise<{ ok: true; orgId: string | null } | { ok: false; error: string }> {
  const orgIdFromCheckout = orgIdFromCustomData(sub.customData);
  const planId = planFromSub(sub);
  const supabase = createAdminClient();

  // Ownership check: never bind a subscription to an arbitrary org_id from
  // client-influenced customData. Prefer an existing paddle_customer_id match;
  // otherwise only accept customData.org_id when that org has no customer yet
  // or already owns this customer id.
  let orgId: string | null = null;

  if (sub.customerId) {
    const { data: byCustomer } = await supabase
      .from("orgs")
      .select("id, paddle_customer_id")
      .eq("paddle_customer_id", sub.customerId)
      .maybeSingle();
    if (byCustomer?.id) {
      orgId = byCustomer.id as string;
    }
  }

  if (!orgId && orgIdFromCheckout) {
    const { data: claimed } = await supabase
      .from("orgs")
      .select("id, paddle_customer_id")
      .eq("id", orgIdFromCheckout)
      .maybeSingle();

    if (!claimed) {
      return { ok: false, error: "org_id from checkout not found" };
    }

    const existingCustomer = claimed.paddle_customer_id as string | null;
    if (
      existingCustomer &&
      sub.customerId &&
      existingCustomer !== sub.customerId
    ) {
      return {
        ok: false,
        error: "org already bound to a different Paddle customer",
      };
    }

    orgId = claimed.id as string;
  }

  if (!orgId) {
    // Still record the subscription row for ops, but do not touch any org plan.
    const rowOrphan = {
      paddle_subscription_id: sub.id,
      paddle_customer_id: sub.customerId ?? null,
      org_id: null as string | null,
      plan: planId,
      status: sub.status,
      current_period_start: sub.currentBillingPeriod?.startsAt ?? null,
      current_period_end: sub.currentBillingPeriod?.endsAt ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error: orphanErr } = await supabase
      .from("subscriptions")
      .upsert(rowOrphan, { onConflict: "paddle_subscription_id" });
    if (orphanErr) return { ok: false, error: orphanErr.message };
    return { ok: true, orgId: null };
  }

  const row = {
    paddle_subscription_id: sub.id,
    paddle_customer_id: sub.customerId ?? null,
    org_id: orgId,
    plan: planId,
    status: sub.status,
    current_period_start: sub.currentBillingPeriod?.startsAt ?? null,
    current_period_end: sub.currentBillingPeriod?.endsAt ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("subscriptions").upsert(row, {
    onConflict: "paddle_subscription_id",
  });
  if (error) return { ok: false, error: error.message };

  const active =
    sub.status === "active" ||
    sub.status === "trialing" ||
    sub.status === "past_due";

  await supabase
    .from("orgs")
    .update({
      plan: active && planId ? planId : null,
      paddle_customer_id: sub.customerId ?? null,
      paddle_subscription_id: sub.id,
      subscription_status: sub.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  await insertAuditEvent(supabase, {
    org_id: orgId,
    actor_type: "system",
    actor_id: "paddle:webhook",
    entity_type: "subscription",
    entity_id: orgId,
    action: `subscription_${sub.status}`,
    after_state: row,
  }, { captureRequest: false });

  return { ok: true, orgId };
}

const SUB_EVENTS = new Set([
  "subscription.activated",
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
]);

export async function handlePaddleEvent(
  event: EventEntity,
): Promise<{ handled: boolean; detail?: string }> {
  const type = event.eventType;

  if (SUB_EVENTS.has(type)) {
    const data = event.data as SubLike;
    if (!data?.id || !data?.status) {
      return { handled: false, detail: "invalid subscription payload" };
    }
    const result = await syncSubscriptionFromPaddle(data);
    if (!result.ok) return { handled: false, detail: result.error };
    return { handled: true, detail: `synced ${data.id}` };
  }

  if (type === "transaction.completed") {
    return { handled: true, detail: "transaction.completed acknowledged" };
  }

  return { handled: false, detail: `ignored ${type}` };
}
