import { hostRedirect } from "@/lib/hosts";
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

/**
 * Only these paths need a Supabase round trip. The matcher below is broad
 * (it has to be, so the host split can act on marketing URLs too), so this
 * guard is what keeps `/`, `/pricing` and friends free of an auth call they
 * never had before.
 */
function needsSession(path: string): boolean {
  return (
    path === "/login" ||
    path === "/app" ||
    path.startsWith("/app/") ||
    path.startsWith("/api/")
  );
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

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);

  // Host split runs before anything else: a request on the wrong hostname is
  // answered with a redirect, never with a page. 308 (not 307/302) so the
  // method is preserved and crawlers treat it as permanent.
  const target = hostRedirect(
    request.headers.get("host"),
    path,
    request.nextUrl.search,
  );
  if (target) return NextResponse.redirect(target, 308);

  if (!needsSession(path)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // Demo / misconfigured: never throw inside Edge middleware.
  if (!isValidSupabaseUrl(url) || !key) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Routes that never read a cookie session: webhooks (signature-authed),
  // Inngest (signing key), the vendor portal (magic-link token), the public
  // API (Bearer key) and the geo lookups (static reference data). These used
  // to pay for a `getUser()` network round trip to Supabase Auth on every
  // call anyway — pure latency on the vendor-facing portal, which is the one
  // surface where we control none of the client's network.
  if (isPublicApi(path) || path.startsWith("/api/geo")) {
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

    const isApp = path.startsWith("/app");
    const requiresAuth = isApp || isAuthedApi(path);

    if (requiresAuth && !user) {
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
    console.error("[proxy] supabase session refresh failed", err);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return response;
}

export const config = {
  // Broad by design: the host split has to be able to redirect marketing URLs
  // (`/`, `/pricing`) that the old auth-only matcher never saw. Static assets
  // and image optimisation are excluded so they stay on the fast path.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|webmanifest)$).*)",
  ],
};
