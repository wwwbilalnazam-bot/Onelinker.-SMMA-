import { type NextRequest } from "next/server";
import { getProviderForPlatform } from "@/lib/providers";
import {
  popupClose,
  extractCallbackParams,
  verifyCallbackAuth,
  clearDeletedTracking,
} from "@/lib/oauth/callback-helpers";

// ── TikTok OAuth Callback (/auth/tiktok/callback) ───────────
// Handles OAuth callbacks from TikTok Login Kit.
//
// TikTok-specific behavior:
//   - TikTok sends ?code=...&state=...&scopes=... (note: "scopes" not "scope")
//   - TikTok may also send ?error=... on denial
//   - The code exchange uses "client_key" instead of "client_id"
//   - Redirect URI must exactly match what was registered in TikTok Developer Portal

export async function GET(request: NextRequest) {
  const logPrefix = "[auth/tiktok/callback]";

  // 1. Extract and validate params from the callback URL
  const params = extractCallbackParams(request, "tiktok");
  if (params instanceof Response) return params;

  const { workspaceId, allParams } = params;
  console.log(`${logPrefix} Workspace: ${workspaceId}`);

  try {
    // 2. Verify the user is authenticated and has workspace access
    const auth = await verifyCallbackAuth(request, workspaceId);
    if (!auth.ok) return auth.response;

    // Extract the redirect URI from the current request origin
    const { origin } = new URL(request.url);
    const redirectUri = `${origin}/auth/tiktok/callback`;

    // 3. Let the TikTok provider handle token exchange + profile sync
    const provider = getProviderForPlatform("tiktok");
    const result = await provider.handleCallback({
      queryParams: allParams,
      workspaceId,
      redirectUri,
    });

    console.log(`${logPrefix} Provider result:`, JSON.stringify(result));

    // 4. Clear deleted-account tracking so reconnected accounts aren't blocked
    await clearDeletedTracking(workspaceId, "tiktok");

    return popupClose();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} Error:`, errMsg, err);
    return popupClose(`Connection failed: ${errMsg}`, true);
  }
}
