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

function isValidSupabaseUrl(value: string | undefined): value is string {
  const raw = value?.trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return (
      (u.protocol === "https:" || u.protocol === "http:") &&
      u.hostname.includes("supabase")
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  // Demo / misconfigured: never throw inside Edge middleware.
  if (!isValidSupabaseUrl(url) || !key) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  try {
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
  } catch (err) {
    console.error("[middleware] supabase session refresh failed", err);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
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
