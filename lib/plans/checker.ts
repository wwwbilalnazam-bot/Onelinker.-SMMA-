import { createClient } from "@/lib/supabase/server";
import { Plan, type UsageStats, type PlanCheckResult, type PlanFeatureName } from "@/types";
import {
  PLAN_LIMITS,
  PLAN_RANK,
  getUsagePercentage,
  planHasFeature,
} from "./limits";

// ════════════════════════════════════════════════════════════
// PLAN LIMIT CHECKER — Account-Level Billing
// Plan is resolved from the workspace owner's subscription.
// Quota limits (posts, AI) are aggregated across all workspaces
// owned by the user (account-level pool).
// ════════════════════════════════════════════════════════════

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

// ── Get user's plan from their subscription ───────────────────

export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = await createClient();

  // Try user_id-based lookup first (new schema)
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return (data.plan as Plan) ?? Plan.Free;
  }

  // Fallback: resolve via workspace owner (pre-migration)
  const { data: ws } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (ws?.plan as Plan) ?? Plan.Free;
}

// ── Resolve workspace owner's plan ────────────────────────────

export async function getWorkspaceOwnerPlan(
  workspaceId: string
): Promise<{ plan: Plan; ownerId: string }> {
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();

  if (!workspace) return { plan: Plan.Free, ownerId: "" };

  const plan = await getUserPlan(workspace.owner_id);
  return { plan, ownerId: workspace.owner_id };
}

// ── Legacy alias — reads from owner's subscription now ────────

export async function getWorkspacePlan(workspaceId: string): Promise<Plan> {
  const { plan } = await getWorkspaceOwnerPlan(workspaceId);
  return plan;
}

// ── Get current usage stats ───────────────────────────────────

export async function getUsage(workspaceId: string): Promise<UsageStats> {
  const supabase = await createClient();
  const month = currentMonth();

  // Resolve owner and plan
  const { plan, ownerId } = await getWorkspaceOwnerPlan(workspaceId);
  const limits = PLAN_LIMITS[plan];

  const [usageResult, accountsResult, mediaResult, membersResult, workspacesResult] =
    await Promise.all([
      supabase
        .from("post_usage")
        .select("post_count, ai_count")
        .eq("workspace_id", workspaceId)
        .eq("month", month)
        .maybeSingle(),
      supabase
        .from("social_accounts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("is_active", true),
      supabase
        .from("media_files")
        .select("file_size")
        .eq("workspace_id", workspaceId),
      supabase
        .from("workspace_members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      ownerId
        ? supabase
            .from("workspaces")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", ownerId)
        : Promise.resolve({ count: 1 }),
    ]);

  const postsUsed = usageResult.data?.post_count ?? 0;
  const aiUsed = usageResult.data?.ai_count ?? 0;
  const channelsUsed = accountsResult.count ?? 0;
  const teamCount = membersResult.count ?? 0;
  const workspacesCount = workspacesResult.count ?? 1;

  const storageBytesUsed = (mediaResult.data ?? []).reduce(
    (sum, f) => sum + (f.file_size ?? 0),
    0
  );
  const storageMbUsed = Math.round(storageBytesUsed / (1024 * 1024));

  return {
    posts_used: postsUsed,
    posts_limit: limits.max_posts_per_month,
    ai_used: aiUsed,
    ai_limit: limits.max_ai_generations,
    channels_used: channelsUsed,
    channels_limit: limits.max_channels,
    storage_used_mb: storageMbUsed,
    storage_limit_mb: limits.storage_mb,
    team_members_count: teamCount,
    team_limit: limits.max_team_members,
    workspaces_count: workspacesCount,
    workspaces_limit: limits.max_workspaces,
    percentage_posts_used: getUsagePercentage(postsUsed, limits.max_posts_per_month),
    percentage_ai_used: getUsagePercentage(aiUsed, limits.max_ai_generations),
    percentage_storage_used: getUsagePercentage(storageMbUsed, limits.storage_mb),
  };
}

// ── Get remaining posts ───────────────────────────────────────

export async function getRemainingPosts(workspaceId: string): Promise<number> {
  const { plan, ownerId } = await getWorkspaceOwnerPlan(workspaceId);
  const limit = PLAN_LIMITS[plan].max_posts_per_month;
  if (limit === null) return Infinity;

  // Account-level: aggregate across all owner's workspaces
  const supabase = await createClient();
  const month = currentMonth();

  const { data: allUsage } = await supabase
    .from("post_usage")
    .select("post_count, workspace_id")
    .eq("month", month);

  // Get owner's workspace IDs
  const { data: ownerWs } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", ownerId);

  const ownerWsIds = new Set((ownerWs ?? []).map((w) => w.id));
  const totalUsed = (allUsage ?? [])
    .filter((u) => ownerWsIds.has(u.workspace_id))
    .reduce((sum, u) => sum + (u.post_count ?? 0), 0);

  return Math.max(0, limit - totalUsed);
}

// ── Check post limit (account-level) ─────────────────────────

export async function checkPostLimit(workspaceId: string): Promise<PlanCheckResult> {
  const { plan, ownerId } = await getWorkspaceOwnerPlan(workspaceId);
  const limit = PLAN_LIMITS[plan].max_posts_per_month;

  if (limit === null) {
    return { allowed: true, plan, upgrade_required: false };
  }

  // Account-level: aggregate across all owner's workspaces
  const supabase = await createClient();
  const month = currentMonth();

  const { data: ownerWs } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", ownerId);

  const ownerWsIds = (ownerWs ?? []).map((w) => w.id);

  let totalUsed = 0;
  if (ownerWsIds.length > 0) {
    const { data: allUsage } = await supabase
      .from("post_usage")
      .select("post_count")
      .in("workspace_id", ownerWsIds)
      .eq("month", month);

    totalUsed = (allUsage ?? []).reduce((sum, u) => sum + (u.post_count ?? 0), 0);
  }

  if (totalUsed >= limit) {
    return {
      allowed: false,
      reason: "post_limit",
      current: totalUsed,
      limit,
      plan,
      upgrade_required: true,
      error: {
        type: "post_limit",
        current: totalUsed,
        limit,
        plan,
        upgrade_url: "/billing",
        message: `You've used all ${limit} posts for this month.`,
      },
    };
  }

  return { allowed: true, current: totalUsed, limit, plan, upgrade_required: false };
}

// ── Check daily post limit (free plan anti-abuse) ─────────────

export async function checkDailyPostLimit(workspaceId: string): Promise<PlanCheckResult> {
  const { plan } = await getWorkspaceOwnerPlan(workspaceId);

  // Only enforce on free plan
  if (plan !== Plan.Free) {
    return { allowed: true, plan, upgrade_required: false };
  }

  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", todayStart.toISOString());

  const todayCount = count ?? 0;
  const dailyLimit = 10;

  if (todayCount >= dailyLimit) {
    return {
      allowed: false,
      reason: "daily_post_limit",
      current: todayCount,
      limit: dailyLimit,
      plan,
      upgrade_required: true,
      error: {
        type: "post_limit",
        current: todayCount,
        limit: dailyLimit,
        plan,
        upgrade_url: "/billing",
        message: "You've reached the daily post limit (10/day) on the free plan.",
      },
    };
  }

  return { allowed: true, current: todayCount, limit: dailyLimit, plan, upgrade_required: false };
}

// ── Check channel limit ───────────────────────────────────────

export async function checkChannelLimit(workspaceId: string): Promise<PlanCheckResult> {
  const supabase = await createClient();
  const { plan, ownerId } = await getWorkspaceOwnerPlan(workspaceId);
  let limit = PLAN_LIMITS[plan].max_channels;

  // Add extra channels from subscription (Creator & Agency add-on)
  if (limit !== null && (plan === Plan.Creator || plan === Plan.Agency)) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("extra_channels")
      .eq("user_id", ownerId)
      .maybeSingle();

    const extraChannels = (sub?.extra_channels as number) ?? 0;
    limit = limit + extraChannels;
  }

  let used: number;

  if (plan === Plan.Agency) {
    // Agency: account-level — count channels across ALL owner's workspaces
    const { data: ownerWs } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", ownerId);

    const ownerWsIds = (ownerWs ?? []).map((w) => w.id);

    if (ownerWsIds.length === 0) {
      used = 0;
    } else {
      const { count } = await supabase
        .from("social_accounts")
        .select("id", { count: "exact", head: true })
        .in("workspace_id", ownerWsIds)
        .eq("is_active", true);
      used = count ?? 0;
    }
  } else {
    // Creator / Free: per-workspace
    const { count } = await supabase
      .from("social_accounts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);
    used = count ?? 0;
  }

  if (limit === null) {
    return { allowed: true, plan, upgrade_required: false };
  }

  if (used >= limit) {
    return {
      allowed: false,
      reason: "channel_limit",
      current: used,
      limit,
      plan,
      upgrade_required: true,
      error: {
        type: "channel_limit",
        current: used,
        limit,
        plan,
        upgrade_url: "/billing",
        message: `You've connected ${used} of ${limit} allowed social channels.`,
      },
    };
  }

  return { allowed: true, current: used, limit, plan, upgrade_required: false };
}

// ── Check AI generation limit (account-level) ─────────────────

export async function checkAILimit(workspaceId: string): Promise<PlanCheckResult> {
  const { plan, ownerId } = await getWorkspaceOwnerPlan(workspaceId);
  const limit = PLAN_LIMITS[plan].max_ai_generations;

  if (limit === null) {
    return { allowed: true, plan, upgrade_required: false };
  }

  // Account-level: aggregate across all owner's workspaces
  const supabase = await createClient();
  const month = currentMonth();

  const { data: ownerWs } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", ownerId);

  const ownerWsIds = (ownerWs ?? []).map((w) => w.id);

  let totalUsed = 0;
  if (ownerWsIds.length > 0) {
    const { data: allUsage } = await supabase
      .from("post_usage")
      .select("ai_count")
      .in("workspace_id", ownerWsIds)
      .eq("month", month);

    totalUsed = (allUsage ?? []).reduce((sum, u) => sum + (u.ai_count ?? 0), 0);
  }

  if (totalUsed >= limit) {
    return {
      allowed: false,
      reason: "ai_limit",
      current: totalUsed,
      limit,
      plan,
      upgrade_required: true,
      error: {
        type: "ai_limit",
        current: totalUsed,
        limit,
        plan,
        upgrade_url: "/billing",
        message: `You've used all ${limit} AI generations for this month.`,
      },
    };
  }

  return { allowed: true, current: totalUsed, limit, plan, upgrade_required: false };
}

// ── Check team member limit ───────────────────────────────────

export async function checkTeamLimit(workspaceId: string): Promise<PlanCheckResult> {
  const supabase = await createClient();
  const { plan } = await getWorkspaceOwnerPlan(workspaceId);
  const limit = PLAN_LIMITS[plan].max_team_members;

  const { count } = await supabase
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const used = count ?? 0;

  if (limit === null) {
    return { allowed: true, plan, upgrade_required: false };
  }

  if (used >= limit) {
    return {
      allowed: false,
      reason: "team_limit",
      current: used,
      limit,
      plan,
      upgrade_required: true,
      error: {
        type: "post_limit",
        current: used,
        limit,
        plan,
        upgrade_url: "/billing",
        message: `Your plan allows ${limit} team member${limit === 1 ? "" : "s"}.`,
      },
    };
  }

  return { allowed: true, current: used, limit, plan, upgrade_required: false };
}

// ── Check workspace count limit (per user, account-level) ─────

export async function checkWorkspaceLimit(userId: string): Promise<PlanCheckResult> {
  const supabase = await createClient();
  const plan = await getUserPlan(userId);
  const baseLimit = PLAN_LIMITS[plan].max_workspaces;

  // Get extra workspaces from subscription add-ons
  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .select("extra_workspaces")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  // extra_workspaces column may not exist pre-migration
  const extraWs = (!subErr && sub?.extra_workspaces) ? sub.extra_workspaces : 0;
  const totalLimit = baseLimit === null ? null : baseLimit + extraWs;

  const { count } = await supabase
    .from("workspaces")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);

  const owned = count ?? 0;

  if (totalLimit === null) {
    return { allowed: true, plan, upgrade_required: false };
  }

  if (owned >= totalLimit) {
    return {
      allowed: false,
      reason: "workspace_limit",
      current: owned,
      limit: totalLimit,
      plan,
      upgrade_required: true,
      error: {
        type: "feature_locked",
        current: owned,
        limit: totalLimit,
        plan,
        upgrade_url: "/billing",
        message: `Your plan allows ${totalLimit} workspace${totalLimit === 1 ? "" : "s"}.`,
      },
    };
  }

  return { allowed: true, current: owned, limit: totalLimit, plan, upgrade_required: false };
}

// ── Check storage limit ───────────────────────────────────────

export async function checkStorageLimit(
  workspaceId: string,
  newFileSizeBytes: number
): Promise<PlanCheckResult> {
  const supabase = await createClient();
  const { plan } = await getWorkspaceOwnerPlan(workspaceId);
  const limitMb = PLAN_LIMITS[plan].storage_mb;
  if (limitMb === null) return { allowed: true, plan, upgrade_required: false };

  const { data: mediaResult } = await supabase
    .from("media_files")
    .select("file_size")
    .eq("workspace_id", workspaceId);

  const limitBytes = limitMb * 1024 * 1024;
  const usedBytes = (mediaResult ?? []).reduce((s, f) => s + (f.file_size ?? 0), 0);
  const projectedBytes = usedBytes + newFileSizeBytes;

  if (projectedBytes > limitBytes) {
    return {
      allowed: false,
      reason: "storage_limit",
      current: Math.round(usedBytes / 1024 / 1024),
      limit: limitMb,
      plan,
      upgrade_required: true,
      error: {
        type: "storage_limit",
        current: Math.round(usedBytes / 1024 / 1024),
        limit: limitMb,
        plan,
        upgrade_url: "/billing",
        message: `Uploading this file would exceed your ${limitMb}MB storage limit.`,
      },
    };
  }

  return { allowed: true, plan, upgrade_required: false };
}

// ── Check feature access ──────────────────────────────────────

export async function checkFeatureAccess(
  workspaceId: string,
  feature: PlanFeatureName
): Promise<PlanCheckResult> {
  const { plan } = await getWorkspaceOwnerPlan(workspaceId);
  const allowed = planHasFeature(plan, feature);

  if (!allowed) {
    return {
      allowed: false,
      reason: "feature_locked",
      plan,
      upgrade_required: true,
      error: {
        type: "feature_locked",
        current: 0,
        limit: 0,
        plan,
        upgrade_url: "/billing",
        message: `This feature is not available on the ${plan} plan.`,
      },
    };
  }

  return { allowed: true, plan, upgrade_required: false };
}

// ── Check plan rank ───────────────────────────────────────────

export function meetsMinPlan(userPlan: Plan, requiredPlan: Plan): boolean {
  return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}
