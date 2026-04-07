// ════════════════════════════════════════════════════════════
// OAUTH CALLBACK HELPERS — Shared utilities for all OAuth
// callback routes.
//
// Each platform gets its own /auth/{platform}/callback route,
// but they share this common logic for:
//   - Popup close HTML responses
//   - User authentication checks
//   - Workspace membership verification
//   - State parameter decoding + CSRF validation
//   - Deleted-account cleanup after reconnection
// ════════════════════════════════════════════════════════════

import { type NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// ── Popup close response ────────────────────────────────────

export function popupClose(message?: string, isError = false) {
  const escapedMessage = (message ?? "Unknown error")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html>
<html>
<head><title>${isError ? "Connection failed" : "Connected!"}</title></head>
<body>
<div style="font-family:sans-serif;text-align:center;padding:40px;">
  ${
    isError
      ? `<p style="color:#e53e3e;font-size:18px;font-weight:bold;">Connection failed</p>
       <p style="color:#666;margin-top:12px;max-width:600px;margin-left:auto;margin-right:auto;word-break:break-word;">${escapedMessage}</p>
       <p style="color:#999;margin-top:20px;">You can close this window and try again.</p>`
      : `<p style="color:#38a169">✓ Connected! Closing…</p>
       <script>if (window.opener) { window.close(); } else { window.location.href = "/accounts"; }</script>`
  }
</div>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

// ── Decode base64url-encoded OAuth state ────────────────────

export function decodeOAuthState(state: string): {
  workspaceId: string;
  platform: string;
  nonce: string;
} | null {
  try {
    const json = Buffer.from(state, "base64url").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ── Verify authenticated user + workspace membership ────────

export async function verifyCallbackAuth(
  request: NextRequest,
  workspaceId: string
): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response }
> {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.redirect(`${origin}/login`) };
  }

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return { ok: false, response: popupClose("Workspace access denied", true) };
  }

  return { ok: true, userId: user.id };
}

// ── Clear deleted-account tracking after reconnection ───────

export async function clearDeletedTracking(
  workspaceId: string,
  platform: string
): Promise<void> {
  try {
    const service = createServiceClient();
    await service
      .from("deleted_social_accounts")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("platform", platform);
  } catch {
    // Non-fatal — reconnection still works
  }
}

// ── Extract callback params from request ────────────────────
// Parses code, state, error, and decodes workspaceId + platform
// from the state parameter.

export interface CallbackParams {
  code: string;
  workspaceId: string;
  platform: string;
  allParams: Record<string, string>;
}

export function extractCallbackParams(
  request: NextRequest,
  expectedPlatform: string
): CallbackParams | Response {
  const { searchParams } = new URL(request.url);
  const allParams = Object.fromEntries(searchParams.entries());

  const error = searchParams.get("error");
  if (error) {
    const description = searchParams.get("error_description") ?? error;
    return popupClose(`OAuth error: ${description}`, true);
  }

  const code = searchParams.get("code");
  if (!code) {
    return popupClose("Missing authorization code", true);
  }

  // Decode state to get workspaceId (and validate platform matches)
  const stateParam = searchParams.get("state");
  if (!stateParam) {
    return popupClose("Missing state parameter — possible CSRF attack", true);
  }

  const decoded = decodeOAuthState(stateParam);
  if (!decoded) {
    return popupClose("Invalid state parameter", true);
  }

  if (!decoded.workspaceId) {
    return popupClose("Missing workspaceId in state", true);
  }

  // Validate that the platform in state matches the expected platform for this route
  // Meta handles both facebook and instagram, so accept both
  const platformMatches =
    expectedPlatform === "meta"
      ? ["facebook", "instagram"].includes(decoded.platform)
      : decoded.platform === expectedPlatform;

  if (!platformMatches) {
    return popupClose(
      `Platform mismatch: expected ${expectedPlatform}, got ${decoded.platform}`,
      true
    );
  }

  // Inject decoded values into allParams for provider consumption
  allParams.workspaceId = decoded.workspaceId;
  allParams.platform = decoded.platform;

  return {
    code,
    workspaceId: decoded.workspaceId,
    platform: decoded.platform,
    allParams,
  };
}
