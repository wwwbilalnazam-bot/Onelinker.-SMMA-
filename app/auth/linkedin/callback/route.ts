import { type NextRequest } from "next/server";
import { getProviderForPlatform } from "@/lib/providers";
import {
  popupClose,
  extractCallbackParams,
  verifyCallbackAuth,
  clearDeletedTracking,
} from "@/lib/oauth/callback-helpers";

// ── LinkedIn OAuth Callback (/auth/linkedin/callback) ────────
// Handles OAuth callbacks for LinkedIn personal profiles.
// LinkedIn uses OAuth 2.0 with OpenID Connect for user identity.

export async function GET(request: NextRequest) {
  const logPrefix = "[auth/linkedin/callback]";

  // 1. Extract and validate params from the callback URL
  const params = extractCallbackParams(request, "linkedin");
  if (params instanceof Response) return params;

  const { workspaceId, allParams } = params;
  console.log(`${logPrefix} Workspace: ${workspaceId}`);

  try {
    // 2. Verify the user is authenticated and has workspace access
    const auth = await verifyCallbackAuth(request, workspaceId);
    if (!auth.ok) return auth.response;

    // Extract the redirect URI from the current request origin
    const { origin } = new URL(request.url);
    const redirectUri = `${origin}/auth/linkedin/callback`;

    // 3. Let the LinkedIn provider handle token exchange + profile sync
    const provider = getProviderForPlatform("linkedin");
    const result = await provider.handleCallback({
      queryParams: allParams,
      workspaceId,
      redirectUri,
    });

    console.log(`${logPrefix} Provider result:`, JSON.stringify(result));

    // 4. Clear deleted-account tracking so reconnected accounts aren't blocked
    await clearDeletedTracking(workspaceId, "linkedin");

    return popupClose();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} Error:`, errMsg, err);
    return popupClose(`Connection failed: ${errMsg}`, true);
  }
}
