import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// ── Route Configuration ───────────────────────────────────────

const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/blog",
  "/how-it-works",
  "/changelog",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/confirm",
] as const;

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"] as const;

const PROTECTED_PREFIXES = [
  "/home",
  "/create",
  "/calendar",
  "/posts",
  "/analytics",
  "/inbox",
  "/accounts",
  "/media",
  "/workspace",
  "/settings",
  "/billing",
  "/onboarding",
] as const;

// API routes that require authentication (not webhooks)
const PROTECTED_API_PREFIXES = [
  "/api/posts",
  "/api/schedule",
  "/api/accounts",
  "/api/analytics",
  "/api/media",
  "/api/inbox",
  "/api/usage",
  "/api/ai/captions",
  "/api/ai/hashtags",
  "/api/ai/rewrite",
  "/api/ai",
  "/api/billing/checkout",
  "/api/billing/portal",
  "/api/billing/info",
  "/api/workspace",
  "/api/workspaces",
  "/api/onboarding",
  "/api/invitations",
  "/api/profile",
] as const;

// Public API routes (webhooks, public endpoints)
const PUBLIC_API_PREFIXES = [
  "/api/webhooks",
  "/api/billing/webhook",
] as const;

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedApiRoute(pathname: string): boolean {
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

// ── Main Middleware ───────────────────────────────────────────

/**
 * Create a redirect response that preserves session cookies from
 * the Supabase response (so refreshed tokens aren't lost).
 */
function redirectWithCookies(
  url: URL,
  supabaseResponse: NextResponse
): NextResponse {
  const redirect = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, cookie as any);
  });
  return redirect;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, Next.js internals, and favicons
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  // For public routes that don't need auth info, skip the session check entirely
  const needsAuth = isProtectedRoute(pathname) || isProtectedApiRoute(pathname);
  const isAuth = isAuthRoute(pathname);
  const isLanding = pathname === "/";

  if (!needsAuth && !isAuth && !isLanding) {
    return NextResponse.next();
  }

  // Only refresh session when we actually need user state
  const { supabaseResponse, user } = await updateSession(request);

  // ── Protected page routes ─────────────────────────────────
  if (isProtectedRoute(pathname)) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return redirectWithCookies(loginUrl, supabaseResponse);
    }

    return supabaseResponse;
  }

  // ── Protected API routes ──────────────────────────────────
  if (isProtectedApiRoute(pathname)) {
    if (!user) {
      // Include any refreshed cookies so the next retry can succeed
      const res = NextResponse.json(
        { data: null, error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        res.cookies.set(cookie.name, cookie.value, cookie as any);
      });
      return res;
    }
    return supabaseResponse;
  }

  // ── Landing page: redirect logged-in users to dashboard ──
  if (pathname === "/" && user) {
    return redirectWithCookies(new URL("/home", request.url), supabaseResponse);
  }

  // ── Auth routes (redirect if already logged in) ───────────
  if (isAuthRoute(pathname) && user) {
    const redirectTo = request.nextUrl.searchParams.get("next") ?? "/home";
    return redirectWithCookies(new URL(redirectTo, request.url), supabaseResponse);
  }

  // ── Security headers for all responses ───────────────────
  return supabaseResponse;
}

// ── Matcher ───────────────────────────────────────────────────
// Run middleware on all routes except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
