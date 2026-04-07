// ════════════════════════════════════════════════════════════
// GOOGLE BUSINESS PROFILE DIRECT PROVIDER — Placeholder
//
// Uses Google Business Profile API directly.
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

export class GoogleBusinessDirectProvider implements SocialProvider {
  readonly name = "google-business-direct";
  readonly supportedPlatforms = ["google_business"];

  async startOAuth(): Promise<OAuthStartResult> {
    throw new Error("Google Business Profile OAuth not yet implemented");
  }

  async handleCallback(params: {
    queryParams: Record<string, string>;
    workspaceId: string;
    redirectUri?: string;
    apiKey?: string | null;
  }): Promise<OAuthCallbackResult> {
    throw new Error("Google Business Profile OAuth not yet implemented");
  }

  async listAccounts(): Promise<ProviderAccount[]> {
    return [];
  }

  async syncAccounts() {
    return { synced: 0, errors: 0 };
  }

  async disconnectAccount() {}

  async createPost(): Promise<CreatePostResult> {
    throw new Error("Google Business Profile posting not yet implemented");
  }

  async getPostStatus(): Promise<PostStatusResult> {
    return { providerPostId: "", status: "draft" };
  }

  async deletePost() {}
}
