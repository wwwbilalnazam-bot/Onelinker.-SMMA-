// ════════════════════════════════════════════════════════════
// POST /api/inbox/sync
// Trigger a sync of comments and messages for all accounts
// ════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { SyncOrchestrator } from "@/lib/services/SyncOrchestrator";
import { TokenVault } from "@/lib/services/TokenVault";
import { Platform } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      workspaceId: string;
      accountIds?: string[];
      platforms?: Platform[];
      syncComments?: boolean;
      syncMessages?: boolean;
      since?: string;
    };

    const { workspaceId, accountIds, platforms, syncComments = true, syncMessages = true, since } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { data: null, error: "Missing required field: workspaceId" },
        { status: 400 }
      );
    }

    // Verify workspace membership & authorization
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .not("accepted_at", "is", null)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { data: null, error: "Not a workspace member" },
        { status: 403 }
      );
    }

    // Check if TokenVault is configured
    if (!TokenVault.isConfigured()) {
      return NextResponse.json(
        { data: null, error: "Token encryption not configured. Set TOKEN_ENCRYPTION_KEY in environment variables." },
        { status: 500 }
      );
    }

    // Fetch accounts to sync
    let accountsQuery = createServiceClient()
      .from("social_accounts")
      .select("outstand_account_id, platform, encrypted_access_token, encrypted_page_access_token")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (accountIds && accountIds.length > 0) {
      accountsQuery = accountsQuery.in("outstand_account_id", accountIds);
    }

    if (platforms && platforms.length > 0) {
      accountsQuery = accountsQuery.in("platform", platforms);
    }

    const { data: accounts, error: accountsError } = await accountsQuery;

    if (accountsError) {
      console.error("[sync] Error fetching accounts:", accountsError);
      return NextResponse.json(
        { data: null, error: "Failed to fetch accounts" },
        { status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        data: {
          synced: 0,
          skipped: 0,
          errors: 0,
          results: [],
        },
        error: null,
      });
    }

    // Sync each account
    const orchestrator = new SyncOrchestrator();
    const results = [];
    let totalSynced = 0;
    let totalErrors = 0;

    for (const account of accounts) {
      try {
        // Decrypt tokens from encrypted columns
        if (!account.encrypted_access_token) {
          console.warn(`[sync] No encrypted token for account ${account.outstand_account_id}`);
          continue;
        }

        let accessToken = "";
        let pageAccessToken = "";

        try {
          accessToken = TokenVault.decrypt(account.encrypted_access_token);
          if (account.encrypted_page_access_token) {
            pageAccessToken = TokenVault.decrypt(account.encrypted_page_access_token);
          }
        } catch (decryptError) {
          console.error(`[sync] Failed to decrypt tokens for ${account.outstand_account_id}:`, decryptError);
          totalErrors++;
          continue;
        }

        const result = await orchestrator.sync({
          workspaceId,
          accountId: account.outstand_account_id,
          platform: account.platform as Platform,
          accessToken,
          pageAccessToken,
          syncComments,
          syncMessages,
          since,
        });

        results.push(result);
        totalSynced += (result.commentsResult?.syncedCount || 0) + (result.messagesResult?.syncedCount || 0);

        if (result.status === 'failed') {
          totalErrors++;
        }
      } catch (error) {
        console.error(
          `[sync] Error syncing account ${account.outstand_account_id}:`,
          error
        );
        totalErrors++;
      }
    }

    return NextResponse.json({
      data: {
        synced: totalSynced,
        skipped: 0,
        errors: totalErrors,
        results,
      },
      error: null,
    });
  } catch (error) {
    console.error("[api/inbox/sync] Unexpected error:", error);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
