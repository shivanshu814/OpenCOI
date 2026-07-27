import { getSessionOrg } from "@/lib/auth/session";
import { canAdminSensitive } from "@/lib/auth/roles";
import { resolveCheckoutPlan } from "@/lib/billing/checkout";
import { isSupabaseConfigured } from "@/lib/config";
import { NextResponse } from "next/server";

/** Returns checkout payload for Paddle.js overlay (custom_data includes org_id). */
export async function POST(request: Request) {
  const body = (await request.json()) as { planId?: string };
  const planId = body.planId?.trim() ?? "";
  const resolved = resolveCheckoutPlan(planId);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      priceId: resolved.priceId,
      planId: resolved.planId,
      customData: { org_id: "demo" },
      customerEmail: null,
      message:
        "Demo mode: open Paddle checkout only works with live env + Paddle keys.",
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint: "Sign in again, then retry checkout. If this persists, org bootstrap failed — contact support.",
      },
      { status: 401 },
    );
  }
  if (!canAdminSensitive(session.role)) {
    return NextResponse.json(
      { error: "Admin only — ask a workspace admin to change the plan." },
      { status: 403 },
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  return NextResponse.json({
    ok: true,
    priceId: resolved.priceId,
    planId: resolved.planId,
    customData: { org_id: session.orgId, plan_id: resolved.planId },
    customerEmail: session.email,
    successUrl: `${appUrl}/app/onboarding?checkout=success&plan=${resolved.planId}`,
  });
}
