import { type NextRequest, NextResponse } from "next/server";
import { getTikTokClientKey, getTikTokClientSecret } from "@/lib/tiktok/client";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/test/tiktok
 *
 * Quick diagnostic endpoint to verify TikTok integration setup.
 *
 * Checks:
 * - Environment variables configured
 * - Database tables exist
 * - Sample OAuth flow (no actual auth required)
 */
export async function GET(request: NextRequest) {
  const logPrefix = "[test/tiktok]";

  try {
    const diagnostics: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      checks: {} as Record<string, unknown>,
    };

    // 1. Check environment variables
    console.log(`${logPrefix} Checking environment variables...`);
    try {
      const clientKey = getTikTokClientKey();
      const clientSecret = getTikTokClientSecret();
      diagnostics.checks.env = {
        status: "ok",
        clientKeyPresent: !!clientKey,
        clientSecretPresent: !!clientSecret,
      };
    } catch (err) {
      diagnostics.checks.env = {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }

    // 2. Check Supabase connection and tables
    console.log(`${logPrefix} Checking Supabase tables...`);
    try {
      const serviceClient = createServiceClient();

      // Check social_accounts table
      const { data: accounts, error: accountsError } = await serviceClient
        .from("social_accounts")
        .select("count")
        .limit(1);

      // Check tiktok_tokens table
      const { data: tokens, error: tokensError } = await serviceClient
        .from("tiktok_tokens")
        .select("count")
        .limit(1);

      diagnostics.checks.database = {
        status: accountsError || tokensError ? "error" : "ok",
        tables: {
          social_accounts: accountsError ? `error: ${accountsError.message}` : "ok",
          tiktok_tokens: tokensError ? `error: ${tokensError.message}` : "ok",
        },
      };
    } catch (err) {
      diagnostics.checks.database = {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }

    // 3. Test OAuth URL generation (with PKCE)
    console.log(`${logPrefix} Testing OAuth URL generation...`);
    try {
      const { buildTikTokOAuthUrl } = await import("@/lib/tiktok/accounts");

      const { url: oauthUrl, codeVerifier } = await buildTikTokOAuthUrl({
        redirectUri: "http://localhost:3000/auth/tiktok/callback",
        workspaceId: "test-workspace-123",
      });

      diagnostics.checks.oauth = {
        status: oauthUrl.includes("tiktok.com") ? "ok" : "error",
        urlGenerated: !!oauthUrl,
        hasScopes: oauthUrl.includes("scope="),
        hasClientKey: oauthUrl.includes("client_key="),
        pkceEnabled: oauthUrl.includes("code_challenge=") && !!codeVerifier,
      };
    } catch (err) {
      diagnostics.checks.oauth = {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }

    // 4. Verify posts module exists
    console.log(`${logPrefix} Checking posts module...`);
    try {
      const postsModule = await import("@/lib/tiktok/posts");
      diagnostics.checks.posts = {
        status: postsModule.publishTikTokVideo ? "ok" : "error",
        functions: {
          initializeVideoUpload: !!postsModule.initializeVideoUpload,
          uploadVideoFile: !!postsModule.uploadVideoFile,
          publishVideo: !!postsModule.publishVideo,
          publishTikTokVideo: !!postsModule.publishTikTokVideo,
        },
      };
    } catch (err) {
      diagnostics.checks.posts = {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }

    // Summary
    const allOk = Object.values(diagnostics.checks).every(
      (check: unknown) =>
        typeof check === "object" &&
        check !== null &&
        "status" in check &&
        (check as any).status === "ok"
    );

    diagnostics.summary = {
      status: allOk ? "ready" : "needs-attention",
      message: allOk
        ? "✅ TikTok integration is ready for testing"
        : "⚠️ Some checks failed — see details above",
    };

    console.log(`${logPrefix} Diagnostics complete:`, JSON.stringify(diagnostics, null, 2));

    return NextResponse.json(diagnostics, {
      status: allOk ? 200 : 400,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix} Error:`, message);

    return NextResponse.json(
      {
        status: "error",
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
