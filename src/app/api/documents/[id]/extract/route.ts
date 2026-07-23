import { getSessionOrg } from "@/lib/auth/session";
import { isClaudeConfigured, isSupabaseConfigured } from "@/lib/config";
import { extractDocumentFromStorage } from "@/lib/documents/ingest";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

/** Manually run extraction for a stuck `uploaded` document (no Inngest). */
export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Connect Supabase to run extraction." },
      { status: 400 },
    );
  }

  if (!isClaudeConfigured()) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set" },
      { status: 400 },
    );
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await extractDocumentFromStorage({
      documentId: id,
      orgId: session.orgId,
    });
    return NextResponse.json({
      ok: true,
      status: "in_internal_review",
      reviewPath: `/app/review/${id}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 400 },
    );
  }
}
