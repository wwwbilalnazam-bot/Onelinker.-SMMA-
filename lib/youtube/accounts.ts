// ════════════════════════════════════════════════════════════
// YOUTUBE ACCOUNTS — Google OAuth, Channel Management
//
// Handles the full Google OAuth 2.0 flow:
//   1. Generate OAuth URL → user authorizes YouTube access
//   2. Exchange code for access + refresh tokens
//   3. Fetch YouTube channel info
//   4. Store tokens + channel in Supabase
//
// Google refresh tokens are indefinite (until revoked),
// but access tokens expire after ~1 hour and must be refreshed.
// ════════════════════════════════════════════════════════════

import {
  GOOGLE_OAUTH_BASE,
  getYouTubeClientId,
  youtubeGet,
  exchangeGoogleCode,
  refreshGoogleToken,
} from "./client";
import { createServiceClient } from "@/lib/supabase/server";

// ── Types ───────────────────────────────────────────────────

export interface YouTubeChannel {
  id: string;
  title: string;
  customUrl?: string;       // e.g. "@channelname"
  thumbnailUrl: string | null;
  subscriberCount: number;
}

// ── Google OAuth scopes ─────────────────────────────────────

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
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

// ── Step 1: Generate OAuth URL ──────────────────────────────

export function buildYouTubeOAuthUrl(params: {
  redirectUri: string;
  workspaceId: string;
}): string {
  const clientId = getYouTubeClientId();

  const statePayload = JSON.stringify({
    workspaceId: params.workspaceId,
    platform: "youtube",
    nonce: crypto.randomUUID(),
  });
  const state = Buffer.from(statePayload).toString("base64url");

  const cleanRedirectUri = stripQueryParams(params.redirectUri);

  const url = new URL(GOOGLE_OAUTH_BASE);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", cleanRedirectUri);
  url.searchParams.set("scope", YOUTUBE_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");  // Get refresh token
  url.searchParams.set("prompt", "consent");        // Force consent to always get refresh_token
  url.searchParams.set("include_granted_scopes", "true");

  return url.toString();
}

// ── Step 2: Handle callback — exchange code, get channel ────

export interface YouTubeOAuthResult {
  channel: YouTubeChannel;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function handleYouTubeOAuthCode(
  code: string,
  redirectUri: string
): Promise<YouTubeOAuthResult> {
  // Exchange code for tokens
  const tokenData = await exchangeGoogleCode(code, redirectUri);

  if (!tokenData.refresh_token) {
    throw new Error(
      "No refresh token received from Google. The user may need to revoke access at " +
      "https://myaccount.google.com/permissions and reconnect."
    );
  }

  // Fetch the user's YouTube channel
  const channelRes = await youtubeGet<{
    items?: Array<{
      id: string;
      snippet: {
        title: string;
        customUrl?: string;
        thumbnails?: { default?: { url?: string } };
      };
      statistics?: {
        subscriberCount?: string;
      };
    }>;
  }>("/channels", {
    part: "snippet,statistics",
    mine: true,
  }, tokenData.access_token);

  const channelData = channelRes.items?.[0];
  if (!channelData) {
    throw new Error("No YouTube channel found for this Google account.");
  }

  return {
    channel: {
      id: channelData.id,
      title: channelData.snippet.title,
      customUrl: channelData.snippet.customUrl,
      thumbnailUrl: channelData.snippet.thumbnails?.default?.url ?? null,
      subscriberCount: parseInt(channelData.statistics?.subscriberCount ?? "0", 10),
    },
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
  };
}

// ── Step 3: Store channel + tokens in Supabase ──────────────

export async function syncYouTubeChannelToSupabase(
  workspaceId: string,
  oauthResult: YouTubeOAuthResult
): Promise<{ synced: number; errors: number }> {
  const serviceClient = createServiceClient();
  const { channel } = oauthResult;

  try {
    // Upsert social account
    const { error } = await serviceClient
      .from("social_accounts")
      .upsert(
        {
          workspace_id: workspaceId,
          outstand_account_id: `yt_${channel.id}`,
          platform: "youtube",
          username: channel.customUrl ?? channel.title,
          display_name: channel.title,
          profile_picture: channel.thumbnailUrl,
          followers_count: channel.subscriberCount,
          is_active: true,
          health_status: "healthy",
          last_synced: new Date().toISOString(),
        },
        { onConflict: "workspace_id,outstand_account_id" }
      );

    if (error) {
      console.error("[youtube/accounts] Upsert channel failed:", JSON.stringify(error));
      throw new Error(`Failed to save YouTube channel: ${error.message}`);
    }

    // Store tokens
    const { error: tokenError } = await serviceClient
      .from("youtube_tokens")
      .upsert(
        {
          workspace_id: workspaceId,
          account_id: `yt_${channel.id}`,
          channel_id: channel.id,
          access_token: oauthResult.accessToken,
          refresh_token: oauthResult.refreshToken,
          expires_at: new Date(Date.now() + oauthResult.expiresIn * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,account_id" }
      );

    if (tokenError) {
      console.error("[youtube/accounts] Token upsert failed:", JSON.stringify(tokenError));
      throw new Error(`Failed to save YouTube tokens: ${tokenError.message}`);
    }

    return { synced: 1, errors: 0 };
  } catch (err) {
    console.error("[youtube/accounts] Sync error:", err);
    throw err; // Re-throw so the popup shows the error
  }
}

// ── Get access token (auto-refresh if expired) ──────────────

export async function getYouTubeAccessToken(
  workspaceId: string,
  accountId: string
): Promise<{ accessToken: string; channelId: string } | null> {
  const serviceClient = createServiceClient();

  const { data } = await serviceClient
    .from("youtube_tokens")
    .select("access_token, refresh_token, channel_id, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("account_id", accountId)
    .single();

  if (!data) return null;

  // Check if token is still valid (with 5-min buffer)
  const expiresAt = new Date(data.expires_at);
  const now = new Date(Date.now() + 5 * 60 * 1000); // 5 min buffer

  if (expiresAt > now) {
    return { accessToken: data.access_token, channelId: data.channel_id };
  }

  // Token expired — refresh it
  if (!data.refresh_token) {
    console.warn("[youtube/accounts] No refresh token for", accountId);
    await serviceClient
      .from("social_accounts")
      .update({ health_status: "token_expired", is_active: false })
      .eq("workspace_id", workspaceId)
      .eq("outstand_account_id", accountId);
    return null;
  }

  try {
    const refreshed = await refreshGoogleToken(data.refresh_token);

    // Update stored access token
    await serviceClient
      .from("youtube_tokens")
      .update({
        access_token: refreshed.accessToken,
        expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("account_id", accountId);

    return { accessToken: refreshed.accessToken, channelId: data.channel_id };
  } catch (err) {
    console.error("[youtube/accounts] Token refresh failed:", err);
    await serviceClient
      .from("social_accounts")
      .update({ health_status: "token_expired", is_active: false })
      .eq("workspace_id", workspaceId)
      .eq("outstand_account_id", accountId);
    return null;
  }
}

// ── Disconnect ──────────────────────────────────────────────

export async function disconnectYouTubeAccount(
  workspaceId: string,
  accountId: string
): Promise<void> {
  const serviceClient = createServiceClient();

  await serviceClient
    .from("youtube_tokens")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("account_id", accountId);

  await serviceClient
    .from("social_accounts")
    .update({ is_active: false, health_status: "disconnected" })
    .eq("workspace_id", workspaceId)
    .eq("outstand_account_id", accountId);
}

// ── Decode state param ──────────────────────────────────────

export function decodeYouTubeOAuthState(state: string): {
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
