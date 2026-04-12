import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProviderForPlatform } from "@/lib/providers";

// POST /api/analytics/sync
// Body: { workspaceId }
// Fetches recent post metrics from all platforms and syncs them to post_metrics

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
        { data: null, error: "Missing required field: workspaceId" },
        { status: 400 }
      );
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .not("accepted_at", "is", null)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ data: null, error: "Not a workspace member" }, { status: 403 });
    }

    const serviceClient = createServiceClient();

    // Query recent published posts (last 30 days, limit 50)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: posts, error: postsError } = await serviceClient
      .from("posts")
      .select("id, outstand_post_id, platforms, account_ids, published_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "published")
      .gte("published_at", thirtyDaysAgo.toISOString())
      .order("published_at", { ascending: false })
      .limit(50);

    if (postsError) {
      console.error("[api/analytics/sync] Error querying posts:", postsError);
      return NextResponse.json(
        { data: null, error: "Failed to query posts" },
        { status: 500 }
      );
    }

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    const metricsToInsert: any[] = [];

    // Process each post
    for (const post of posts || []) {
      if (!post.outstand_post_id || !post.platforms) continue;

      for (const platform of post.platforms) {
        try {
          const provider = getProviderForPlatform(platform);
          console.log(`[api/analytics/sync] Syncing ${platform} metrics for post ${post.id}`);
          
          if (!provider.getPostAnalytics) {
            skipped++;
            continue;
          }
          const analytics = await provider.getPostAnalytics({
            providerPostId: post.outstand_post_id,
          });

          metricsToInsert.push({
            post_id: post.id,
            platform: platform,
            likes: analytics.likes || 0,
            comments: analytics.comments || 0,
            shares: analytics.shares || 0,
            reach: analytics.reach || 0,
            clicks: analytics.clicks || 0,
            impressions: analytics.impressions || 0,
            recorded_at: new Date().toISOString(),
          });

          synced++;
        } catch (err) {
          console.error(`[api/analytics/sync] Failed for post ${post.id} (${platform}):`, err);
          errors++;
        }
      }
    }

    // Insert all collected metrics
    if (metricsToInsert.length > 0) {
      const { error: insertError } = await serviceClient
        .from("post_metrics")
        .insert(metricsToInsert);

      if (insertError) {
        console.error("[api/analytics/sync] Error inserting metrics:", insertError);
        return NextResponse.json({ data: null, error: "Failed to save metrics" }, { status: 500 });
      }
    }

    return NextResponse.json({
      data: { synced, skipped, errors },
      error: null,
    });
  } catch (err) {
    console.error("[api/analytics/sync] Unexpected error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
