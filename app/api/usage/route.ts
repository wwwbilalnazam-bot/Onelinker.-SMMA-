import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/plans/limits";
import { Plan } from "@/types";
import type { UsageStats } from "@/types";

// GET /api/usage?workspaceId=<uuid>
// Returns UsageStats for the workspace — called by WorkspaceContext on load.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { data: null, error: "workspaceId is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // getSession() reads JWT from cookie — no Supabase Auth network call.
    // Middleware already validated the token for this route.
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Run all queries in parallel — 3 queries instead of 5
    // Combined workspace_members query gets role + team count + user workspace count
    const [membersResult, usageResult, channelsResult] =
      await Promise.all([
        // Single query: all members of this workspace + user's own membership
        supabase
          .from("workspace_members")
          .select("user_id, role, accepted_at")
          .eq("workspace_id", workspaceId),

        // Core usage from DB function (posts, AI, storage)
        supabase.rpc("get_workspace_usage", { p_workspace_id: workspaceId }),

        // Connected social channels
        supabase
          .from("social_accounts")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("is_active", true),
      ]);

    // Derive membership, team count from single query
    const allMembers = membersResult.data ?? [];
    const myMembership = allMembers.find((m) => m.user_id === user.id);

    if (!myMembership) {
      return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
    }

    const teamCount = allMembers.filter((m) => m.accepted_at !== null).length;

    // Get user's total workspaces (lightweight count query)
    const { count: workspacesCount } = await supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Extract values from DB function result
    const usage = usageResult.data?.[0];
    const plan = (usage?.plan ?? Plan.Free) as Plan;
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS[Plan.Free];

    const postsUsed       = usage?.post_count       ?? 0;
    const aiUsed          = usage?.ai_count          ?? 0;
    const storageUsedMb   = Number(usage?.storage_used_mb  ?? 0);
    const storageLimitMb  = usage?.storage_limit_mb != null
      ? Number(usage.storage_limit_mb)
      : limits.storage_mb;

    const channelsUsed    = channelsResult.count  ?? 0;

    const postsLimit    = limits.max_posts_per_month;
    const aiLimit       = limits.max_ai_generations;
    const channelsLimit = limits.max_channels;
    const teamLimit     = limits.max_team_members;
    const wsLimit       = limits.max_workspaces;

    function pct(used: number, limit: number | null): number {
      if (limit === null || limit === 0) return 0;
      return Math.min(Math.round((used / limit) * 100), 100);
    }

    const stats: UsageStats = {
      posts_used:             postsUsed,
      posts_limit:            postsLimit,
      ai_used:                aiUsed,
      ai_limit:               aiLimit,
      channels_used:          channelsUsed,
      channels_limit:         channelsLimit,
      storage_used_mb:        storageUsedMb,
      storage_limit_mb:       storageLimitMb,
      team_members_count:     teamCount,
      team_limit:             teamLimit,
      workspaces_count:       workspacesCount ?? 0,
      workspaces_limit:       wsLimit,
      percentage_posts_used:  pct(postsUsed,    postsLimit),
      percentage_ai_used:     pct(aiUsed,       aiLimit),
      percentage_storage_used: pct(storageUsedMb, storageLimitMb),
    };

    return NextResponse.json({ data: stats });
  } catch (err) {
    console.error("[api/usage] Unexpected error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
