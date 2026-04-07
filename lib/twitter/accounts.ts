// ════════════════════════════════════════════════════════════
// TWITTER ACCOUNTS — OAuth, Profile Management
//
// Handles the full Twitter OAuth 2.0 flow with PKCE:
//   1. Generate OAuth URL with code challenge
//   2. Exchange code for access + refresh tokens
//   3. Fetch Twitter user profile
//   4. Store tokens + profile in Supabase
//
// Twitter v2 uses OAuth 2.0 with optional PKCE for web apps.
// ════════════════════════════════════════════════════════════

import {
  TWITTER_OAUTH_BASE,
  getTwitterClientId,
  exchangeTwitterCode,
  twitterGet,
  refreshTwitterToken,
} from "./client";
import { createServiceClient } from "@/lib/supabase/server";

// ── Types ───────────────────────────────────────────────────

export interface TwitterProfile {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
  };
}

// ── Twitter OAuth scopes ────────────────────────────────────

const TWITTER_SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
].join(" ");

// ── Helpers ─────────────────────────────────────────────────

function stripQueryParams(uri: string): string {
  try {
    const u = new URL(uri);
    return `${u.origin}${u.pathname}`;
  } catch {
    return uri.split("?")[0] ?? uri;
  }
}

// ── PKCE helpers ────────────────────────────────────────────

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// ── Step 1: Generate OAuth URL with PKCE ───────────────────

export async function buildTwitterOAuthUrl(params: {
  redirectUri: string;
  workspaceId: string;
}): Promise<{ url: string; codeVerifier: string }> {
  const clientId = getTwitterClientId();

  const statePayload = JSON.stringify({
    workspaceId: params.workspaceId,
    platform: "twitter",
    nonce: crypto.randomUUID(),
  });
  const state = Buffer.from(statePayload).toString("base64url");

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const cleanRedirectUri = stripQueryParams(params.redirectUri);

  const url = new URL(`${TWITTER_OAUTH_BASE}/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", cleanRedirectUri);
  url.searchParams.set("scope", TWITTER_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return { url: url.toString(), codeVerifier };
}

// ── Step 2: Handle callback — exchange code, get profile ────

export interface TwitterOAuthResult {
  profile: TwitterProfile;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export async function handleTwitterOAuthCode(
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<TwitterOAuthResult> {
  const tokenData = await exchangeTwitterCode(code, redirectUri, codeVerifier);

  // Fetch user profile using /users/me endpoint
  const profileRes = await twitterGet<{ data: TwitterProfile }>(
    "/users/me",
    {
      "user.fields": "username,name,profile_image_url,public_metrics",
    },
    tokenData.access_token
  );

  const profile = profileRes.data;
  if (!profile?.id) {
    throw new Error("No Twitter profile received. Check app permissions.");
  }

  return {
    profile,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
  };
}

// ── Step 3: Store profile + tokens in Supabase ──────────────

export async function syncTwitterProfileToSupabase(
  workspaceId: string,
  oauthResult: TwitterOAuthResult
): Promise<{ synced: number; errors: number }> {
  const serviceClient = createServiceClient();
  const { profile } = oauthResult;

  const accountId = `tw_${profile.id}`;

  try {
    // Upsert social account
    const { error } = await serviceClient
      .from("social_accounts")
      .upsert(
        {
          workspace_id: workspaceId,
          outstand_account_id: accountId,
          platform: "twitter",
          username: profile.username,
          display_name: profile.name,
          profile_picture: profile.profile_image_url ?? null,
          followers_count: profile.public_metrics?.followers_count ?? 0,
          is_active: true,
          health_status: "healthy",
          last_synced: new Date().toISOString(),
        },
        { onConflict: "workspace_id,outstand_account_id" }
      );

    if (error) {
      console.error("[twitter/accounts] Upsert profile failed:", JSON.stringify(error));
      throw new Error(`Failed to save Twitter profile: ${error.message}`);
    }

    // Store tokens
    const { error: tokenError } = await serviceClient
      .from("twitter_tokens")
      .upsert(
        {
          workspace_id: workspaceId,
          account_id: accountId,
          twitter_user_id: profile.id,
          access_token: oauthResult.accessToken,
          refresh_token: oauthResult.refreshToken ?? null,
          expires_at: new Date(Date.now() + oauthResult.expiresIn * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,account_id" }
      );

    if (tokenError) {
      console.error("[twitter/accounts] Token upsert failed:", JSON.stringify(tokenError));
      throw new Error(`Failed to save Twitter tokens: ${tokenError.message}`);
    }

    return { synced: 1, errors: 0 };
  } catch (err) {
    console.error("[twitter/accounts] Sync error:", err);
    throw err;
  }
}

// ── Get access token (auto-refresh if expired) ──────────────

export async function getTwitterAccessToken(
  workspaceId: string,
  accountId: string
): Promise<{ accessToken: string; twitterUserId: string } | null> {
  const serviceClient = createServiceClient();

  const { data } = await serviceClient
    .from("twitter_tokens")
    .select("access_token, refresh_token, twitter_user_id, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("account_id", accountId)
    .single();

  if (!data) return null;

  // Check if access token is still valid (5-min buffer)
  const expiresAt = new Date(data.expires_at);
  const now = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt > now) {
    return { accessToken: data.access_token, twitterUserId: data.twitter_user_id };
  }

  // Token expired — try to refresh
  if (data.refresh_token) {
    try {
      const refreshed = await refreshTwitterToken(data.refresh_token);

      await serviceClient
        .from("twitter_tokens")
        .update({
          access_token: refreshed.accessToken,
          expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId)
        .eq("account_id", accountId);

      return { accessToken: refreshed.accessToken, twitterUserId: data.twitter_user_id };
    } catch (err) {
      console.error("[twitter/accounts] Token refresh failed:", err);
    }
  }

  // No refresh token or refresh failed — mark as expired
  console.warn("[twitter/accounts] Token expired for", accountId);
  await serviceClient
    .from("social_accounts")
    .update({ health_status: "token_expired", is_active: false })
    .eq("workspace_id", workspaceId)
    .eq("outstand_account_id", accountId);

  return null;
}

// ── Disconnect ──────────────────────────────────────────────

export async function disconnectTwitterAccount(
  workspaceId: string,
  accountId: string
): Promise<void> {
  const serviceClient = createServiceClient();

  await serviceClient
    .from("twitter_tokens")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("account_id", accountId);

  await serviceClient
    .from("social_accounts")
    .update({ is_active: false, health_status: "disconnected" })
    .eq("workspace_id", workspaceId)
    .eq("outstand_account_id", accountId);
}
