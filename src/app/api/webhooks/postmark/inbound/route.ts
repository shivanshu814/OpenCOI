import { isSupabaseConfigured } from "@/lib/config";
import { postmarkInboundSchema } from "@/lib/email/postmark-inbound";
import { processInboundEmail } from "@/lib/email/process-inbound";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorizeInbound(request: Request): boolean {
  const user = process.env.POSTMARK_INBOUND_BASIC_USER;
  const pass = process.env.POSTMARK_INBOUND_BASIC_PASSWORD;
  const bearer = process.env.POSTMARK_INBOUND_HOOK_TOKEN;

  // No secrets configured → allow (local/dev); set secrets in production.
  if (!user && !pass && !bearer) return true;

  const auth = request.headers.get("authorization");
  if (bearer && auth === `Bearer ${bearer}`) return true;

  if (user && pass && auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    const [u, p] = decoded.split(":");
    if (u === user && p === pass) return true;
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
