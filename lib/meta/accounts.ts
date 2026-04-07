// ════════════════════════════════════════════════════════════
// META ACCOUNTS — OAuth, Pages, Instagram Business Accounts
//
// Handles the full Facebook Login flow:
//   1. Generate OAuth URL → user authorizes
//   2. Exchange code for token → get long-lived token
//   3. Fetch Facebook Pages (with page access tokens)
//   4. Fetch linked Instagram Business Accounts
//   5. Store tokens + accounts in Supabase
// ════════════════════════════════════════════════════════════

import {
  GRAPH_API_BASE,
  getMetaAppId,
  graphGet,
  exchangeCodeForToken,
  getLongLivedToken,
} from "./client";
import { createServiceClient } from "@/lib/supabase/server";

// ── Types ───────────────────────────────────────────────────

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  picture?: { data?: { url?: string } };
  username?: string;
  followers_count?: number;
  instagram_business_account?: { id: string };
}

export interface MetaIGAccount {
  id: string;
  name: string;
  username: string;
  profile_picture_url: string | null;
  followers_count: number;
  /** The Facebook Page ID that owns this IG account */
  pageId: string;
  /** The page access token (needed for IG API calls) */
  pageAccessToken: string;
}

// ── Facebook Login OAuth scopes ─────────────────────────────
// These are the permissions your Meta app needs.
// In development mode, only app roles (admin/developer/tester) can use them.

const FACEBOOK_ONLY_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_read_user_content",
  "business_management",
].join(",");

const INSTAGRAM_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
  "business_management",
].join(",");

const ALL_META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_read_user_content",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
  "business_management",
].join(",");

// ── Helpers ─────────────────────────────────────────────────

/** Strip query params from a URL — Facebook requires exact redirect_uri match */
function stripQueryParams(uri: string): string {
  try {
    const u = new URL(uri);
    return `${u.origin}${u.pathname}`;
  } catch {
    // If it's not a valid URL, return the part before '?'
    return uri.split("?")[0] ?? uri;
  }
}

// ── Step 1: Generate OAuth URL ──────────────────────────────

export function buildMetaOAuthUrl(params: {
  redirectUri: string;
  workspaceId: string;
  platform: string;
}): string {
  const appId = getMetaAppId();

  // Encode workspace + platform info in state for CSRF protection and routing
  const statePayload = JSON.stringify({
    workspaceId: params.workspaceId,
    platform: params.platform,
    nonce: crypto.randomUUID(),
  });
  const state = Buffer.from(statePayload).toString("base64url");

  // Strip query params from redirect_uri — workspace/platform info goes in state.
  // Facebook requires redirect_uri to EXACTLY match during code exchange.
  const cleanRedirectUri = stripQueryParams(params.redirectUri);

  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", cleanRedirectUri);
  const scopes = params.platform === "instagram" ? INSTAGRAM_SCOPES
               : params.platform === "facebook" ? FACEBOOK_ONLY_SCOPES
               : ALL_META_SCOPES;
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");

  return url.toString();
}

// ── Step 2: Handle callback — exchange code, get pages ──────

export interface MetaOAuthResult {
  pages: MetaPage[];
  igAccounts: MetaIGAccount[];
  userAccessToken: string;
  userId: string;
}

export async function handleMetaOAuthCode(
  code: string,
  redirectUri: string
): Promise<MetaOAuthResult> {
  // Exchange code for short-lived token
  const { accessToken: shortToken } = await exchangeCodeForToken(code, redirectUri);

  // Upgrade to long-lived token (~60 days)
  const { accessToken: longToken } = await getLongLivedToken(shortToken);

  // Get user info
  const user = await graphGet<{ id: string; name: string }>("/me", {
    fields: "id,name",
  }, longToken);

  // Fetch all Facebook Pages the user manages
  const pagesRes = await graphGet<{
    data: MetaPage[];
  }>(`/${user.id}/accounts`, {
    fields: "id,name,access_token,category,picture,username,followers_count,instagram_business_account",
  }, longToken);

  const pages = pagesRes.data ?? [];

  // For each page with an IG business account, fetch IG details
  const igAccounts: MetaIGAccount[] = [];

  for (const page of pages) {
    if (page.instagram_business_account?.id) {
      try {
        const ig = await graphGet<{
          id: string;
          name: string;
          username: string;
          profile_picture_url: string;
          followers_count: number;
        }>(`/${page.instagram_business_account.id}`, {
          fields: "id,name,username,profile_picture_url,followers_count",
        }, page.access_token);

        igAccounts.push({
          id: ig.id,
          name: ig.name,
          username: ig.username,
          profile_picture_url: ig.profile_picture_url ?? null,
          followers_count: ig.followers_count ?? 0,
          pageId: page.id,
          pageAccessToken: page.access_token,
        });
      } catch (err) {
        console.error(`[meta/accounts] Failed to fetch IG account for page ${page.id}:`, err);
      }
    }
  }

  return {
    pages,
    igAccounts,
    userAccessToken: longToken,
    userId: user.id,
  };
}

// ── Step 3: Store accounts + tokens in Supabase ─────────────
//
// We store:
//   - Each Facebook Page as a social_account (platform = "facebook")
//   - Each Instagram Business Account as a social_account (platform = "instagram")
//   - Page access tokens in meta_tokens table (encrypted at rest by Supabase)

export async function syncMetaAccountsToSupabase(
  workspaceId: string,
  oauthResult: MetaOAuthResult,
  /** Which platform was requested: "facebook" or "instagram". Only sync that one. */
  targetPlatform?: string
): Promise<{ synced: number; errors: number }> {
  const serviceClient = createServiceClient();
  let synced = 0;
  let errors = 0;

  const syncFacebook = !targetPlatform || targetPlatform === "facebook";
  const syncInstagram = !targetPlatform || targetPlatform === "instagram";

  // ── Sync Facebook Pages (only if connecting Facebook) ──────
  if (!syncFacebook) {
    // Still need to store FB page tokens for Instagram
    // because IG API uses the parent page's access token
    if (syncInstagram) {
      for (const page of oauthResult.pages) {
        if (page.instagram_business_account?.id) {
          await serviceClient
            .from("meta_tokens")
            .upsert(
              {
                workspace_id: workspaceId,
                account_id: `meta_fb_${page.id}`,
                platform: "facebook",
                page_id: page.id,
                access_token: page.access_token,
                user_access_token: oauthResult.userAccessToken,
                meta_user_id: oauthResult.userId,
                expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "workspace_id,account_id" }
            );
        }
      }
    }
  }

  for (const page of oauthResult.pages) {
    if (!syncFacebook) continue;
    try {
      // Upsert social account
      const { error } = await serviceClient
        .from("social_accounts")
        .upsert(
          {
            workspace_id: workspaceId,
            outstand_account_id: `meta_fb_${page.id}`, // prefix to avoid collisions
            platform: "facebook",
            username: page.username || page.name,
            display_name: page.name,
            profile_picture: page.picture?.data?.url ?? null,
            followers_count: page.followers_count ?? 0,
            is_active: true,
            health_status: "healthy",
            last_synced: new Date().toISOString(),
          },
          { onConflict: "workspace_id,outstand_account_id" }
        );

      if (error) {
        console.error("[meta/accounts] Upsert FB page failed:", error);
        errors++;
        continue;
      }

      // Store page access token
      await serviceClient
        .from("meta_tokens")
        .upsert(
          {
            workspace_id: workspaceId,
            account_id: `meta_fb_${page.id}`,
            platform: "facebook",
            page_id: page.id,
            access_token: page.access_token,
            user_access_token: oauthResult.userAccessToken,
            meta_user_id: oauthResult.userId,
            expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // ~60 days
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id,account_id" }
        );

      synced++;
    } catch (err) {
      console.error("[meta/accounts] FB page sync error:", err);
      errors++;
    }
  }

  // ── Sync Instagram Business Accounts (only if connecting Instagram) ──
  for (const ig of oauthResult.igAccounts) {
    if (!syncInstagram) continue;
    try {
      const { error } = await serviceClient
        .from("social_accounts")
        .upsert(
          {
            workspace_id: workspaceId,
            outstand_account_id: `meta_ig_${ig.id}`,
            platform: "instagram",
            username: ig.username,
            display_name: ig.name,
            profile_picture: ig.profile_picture_url,
            followers_count: ig.followers_count,
            is_active: true,
            health_status: "healthy",
            last_synced: new Date().toISOString(),
          },
          { onConflict: "workspace_id,outstand_account_id" }
        );

      if (error) {
        console.error("[meta/accounts] Upsert IG account failed:", error);
        errors++;
        continue;
      }

      // Store IG token (uses the page access token of the linked FB page)
      await serviceClient
        .from("meta_tokens")
        .upsert(
          {
            workspace_id: workspaceId,
            account_id: `meta_ig_${ig.id}`,
            platform: "instagram",
            page_id: ig.pageId,
            ig_user_id: ig.id,
            access_token: ig.pageAccessToken, // IG API uses the page token
            user_access_token: oauthResult.userAccessToken,
            meta_user_id: oauthResult.userId,
            expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id,account_id" }
        );

      synced++;
    } catch (err) {
      console.error("[meta/accounts] IG account sync error:", err);
      errors++;
    }
  }

  return { synced, errors };
}

// ── Get stored access token for a social account ────────────

export async function getMetaAccessToken(
  workspaceId: string,
  accountId: string
): Promise<{ accessToken: string; pageId: string; igUserId?: string } | null> {
  const serviceClient = createServiceClient();

  const { data } = await serviceClient
    .from("meta_tokens")
    .select("access_token, page_id, ig_user_id, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("account_id", accountId)
    .single();

  if (!data) return null;

  // Check if token is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    console.warn("[meta/accounts] Token expired for", accountId);
    // Mark account as needing reconnection
    await serviceClient
      .from("social_accounts")
      .update({ health_status: "token_expired", is_active: false })
      .eq("workspace_id", workspaceId)
      .eq("outstand_account_id", accountId);
    return null;
  }

  return {
    accessToken: data.access_token,
    pageId: data.page_id,
    igUserId: data.ig_user_id ?? undefined,
  };
}

// ── Disconnect a Meta account ───────────────────────────────

export async function disconnectMetaAccount(
  workspaceId: string,
  accountId: string
): Promise<void> {
  const serviceClient = createServiceClient();

  // Remove token
  await serviceClient
    .from("meta_tokens")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("account_id", accountId);

  // Mark as disconnected
  await serviceClient
    .from("social_accounts")
    .update({ is_active: false, health_status: "disconnected" })
    .eq("workspace_id", workspaceId)
    .eq("outstand_account_id", accountId);
}

// ── Decode state param from OAuth callback ──────────────────

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
