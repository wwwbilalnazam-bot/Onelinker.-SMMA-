// ════════════════════════════════════════════════════════════
// DIRECT API PROVIDER — EXAMPLE / TEMPLATE
//
// Use this as a starting point when integrating a platform
// directly via its official API (bypassing Outstand).
//
// To activate:
//   1. Copy this file → lib/providers/twitter-direct.ts
//   2. Implement all methods with the official API
//   3. Register in lib/providers/index.ts
//   4. Set PROVIDER_MAP["twitter"] = "twitter-direct"
//
// This file is NOT imported anywhere — it's a reference only.
// ════════════════════════════════════════════════════════════

import type {
  SocialProvider,
  OAuthStartResult,
  OAuthCallbackResult,
  ProviderAccount,
  CreatePostPayload,
  CreatePostResult,
  PostStatusResult,
  PostAnalytics,
  WebhookEvent,
} from "./types";

/**
 * Example: Direct Twitter/X API v2 provider
 *
 * Env vars needed:
 *   TWITTER_CLIENT_ID
 *   TWITTER_CLIENT_SECRET
 *   TWITTER_REDIRECT_URI
 */
export class TwitterDirectProvider implements SocialProvider {
  readonly name = "twitter-direct";
  readonly supportedPlatforms = ["twitter"];

  // ── OAuth (Twitter OAuth 2.0 PKCE) ────────────────────

  async startOAuth(params: {
    platform: string;
    redirectUri: string;
    workspaceId: string;
    apiKey?: string | null;
  }): Promise<OAuthStartResult> {
    // 1. Generate PKCE code_verifier + code_challenge
    // 2. Store code_verifier in session/DB keyed by workspaceId
    // 3. Build Twitter authorize URL:
    //    https://twitter.com/i/oauth2/authorize?
    //      response_type=code&
    //      client_id=TWITTER_CLIENT_ID&
    //      redirect_uri=...&
    //      scope=tweet.read tweet.write users.read offline.access&
    //      state=workspaceId&
    //      code_challenge=...&
    //      code_challenge_method=S256

    void params;
    throw new Error("Not implemented — replace with actual Twitter OAuth 2.0 PKCE flow");
  }

  async handleCallback(params: {
    queryParams: Record<string, string>;
    workspaceId: string;
    apiKey?: string | null;
  }): Promise<OAuthCallbackResult> {
    // 1. Extract `code` from queryParams
    // 2. Retrieve stored code_verifier for this workspace
    // 3. Exchange code for tokens:
    //    POST https://api.twitter.com/2/oauth2/token
    //    { grant_type: "authorization_code", code, redirect_uri, code_verifier }
    // 4. Store access_token + refresh_token in social_accounts table
    // 5. Fetch user profile: GET /2/users/me
    // 6. Upsert to social_accounts table

    void params;
    throw new Error("Not implemented");
  }

  // ── Accounts ───────────────────────────────────────────

  async listAccounts(params: {
    workspaceId: string;
    apiKey?: string | null;
  }): Promise<ProviderAccount[]> {
    // Read from social_accounts table where provider = "twitter-direct"
    void params;
    throw new Error("Not implemented");
  }

  async syncAccounts(params: {
    workspaceId: string;
    apiKey?: string | null;
  }): Promise<{ synced: number; errors: number }> {
    // For direct API: refresh tokens, verify account still valid
    // GET /2/users/me with stored access_token
    // Update profile info in social_accounts
    void params;
    throw new Error("Not implemented");
  }

  async disconnectAccount(params: {
    providerAccountId: string;
    apiKey?: string | null;
  }): Promise<void> {
    // 1. Revoke token: POST /2/oauth2/revoke
    // 2. Mark account inactive in social_accounts
    void params;
    throw new Error("Not implemented");
  }

  // ── Posting ────────────────────────────────────────────

  async createPost(params: {
    payload: CreatePostPayload;
    workspaceId: string;
    authorId: string;
    apiKey?: string | null;
  }): Promise<CreatePostResult> {
    // 1. Get access_token for the account from social_accounts
    // 2. If media: upload each via POST /2/media/upload
    // 3. Create tweet: POST /2/tweets
    //    { text: payload.content, media: { media_ids: [...] } }
    // 4. Save to posts table
    // 5. For scheduling: use your own scheduler (cron/queue)
    //    since Twitter API v2 doesn't have native scheduling

    void params;
    throw new Error("Not implemented");
  }

  async getPostStatus(params: {
    providerPostId: string;
    apiKey?: string | null;
  }): Promise<PostStatusResult> {
    // GET /2/tweets/{id}
    void params;
    throw new Error("Not implemented");
  }

  async deletePost(params: {
    providerPostId: string;
    apiKey?: string | null;
  }): Promise<void> {
    // DELETE /2/tweets/{id}
    void params;
    throw new Error("Not implemented");
  }

  // ── Analytics ──────────────────────────────────────────

  async getPostAnalytics(params: {
    providerPostId: string;
    apiKey?: string | null;
  }): Promise<PostAnalytics> {
    // GET /2/tweets/{id}?tweet.fields=public_metrics
    void params;
    throw new Error("Not implemented");
  }

  // ── Webhooks ───────────────────────────────────────────

  parseWebhook(params: {
    body: string;
    signature: string;
    secret: string;
  }): WebhookEvent | null {
    // Twitter Account Activity API webhook verification
    // Verify CRC signature, parse event type
    void params;
    return null;
  }
}
