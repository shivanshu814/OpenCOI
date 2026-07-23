import { resolveApiKey } from "@/lib/api/keys";
import { isSupabaseConfigured } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      demo: true,
      vendor: { id, name: "Demo", status: "compliant" },
    });
  }

  const auth = await resolveApiKey(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vendors")
    .select("id, name, email, phone, trade, status, updated_at")
    .eq("org_id", auth.orgId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    vendor: data,
    do_not_dispatch: data.status === "non_compliant" || data.status === "missing_docs",
    disclaimer:
      "Document review assistance — not legal, insurance, or professional advice. Mid-term cancellations are mitigated via agent confirmation — not automatic detection.",
  });
}
