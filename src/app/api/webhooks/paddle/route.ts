import {
  clientIpFromHeaders,
  isPaddleWebhookIp,
} from "@/lib/billing/paddle-ips";
import {
  handlePaddleEvent,
  verifyPaddleWebhook,
} from "@/lib/billing/paddle-server";
import { isProductionRuntime } from "@/lib/runtime-env";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Only enforce the IP allowlist on the live-mode deployment. Sandbox uses
 * a different infrastructure with its own IPs (not published), and dev /
 * preview environments legitimately fire webhooks from local tunnels and
 * Paddle simulation IPs. Signature verification runs in every environment
 * regardless — the IP check is defence-in-depth for live, not the primary
 * gate anywhere.
 */
function shouldEnforceIpAllowlist(): boolean {
  return (
    isProductionRuntime() &&
    process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
  );
}

export async function POST(request: Request) {
  if (shouldEnforceIpAllowlist()) {
    const ip = clientIpFromHeaders(request.headers);
    const check = await isPaddleWebhookIp(ip);
    if (!check.allowed) {
      // 403 (not 401) — this isn't an auth failure to retry, it's a source
      // that Paddle doesn't deliver from. Signature verification would
      // reject it anyway; we're just short-circuiting to save cycles.
      console.warn("[paddle webhook] rejected non-Paddle IP", ip, check.reason);
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 },
      );
    }
  }

  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");

  try {
    const event = await verifyPaddleWebhook(rawBody, signature);
    const result = await handlePaddleEvent(event);
    return NextResponse.json({
      ok: true,
      eventType: event.eventType,
      ...result,
    });
  } catch (err) {
    console.error("paddle webhook error", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Webhook verification failed",
      },
      { status: 400 },
    );
  }
}
