import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProviderForPlatform } from "@/lib/providers";

// ── Helper: verify ownership & fetch account ────────────────

async function getAccountWithAuth(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 } as const;

  const serviceClient = createServiceClient();

  const { data: account } = await serviceClient
    .from("social_accounts")
    .select("id, workspace_id, outstand_account_id, platform, username, display_name, is_active, health_status")
    .eq("id", id)
    .single();

  if (!account) return { error: "Account not found", status: 404 } as const;

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", account.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || !["owner", "manager"].includes(member.role)) {
    return { error: "Forbidden", status: 403 } as const;
  }

  const { data: workspace } = await serviceClient
    .from("workspaces")
    .select("outstand_api_key")
    .eq("id", account.workspace_id)
    .single();

  return { account, apiKey: workspace?.outstand_api_key ?? null, serviceClient };
}

// ── PATCH /api/accounts/[id] ────────────────────────────────
// Toggle active/inactive status for an account.
// Body: { is_active: boolean }

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getAccountWithAuth(id);
    if ("error" in result) {
      return NextResponse.json({ data: null, error: result.error }, { status: result.status });
    }

    const { account, serviceClient } = result;
    const body = await request.json() as { is_active?: boolean };

    if (typeof body.is_active !== "boolean") {
      return NextResponse.json({ data: null, error: "is_active (boolean) is required" }, { status: 400 });
    }

    // Prevent activating an account with expired token — user needs to reconnect
    if (body.is_active && account.health_status === "token_expired") {
      return NextResponse.json(
        { data: null, error: "Token expired. Please reconnect this account before activating." },
        { status: 400 }
      );
    }

    // Prevent activating an account that was disconnected from the provider
    if (body.is_active && account.health_status === "disconnected") {
      return NextResponse.json(
        { data: null, error: "Account is disconnected. Please reconnect to activate." },
        { status: 400 }
      );
    }

    const healthStatus = body.is_active ? "healthy" : "paused";

    const { error } = await serviceClient
      .from("social_accounts")
      .update({ is_active: body.is_active, health_status: healthStatus })
      .eq("id", account.id);

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true, is_active: body.is_active, health_status: healthStatus } });
  } catch (err) {
    console.error("[api/accounts/[id]] PATCH Error:", err);
    const message = err instanceof Error ? err.message : "Failed to update account";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

// ── DELETE /api/accounts/[id] ───────────────────────────────
// Fully disconnects and removes a social account.
// Cleans up: provider disconnect → tokens → scheduled posts → social_accounts record

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getAccountWithAuth(id);
    if ("error" in result) {
      return NextResponse.json({ data: null, error: result.error }, { status: result.status });
    }

    const { account, apiKey, serviceClient } = result;
    const accountId = account.outstand_account_id;

    // ── 1. Disconnect via the platform's provider (best effort) ──
    if (accountId) {
      try {
        const provider = getProviderForPlatform(account.platform);
        await provider.disconnectAccount({
          providerAccountId: accountId,
          apiKey,
        });
      } catch (err) {
        // Log but don't block local cleanup — provider may be down or account already removed
        console.warn("[api/accounts/[id]] Provider disconnect failed (continuing cleanup):", err);
      }
    }

    // ── 2. Clean up token tables for direct providers (belt & suspenders) ──
    // The provider.disconnectAccount should handle this, but ensure cleanup if it failed
    if (accountId) {
      if (accountId.startsWith("meta_")) {
        await serviceClient
          .from("meta_tokens")
          .delete()
          .eq("workspace_id", account.workspace_id)
          .eq("account_id", accountId);
      } else if (accountId.startsWith("yt_")) {
        await serviceClient
          .from("youtube_tokens")
          .delete()
          .eq("workspace_id", account.workspace_id)
          .eq("account_id", accountId);
      } else if (accountId.startsWith("li_")) {
        await serviceClient
          .from("linkedin_tokens")
          .delete()
          .eq("workspace_id", account.workspace_id)
          .eq("account_id", accountId);
      }
    }

    // ── 3. Cancel any scheduled (not yet published) posts for this account ──
    // Only cancel posts that haven't been published yet
    const { data: scheduledPosts } = await serviceClient
      .from("posts")
      .select("id, account_ids, status")
      .eq("workspace_id", account.workspace_id)
      .in("status", ["scheduled", "draft"])
      .contains("account_ids", [account.username]);

    // Also check by outstand_account_id
    const { data: scheduledPostsById } = await serviceClient
      .from("posts")
      .select("id, account_ids, status")
      .eq("workspace_id", account.workspace_id)
      .in("status", ["scheduled", "draft"])
      .contains("account_ids", [accountId]);

    const allScheduled = [
      ...(scheduledPosts ?? []),
      ...(scheduledPostsById ?? []),
    ];

    // Deduplicate by id
    const uniquePostIds = [...new Set(allScheduled.map((p) => p.id))];

    if (uniquePostIds.length > 0) {
      // For posts targeting ONLY this account, cancel them
      // For posts targeting multiple accounts, just remove this account from the list
      for (const post of allScheduled) {
        const accountIds = (post.account_ids as string[]) ?? [];
        const remaining = accountIds.filter(
          (aid) => aid !== account.username && aid !== accountId
        );

        if (remaining.length === 0) {
          // Only account on this post — cancel it
          await serviceClient
            .from("posts")
            .update({ status: "cancelled" })
            .eq("id", post.id);
        } else {
          // Other accounts still need this post — just remove this account
          await serviceClient
            .from("posts")
            .update({ account_ids: remaining })
            .eq("id", post.id);
        }
      }
    }

    // ── 4. Track deleted account so sync won't re-create it ──
    if (accountId) {
      await serviceClient
        .from("deleted_social_accounts")
        .upsert(
          {
            workspace_id: account.workspace_id,
            outstand_account_id: accountId,
            platform: account.platform,
            deleted_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id,outstand_account_id" }
        );
    }

    // ── 5. Fully remove the social_accounts record ──
    const { error } = await serviceClient
      .from("social_accounts")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        success: true,
        cancelledPosts: uniquePostIds.length,
      },
    });
  } catch (err) {
    console.error("[api/accounts/[id]] DELETE Error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete account";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
