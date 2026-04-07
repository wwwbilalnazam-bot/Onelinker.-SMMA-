// ════════════════════════════════════════════════════════════
// THREADS DIRECT PROVIDER — Placeholder Implementation
//
// Uses Threads API (via Meta's Graph API) directly.
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

export class ThreadsDirectProvider implements SocialProvider {
  readonly name = "threads-direct";
  readonly supportedPlatforms = ["threads"];

  async startOAuth(): Promise<OAuthStartResult> {
    throw new Error("Threads OAuth not yet implemented");
  }

  async handleCallback(params: {
    queryParams: Record<string, string>;
    workspaceId: string;
    redirectUri?: string;
    apiKey?: string | null;
  }): Promise<OAuthCallbackResult> {
    throw new Error("Threads OAuth not yet implemented");
  }

  async listAccounts(): Promise<ProviderAccount[]> {
    return [];
  }

  async syncAccounts() {
    return { synced: 0, errors: 0 };
  }

  async disconnectAccount() {}

  async createPost(): Promise<CreatePostResult> {
    throw new Error("Threads posting not yet implemented");
  }

  async getPostStatus(): Promise<PostStatusResult> {
    return { providerPostId: "", status: "draft" };
  }

  async deletePost() {}
}
