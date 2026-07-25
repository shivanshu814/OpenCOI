import { isSupabaseConfigured } from "@/lib/config";
import { postmarkInboundSchema } from "@/lib/email/postmark-inbound";
import { processInboundEmail } from "@/lib/email/process-inbound";
import { isProductionRuntime } from "@/lib/runtime-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function safeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function authorizeInbound(request: Request): boolean {
  const user = process.env.POSTMARK_INBOUND_BASIC_USER?.trim();
  const pass = process.env.POSTMARK_INBOUND_BASIC_PASSWORD?.trim();
  const bearer = process.env.POSTMARK_INBOUND_HOOK_TOKEN?.trim();

  // Prod fail-closed: require at least one secret on deployed hosts.
  if (!user && !pass && !bearer) {
    return !isProductionRuntime();
  }

  const auth = request.headers.get("authorization");
  if (bearer && auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (safeEqualString(token, bearer)) return true;
  }

  if (user && pass && auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    const colon = decoded.indexOf(":");
    if (colon < 0) return false;
    const u = decoded.slice(0, colon);
    const p = decoded.slice(colon + 1);
    if (safeEqualString(u, user) && safeEqualString(p, pass)) return true;
  }

  return false;
}

export async function POST(request: Request) {
  if (!authorizeInbound(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Acknowledge so Postmark does not retry; demo has no persistence.
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "Supabase not configured — inbound acknowledged, not persisted",
    });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postmarkInboundSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Postmark payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    // Ensure admin client can construct (throws if service key missing).
    createAdminClient();
    const result = await processInboundEmail(parsed.data);
    // Always 200 on handled/ignored — Postmark retries only on 5xx.
    return NextResponse.json(result);
  } catch (err) {
    console.error("postmark inbound", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Inbound processing failed",
      },
      { status: 500 },
    );
  }
}
