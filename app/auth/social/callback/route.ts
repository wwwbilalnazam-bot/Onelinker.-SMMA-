import { type NextRequest, NextResponse } from "next/server";
import { decodeOAuthState } from "@/lib/oauth/callback-helpers";
import { getCallbackPath } from "@/lib/oauth/platform-routes";

// ── Legacy Social OAuth Callback (/auth/social/callback) ─────
// This shared callback route is DEPRECATED in favor of
// platform-specific routes:
//   - /auth/meta/callback     (Facebook + Instagram)
//   - /auth/linkedin/callback
//   - /auth/youtube/callback
//   - /auth/tiktok/callback
//
// This route remains as a backwards-compatible fallback that
// redirects to the correct platform-specific route. It preserves
// all query parameters during the redirect.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // Try to determine the platform from state or query params
  let platform = searchParams.get("platform");

  if (!platform) {
    const stateParam = searchParams.get("state");
    if (stateParam) {
      const decoded = decodeOAuthState(stateParam);
      if (decoded?.platform) {
        platform = decoded.platform;
      }
    }
  }

  if (!platform) {
    const html = `<!DOCTYPE html>
<html>
<head><title>Connection failed</title></head>
<body>
<div style="font-family:sans-serif;text-align:center;padding:40px;">
  <p style="color:#e53e3e;font-size:18px;font-weight:bold;">Connection failed</p>
  <p style="color:#666;margin-top:12px;">Could not determine platform. Please try again.</p>
  <p style="color:#999;margin-top:20px;">You can close this window and try again.</p>
</div>
</body>
</html>`;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }

  // Redirect to platform-specific callback, preserving all query params
  const callbackPath = getCallbackPath(platform);
  const targetUrl = new URL(`${origin}/auth/${callbackPath}/callback`);

  // Copy all search params to the new URL
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  console.log(`[auth/social/callback] Redirecting ${platform} → /auth/${callbackPath}/callback`);

  return NextResponse.redirect(targetUrl.toString());
}
