import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Public / system routes — no session gate (webhooks, magic links, marketing). */
function isPublicApi(path: string): boolean {
  return (
    path.startsWith("/api/webhooks") ||
    path.startsWith("/api/inngest") ||
    path.startsWith("/api/portal") ||
    path.startsWith("/api/v1/") // API keys, not cookie session
  );
}

/** Cookie-session APIs that require a signed-in user. */
function isAuthedApi(path: string): boolean {
  if (!path.startsWith("/api/")) return false;
  if (isPublicApi(path)) return false;
  return true;
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  // Demo mode: no auth gate.
  if (!url || !key) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({
          request: { headers: requestHeaders },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Always refresh session when middleware runs (keeps JWT alive for Route Handlers).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isApp = path.startsWith("/app");
  const needsAuth = isApp || isAuthedApi(path);

  if (needsAuth && !user) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (path === "/login" && user) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/app/:path*",
    "/login",
    // Refresh session + gate cookie-auth APIs (exclude static assets)
    "/api/:path*",
  ],
};
