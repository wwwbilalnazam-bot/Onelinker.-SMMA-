import { type NextRequest } from "next/server";
import { getProviderForPlatform } from "@/lib/providers";
import {
  popupClose,
  extractCallbackParams,
  verifyCallbackAuth,
  clearDeletedTracking,
} from "@/lib/oauth/callback-helpers";

export async function GET(request: NextRequest) {
  const logPrefix = "[auth/google-business/callback]";

  const params = extractCallbackParams(request, "google_business");
  if (params instanceof Response) return params;

  const { workspaceId, allParams } = params;
  console.log(`${logPrefix} Workspace: ${workspaceId}`);

  try {
    const auth = await verifyCallbackAuth(request, workspaceId);
    if (!auth.ok) return auth.response;

    // Extract the redirect URI from the current request origin
    const { origin } = new URL(request.url);
    const redirectUri = `${origin}/auth/google-business/callback`;

    const provider = getProviderForPlatform("google_business");
    const result = await provider.handleCallback({
      queryParams: allParams,
      workspaceId,
      redirectUri,
    });

    console.log(`${logPrefix} Provider result:`, JSON.stringify(result));

    await clearDeletedTracking(workspaceId, "google_business");

    return popupClose();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} Error:`, errMsg, err);
    return popupClose(`Connection failed: ${errMsg}`, true);
  }
}
