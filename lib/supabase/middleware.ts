import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// ── Supabase Middleware Helper ────────────────────────────────
// Refreshes the user's auth session on every request so it
// never expires while the user is active.
// Called from the root middleware.ts.

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase env vars in middleware");
    return { supabaseResponse, user: null };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Try getSession (local JWT read) first for speed.
  // If that fails, fall back to getUser (server validation) which
  // can recover from edge cases where getSession returns null but
  // the refresh token is still valid.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let user = session?.user ?? null;

  if (!user) {
    // Fallback: validate with Supabase Auth server
    const { data: { user: verifiedUser } } = await supabase.auth.getUser();
    user = verifiedUser ?? null;
  }

  return { supabaseResponse, user };
}
