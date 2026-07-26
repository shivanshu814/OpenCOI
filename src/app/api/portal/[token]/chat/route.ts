import {
  answerVendorQuestion,
  describeSupportChatError,
  HOURLY_MESSAGE_LIMIT,
  MAX_QUESTION_CHARS,
  rateLimitMessage,
  sanitizeQuestion,
} from "@/lib/ai/support-chat";
import { insertAuditEvent } from "@/lib/audit/write";
import { isClaudeConfigured, isSupabaseConfigured } from "@/lib/config";
import {
  buildSupportContext,
  countRecentVendorMessages,
  loadTranscript,
} from "@/lib/portal/support-context";
import { resolvePortalToken } from "@/lib/portal/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  message: z.string().min(1).max(MAX_QUESTION_CHARS * 4),
});

/**
 * F4 — vendor support chat turn. Auth is the magic-link token itself (rule 7:
 * vendor actions are never behind a password), so this endpoint is treated as
 * public: bounded input, per-vendor hourly cap, and no data outside the
 * vendor's own org/vendor scope ever enters the prompt.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Support chat unavailable in demo mode" },
      { status: 503 },
    );
  }

  const { token } = await context.params;
  const ctx = await resolvePortalToken(token);
  if (!ctx) {
    return NextResponse.json(
      { error: "Invalid or expired portal link" },
      { status: 401 },
    );
  }

  const locale = ctx.preferredLocale;

  if (!isClaudeConfigured()) {
    return NextResponse.json(
      { error: describeSupportChatError(new Error("OPENROUTER_API_KEY"), locale) },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  const question = parsed.success ? sanitizeQuestion(parsed.data.message) : null;
  if (!question) {
    return NextResponse.json(
      {
        error:
          locale === "es"
            ? "Escriba una pregunta."
            : "Type a question first.",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const recent = await countRecentVendorMessages(admin, ctx.vendorId);
  if (recent >= HOURLY_MESSAGE_LIMIT) {
    return NextResponse.json(
      { error: rateLimitMessage(locale) },
      { status: 429 },
    );
  }

  try {
    const [supportCtx, history] = await Promise.all([
      buildSupportContext(ctx, admin),
      loadTranscript(admin, ctx.orgId, ctx.vendorId),
    ]);

    const result = await answerVendorQuestion({
      ctx: supportCtx,
      history,
      question,
    });

    // Persist both turns together so a transcript can never show an answer
    // with no question attached.
    await admin.from("support_chat_messages").insert([
      {
        org_id: ctx.orgId,
        vendor_id: ctx.vendorId,
        role: "vendor",
        content: question,
        locale,
      },
      {
        org_id: ctx.orgId,
        vendor_id: ctx.vendorId,
        role: "assistant",
        content: result.answer,
        locale,
        model_version: result.meta.model_version,
        prompt_version: result.meta.prompt_version,
        cost_usd: result.meta.cost_usd,
        latency_ms: result.meta.latency_ms,
      },
    ]);

    await insertAuditEvent(
      admin,
      {
        org_id: ctx.orgId,
        actor_type: "vendor",
        actor_id: ctx.vendorId,
        entity_type: "vendor",
        entity_id: ctx.vendorId,
        action: "portal_support_chat",
        after_state: {
          token_id: ctx.tokenId,
          locale,
          gaps_in_context: supportCtx.gaps.length,
          model_version: result.meta.model_version,
          prompt_version: result.meta.prompt_version,
          cost_usd: result.meta.cost_usd,
          latency_ms: result.meta.latency_ms,
        },
      },
      { request },
    );

    return NextResponse.json({
      ok: true,
      answer: result.answer,
      remaining: Math.max(0, HOURLY_MESSAGE_LIMIT - (recent + 1)),
    });
  } catch (err) {
    return NextResponse.json(
      { error: describeSupportChatError(err, locale) },
      { status: 502 },
    );
  }
}
