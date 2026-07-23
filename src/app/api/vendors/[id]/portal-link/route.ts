import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { issuePortalToken } from "@/lib/portal/tokens";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: vendorId } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      url: "https://getcertshield.vercel.app/portal/demo-token",
      expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(),
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("id", vendorId)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  try {
    const issued = await issuePortalToken({
      orgId: session.orgId,
      vendorId,
    });

    await supabase.from("audit_events").insert({
      org_id: session.orgId,
      actor_type: "admin",
      actor_id: session.userId,
      entity_type: "vendor",
      entity_id: vendorId,
      action: "portal_link_issued",
      after_state: { expires_at: issued.expiresAt },
    });

    return NextResponse.json({
      ok: true,
      url: issued.url,
      expiresAt: issued.expiresAt,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to issue portal link (apply migration 006?)",
      },
      { status: 500 },
    );
  }
}
