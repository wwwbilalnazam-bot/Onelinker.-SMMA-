// ════════════════════════════════════════════════════════════
// TWITTER DIRECT PROVIDER — Placeholder Implementation
//
// Uses Twitter API v2 directly for OAuth and posting.
// Full implementation coming soon.
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
} from "./types";
import { createServiceClient } from "@/lib/supabase/server";

export class TwitterDirectProvider implements SocialProvider {
  readonly name = "twitter-direct";
  readonly supportedPlatforms = ["twitter"];

  async startOAuth(): Promise<OAuthStartResult> {
    throw new Error("Twitter OAuth not yet implemented");
  }

  async handleCallback(): Promise<OAuthCallbackResult> {
    throw new Error("Twitter OAuth not yet implemented");
  }

  async listAccounts(): Promise<ProviderAccount[]> {
    return [];
  }

  async syncAccounts() {
    return { synced: 0, errors: 0 };
  }

  async disconnectAccount() {}

  async createPost(): Promise<CreatePostResult> {
    throw new Error("Twitter posting not yet implemented");
  }

  async getPostStatus(): Promise<PostStatusResult> {
    return { providerPostId: "", status: "draft" };
  }

  async deletePost() {}
}
