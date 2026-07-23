import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/app";
  const path = decodeURIComponent(raw);
  // Only allow relative in-app paths
  if (!path.startsWith("/") || path.startsWith("//")) return "/app";
  return path;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const next = safeNextPath(
    searchParams.get("next") ?? cookieStore.get("cs_auth_next")?.value,
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(`${origin}${next}`);
      res.cookies.set("cs_auth_next", "", { path: "/", maxAge: 0 });
      return res;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
