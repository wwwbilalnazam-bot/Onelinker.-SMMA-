import { type NextRequest } from "next/server";
import { getProviderForPlatform } from "@/lib/providers";
import {
  popupClose,
  extractCallbackParams,
  verifyCallbackAuth,
  clearDeletedTracking,
} from "@/lib/oauth/callback-helpers";

// ── YouTube OAuth Callback (/auth/youtube/callback) ──────────
// Handles OAuth callbacks from Google OAuth 2.0 for YouTube.
// Google uses access_type=offline to provide refresh tokens.

export async function GET(request: NextRequest) {
  const logPrefix = "[auth/youtube/callback]";

  // 1. Extract and validate params from the callback URL
  const params = extractCallbackParams(request, "youtube");
  if (params instanceof Response) return params;

  const { workspaceId, allParams } = params;
  console.log(`${logPrefix} Workspace: ${workspaceId}`);

  try {
    // 2. Verify the user is authenticated and has workspace access
    const auth = await verifyCallbackAuth(request, workspaceId);
    if (!auth.ok) return auth.response;

    // Extract the redirect URI from the current request origin
    const { origin } = new URL(request.url);
    const redirectUri = `${origin}/auth/youtube/callback`;

    // 3. Let the YouTube provider handle token exchange + channel sync
    const provider = getProviderForPlatform("youtube");
    const result = await provider.handleCallback({
      queryParams: allParams,
      workspaceId,
      redirectUri,
    });

    console.log(`${logPrefix} Provider result:`, JSON.stringify(result));

    // 4. Clear deleted-account tracking so reconnected accounts aren't blocked
    await clearDeletedTracking(workspaceId, "youtube");

    return popupClose();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} Error:`, errMsg, err);
    return popupClose(`Connection failed: ${errMsg}`, true);
  }
}
