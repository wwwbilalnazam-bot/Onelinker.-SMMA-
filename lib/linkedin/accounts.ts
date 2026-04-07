// ════════════════════════════════════════════════════════════
// LINKEDIN ACCOUNTS — OAuth, Profile & Organization Management
//
// Handles the full LinkedIn OAuth 2.0 flow:
//   1. Generate OAuth URL → user authorizes
//   2. Exchange code for access token (~60 day lifetime)
//   3. Fetch LinkedIn profile (person URN)
//   4. Optionally fetch organizations the user administers
//   5. Store tokens + accounts in Supabase
//
// LinkedIn access tokens last ~60 days. Refresh tokens are
// only available for certain app types (3-legged OAuth with
// r_basicprofile). If no refresh token, user must re-auth.
// ════════════════════════════════════════════════════════════

import {
  LINKEDIN_OAUTH_BASE,
  getLinkedInClientId,
  exchangeLinkedInCode,
  linkedinGet,
  refreshLinkedInToken,
} from "./client";
import { createServiceClient } from "@/lib/supabase/server";

// ── Types ───────────────────────────────────────────────────

export interface LinkedInProfile {
  /** LinkedIn member URN, e.g. "urn:li:person:abc123" */
  sub: string;
  name: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
}

export interface LinkedInOrganization {
  id: string;
  name: string;
  vanityName?: string;
  logoUrl?: string;
}

// ── OAuth scopes ─────────────────────────────────────────────
// Community Management API scopes for posting + reading.
// openid + profile + email are for user identity.

const LINKEDIN_SCOPES = [
  "openid",
  "profile",
  "email",
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

export function buildLinkedInOAuthUrl(params: {
  redirectUri: string;
  workspaceId: string;
}): string {
  const clientId = getLinkedInClientId();

  const statePayload = JSON.stringify({
    workspaceId: params.workspaceId,
    platform: "linkedin",
    nonce: crypto.randomUUID(),
  });
  const state = Buffer.from(statePayload).toString("base64url");

  const cleanRedirectUri = stripQueryParams(params.redirectUri);

  const url = new URL(`${LINKEDIN_OAUTH_BASE}/authorization`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", cleanRedirectUri);
  url.searchParams.set("scope", LINKEDIN_SCOPES);
  url.searchParams.set("state", state);

  return url.toString();
}

// ── Step 2: Handle callback — exchange code, get profile ────

export interface LinkedInOAuthResult {
  profile: LinkedInProfile;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export async function handleLinkedInOAuthCode(
  code: string,
  redirectUri: string
): Promise<LinkedInOAuthResult> {
  // Exchange code for access token
  const tokenData = await exchangeLinkedInCode(code, redirectUri);

  // Fetch user profile using OpenID Connect userinfo endpoint
  const profile = await linkedinGet<LinkedInProfile>(
    "/userinfo",
    undefined,
    tokenData.access_token
  );

  if (!profile.sub) {
    throw new Error("No LinkedIn profile ID (sub) received. Check app permissions.");
  }

  return {
    profile: {
      sub: profile.sub,
      name: profile.name ?? "LinkedIn User",
      given_name: profile.given_name,
      family_name: profile.family_name,
      email: profile.email,
      picture: profile.picture,
    },
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
  };
}

// ── Step 3: Store profile + token in Supabase ────────────────

export async function syncLinkedInProfileToSupabase(
  workspaceId: string,
  oauthResult: LinkedInOAuthResult
): Promise<{ synced: number; errors: number }> {
  const serviceClient = createServiceClient();
  const { profile } = oauthResult;

  // LinkedIn sub is like "abc123" — we prefix with "li_" for our account ID
  const accountId = `li_${profile.sub}`;

  try {
    // Upsert social account
    const { error } = await serviceClient
      .from("social_accounts")
      .upsert(
        {
          workspace_id: workspaceId,
          outstand_account_id: accountId,
          platform: "linkedin",
          username: profile.name,
          display_name: profile.name,
          profile_picture: profile.picture ?? null,
          followers_count: 0,
          is_active: true,
          health_status: "healthy",
          last_synced: new Date().toISOString(),
        },
        { onConflict: "workspace_id,outstand_account_id" }
      );

    if (error) {
      console.error("[linkedin/accounts] Upsert profile failed:", JSON.stringify(error));
      throw new Error(`Failed to save LinkedIn profile: ${error.message}`);
    }

    // Store token
    const { error: tokenError } = await serviceClient
      .from("linkedin_tokens")
      .upsert(
        {
          workspace_id: workspaceId,
          account_id: accountId,
          linkedin_urn: `urn:li:person:${profile.sub}`,
          access_token: oauthResult.accessToken,
          refresh_token: oauthResult.refreshToken ?? null,
          expires_at: new Date(Date.now() + oauthResult.expiresIn * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,account_id" }
      );

    if (tokenError) {
      console.error("[linkedin/accounts] Token upsert failed:", JSON.stringify(tokenError));
      throw new Error(`Failed to save LinkedIn tokens: ${tokenError.message}`);
    }

    return { synced: 1, errors: 0 };
  } catch (err) {
    console.error("[linkedin/accounts] Sync error:", err);
    throw err;
  }
}

// ── Get access token (auto-refresh if expired) ──────────────

export async function getLinkedInAccessToken(
  workspaceId: string,
  accountId: string
): Promise<{ accessToken: string; linkedinUrn: string } | null> {
  const serviceClient = createServiceClient();

  const { data } = await serviceClient
    .from("linkedin_tokens")
    .select("access_token, refresh_token, linkedin_urn, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("account_id", accountId)
    .single();

  if (!data) return null;

  // Check if token is still valid (with 5-min buffer)
  const expiresAt = new Date(data.expires_at);
  const now = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt > now) {
    return { accessToken: data.access_token, linkedinUrn: data.linkedin_urn };
  }

  // Token expired — try to refresh
  if (data.refresh_token) {
    try {
      const refreshed = await refreshLinkedInToken(data.refresh_token);

      await serviceClient
        .from("linkedin_tokens")
        .update({
          access_token: refreshed.accessToken,
          expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId)
        .eq("account_id", accountId);

      return { accessToken: refreshed.accessToken, linkedinUrn: data.linkedin_urn };
    } catch (err) {
      console.error("[linkedin/accounts] Token refresh failed:", err);
    }
  }

  // No refresh token or refresh failed — mark as expired
  console.warn("[linkedin/accounts] Token expired for", accountId);
  await serviceClient
    .from("social_accounts")
    .update({ health_status: "token_expired", is_active: false })
    .eq("workspace_id", workspaceId)
    .eq("outstand_account_id", accountId);

  return null;
}

// ── Disconnect ──────────────────────────────────────────────

export async function disconnectLinkedInAccount(
  workspaceId: string,
  accountId: string
): Promise<void> {
  const serviceClient = createServiceClient();

  await serviceClient
    .from("linkedin_tokens")
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

export function decodeLinkedInOAuthState(state: string): {
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
