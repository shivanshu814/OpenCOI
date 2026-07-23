import { resolveApiKey } from "@/lib/api/keys";
import { isSupabaseConfigured } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/** Public REST — list vendors (E4 / Zapier). Auth: Bearer cs_live_… */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      demo: true,
      vendors: [
        {
          id: "demo",
          name: "Demo Roofing LLC",
          status: "expiring",
          email: "ops@demo.com",
        },
      ],
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
    .order("name")
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    vendors: data ?? [],
    disclaimer:
      "Document review assistance — not legal, insurance, or professional advice.",
  });
}
