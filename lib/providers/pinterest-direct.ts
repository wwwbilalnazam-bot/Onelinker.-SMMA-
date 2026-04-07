// ════════════════════════════════════════════════════════════
// PINTEREST DIRECT PROVIDER — Placeholder Implementation
//
// Uses Pinterest API v5 directly for OAuth and posting.
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

export class PinterestDirectProvider implements SocialProvider {
  readonly name = "pinterest-direct";
  readonly supportedPlatforms = ["pinterest"];

  async startOAuth(): Promise<OAuthStartResult> {
    throw new Error("Pinterest OAuth not yet implemented");
  }

  async handleCallback(params: {
    queryParams: Record<string, string>;
    workspaceId: string;
    redirectUri?: string;
    apiKey?: string | null;
  }): Promise<OAuthCallbackResult> {
    throw new Error("Pinterest OAuth not yet implemented");
  }

  async listAccounts(): Promise<ProviderAccount[]> {
    return [];
  }

  async syncAccounts() {
    return { synced: 0, errors: 0 };
  }

  async disconnectAccount() {}

  async createPost(): Promise<CreatePostResult> {
    throw new Error("Pinterest posting not yet implemented");
  }

  async getPostStatus(): Promise<PostStatusResult> {
    return { providerPostId: "", status: "draft" };
  }

  async deletePost() {}
}
