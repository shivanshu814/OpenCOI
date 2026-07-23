import { handlePaddleEvent, verifyPaddleWebhook } from "@/lib/billing/paddle-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
