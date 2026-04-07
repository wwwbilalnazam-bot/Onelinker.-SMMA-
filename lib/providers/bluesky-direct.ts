// ════════════════════════════════════════════════════════════
// BLUESKY DIRECT PROVIDER — Placeholder Implementation
//
// Uses Bluesky/AT Protocol API directly for OAuth and posting.
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

export class BlueskyDirectProvider implements SocialProvider {
  readonly name = "bluesky-direct";
  readonly supportedPlatforms = ["bluesky"];

  async startOAuth(): Promise<OAuthStartResult> {
    throw new Error("Bluesky OAuth not yet implemented");
  }

  async handleCallback(params: {
    queryParams: Record<string, string>;
    workspaceId: string;
    redirectUri?: string;
    apiKey?: string | null;
  }): Promise<OAuthCallbackResult> {
    throw new Error("Bluesky OAuth not yet implemented");
  }

  async listAccounts(): Promise<ProviderAccount[]> {
    return [];
  }

  async syncAccounts() {
    return { synced: 0, errors: 0 };
  }

  async disconnectAccount() {}

  async createPost(): Promise<CreatePostResult> {
    throw new Error("Bluesky posting not yet implemented");
  }

  async getPostStatus(): Promise<PostStatusResult> {
    return { providerPostId: "", status: "draft" };
  }

  async deletePost() {}
}
