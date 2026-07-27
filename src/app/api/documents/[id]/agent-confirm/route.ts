import { issueAgentConfirmation } from "@/lib/agent-confirm/issue";
import { getSessionOrg } from "@/lib/auth/session";
import { canWriteOrgData } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/config";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: documentId } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        demo: true,
        error:
          "Agent confirmation not sent — connect Supabase and mail transport.",
        message:
          "Demo mode — connect Supabase to request agent confirmation.",
      },
      { status: 503 },
    );
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWriteOrgData(session.role)) {
    return NextResponse.json(
      { error: "Read-only role cannot request agent confirmation" },
      { status: 403 },
    );
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("id, vendor_id")
    .eq("id", documentId)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const result = await issueAgentConfirmation({
    orgId: session.orgId,
    vendorId: doc.vendor_id,
    documentId: doc.id,
    actorId: session.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json(result);
}
