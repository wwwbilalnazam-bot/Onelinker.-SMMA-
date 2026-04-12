import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/meta/client";
import { getMetaAccessToken } from "@/lib/meta/accounts";
import { getYouTubeAccessToken } from "@/lib/youtube/accounts";

// POST /api/accounts/sync-followers
// Syncs follower counts from all platforms for a workspace
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { workspaceId?: string };
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { data: null, error: "Missing workspaceId" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // Get all active accounts for this workspace
    const { data: accounts, error: accountsError } = await serviceClient
      .from("social_accounts")
      .select("id, outstand_account_id, platform, username")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (accountsError) {
      console.error("[sync-followers] Error fetching accounts:", accountsError);
      return NextResponse.json(
        { data: null, error: "Failed to fetch accounts" },
        { status: 500 }
      );
    }

    let synced = 0;
    let errors = 0;

    console.log(`[sync-followers] Syncing followers for ${accounts?.length || 0} accounts`);

    for (const account of accounts || []) {
      try {
        let followerCount: number | null = null;

        if (account.platform === "facebook") {
          // Facebook: Fetch page info
          const tokenData = await getMetaAccessToken(workspaceId, account.outstand_account_id);
          if (!tokenData) {
            console.warn(`[sync-followers] No token for Facebook account ${account.id}`);
            continue;
          }

          const pageId = account.outstand_account_id.replace("meta_fb_", "");
          const pageInfo = await graphGet<{ followers_count?: number }>(
            `/${pageId}`,
            { fields: "followers_count" },
            tokenData.accessToken
          );

          followerCount = pageInfo.followers_count ?? 0;
          console.log(`[sync-followers] Facebook ${account.username}: ${followerCount} followers`);

        } else if (account.platform === "instagram") {
          // Instagram: Fetch IG user info
          const tokenData = await getMetaAccessToken(workspaceId, account.outstand_account_id);
          if (!tokenData) {
            console.warn(`[sync-followers] No token for Instagram account ${account.id}`);
            continue;
          }

          const igUserId = tokenData.igUserId;
          if (!igUserId) {
            console.warn(`[sync-followers] No IG user ID for ${account.id}`);
            continue;
          }

          const igInfo = await graphGet<{ followers_count?: number }>(
            `/${igUserId}`,
            { fields: "followers_count" },
            tokenData.accessToken
          );

          followerCount = igInfo.followers_count ?? 0;
          console.log(`[sync-followers] Instagram ${account.username}: ${followerCount} followers`);

        } else if (account.platform === "youtube") {
          // YouTube: Fetch channel info
          const tokenData = await getYouTubeAccessToken(workspaceId, account.outstand_account_id);
          if (!tokenData) {
            console.warn(`[sync-followers] No token for YouTube account ${account.id}`);
            continue;
          }

          // YouTube uses "subscriberCount" from channels.statistics
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true&access_token=${tokenData.accessToken}`
          );

          if (!response.ok) {
            console.warn(`[sync-followers] YouTube API error for ${account.id}`);
            continue;
          }

          const data = await response.json() as any;
          const subscriberCount = data.items?.[0]?.statistics?.subscriberCount;
          followerCount = subscriberCount ? parseInt(subscriberCount) : 0;
          console.log(`[sync-followers] YouTube ${account.username}: ${followerCount} subscribers`);
        }

        // Update the account with new follower count
        if (followerCount !== null) {
          const { error: updateError } = await serviceClient
            .from("social_accounts")
            .update({ followers_count: followerCount, last_synced: new Date().toISOString() })
            .eq("id", account.id);

          if (updateError) {
            console.error(`[sync-followers] Error updating account ${account.id}:`, updateError);
            errors++;
          } else {
            synced++;
          }
        }

      } catch (err) {
        console.error(`[sync-followers] Error processing account ${account.id}:`, err);
        errors++;
      }
    }

    console.log(`[sync-followers] Completed: synced=${synced}, errors=${errors}`);

    return NextResponse.json({
      data: { synced, errors },
      error: null,
    });

  } catch (err) {
    console.error("[sync-followers] Unexpected error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
