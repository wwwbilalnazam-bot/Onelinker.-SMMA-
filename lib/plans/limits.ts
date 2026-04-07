import { Plan, type PlanLimits, type PlanFeatureName, type PlatformMeta, Platform } from "@/types";

// ════════════════════════════════════════════════════════════
// PLAN LIMITS — Single source of truth
// Mirrors the plan_limits table in Supabase.
// Used on both client (UI) and server (enforcement).
// Update here + run migration when changing limits.
// ════════════════════════════════════════════════════════════

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  [Plan.Free]: {
    plan: Plan.Free,
    max_channels: 3,
    max_posts_per_month: 50,
    max_ai_generations: 3,
    max_team_members: 1,
    max_workspaces: 1,
    max_queues: 1,
    analytics_days: 7,
    storage_mb: 50,           // 50 MB
    has_inbox: false,
    has_approval_workflow: false,
    has_white_label: false,
    has_api_access: false,
    has_csv_export: false,
    overage_price_per_100: null,
  },

  [Plan.Creator]: {
    plan: Plan.Creator,
    max_channels: 6,
    max_posts_per_month: 1000,
    max_ai_generations: 200,
    max_team_members: 1,
    max_workspaces: 1,
    max_queues: 5,
    analytics_days: 90,
    storage_mb: 5120,         // 5 GB
    has_inbox: true,
    has_approval_workflow: false,
    has_white_label: false,
    has_api_access: false,
    has_csv_export: false,
    overage_price_per_100: 1.00, // $10 per 1,000 extra posts
  },

  [Plan.Agency]: {
    plan: Plan.Agency,
    max_channels: 50,         // 50 total across all workspaces, +$3/mo per extra channel
    max_posts_per_month: 5000, // 5,000 posts/month, +$10 per 1,000 extra
    max_ai_generations: null, // unlimited
    max_team_members: null,   // unlimited
    max_workspaces: 5,        // 5 included, +$15 per extra
    max_queues: null,         // unlimited
    analytics_days: 365,
    storage_mb: 51200,        // 50 GB
    has_inbox: true,
    has_approval_workflow: true,
    has_white_label: true,
    has_api_access: true,
    has_csv_export: true,
    overage_price_per_100: 1.00, // $10 per 1,000 extra posts
  },

  [Plan.Enterprise]: {
    plan: Plan.Enterprise,
    max_channels: null,
    max_posts_per_month: null,
    max_ai_generations: null,
    max_team_members: null,
    max_workspaces: null,
    max_queues: null,
    analytics_days: null,
    storage_mb: null,
    has_inbox: true,
    has_approval_workflow: true,
    has_white_label: true,
    has_api_access: true,
    has_csv_export: true,
    overage_price_per_100: null,
  },
};

// ── Plan Pricing ──────────────────────────────────────────────

export const PLAN_PRICES = {
  [Plan.Free]: {
    monthly: 0,
    yearly: 0,
    yearly_total: 0,
    yearly_savings: 0,
    stripe_price_id_monthly: "",
    stripe_price_id_yearly: "",
  },
  [Plan.Creator]: {
    monthly: 29,
    yearly: 24,          // $290/year ÷ 12 ≈ $24.17
    yearly_total: 290,
    yearly_savings: 58,  // 2 months free
    stripe_price_id_monthly: process.env.STRIPE_INDIVIDUAL_MONTHLY_PRICE_ID ?? "",
    stripe_price_id_yearly: process.env.STRIPE_INDIVIDUAL_YEARLY_PRICE_ID ?? "",
  },
  [Plan.Agency]: {
    monthly: 89,
    yearly: 74,          // $890/year ÷ 12 ≈ $74.17
    yearly_total: 890,
    yearly_savings: 178, // 2 months free
    stripe_price_id_monthly: process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID ?? "",
    stripe_price_id_yearly: process.env.STRIPE_AGENCY_YEARLY_PRICE_ID ?? "",
  },
  [Plan.Enterprise]: {
    monthly: 199,
    yearly: 199,
    yearly_total: 2388,
    yearly_savings: 0,
    stripe_price_id_monthly: "",
    stripe_price_id_yearly: "",
  },
} as const;

// ── Workspace add-on pricing ──────────────────────────────────

export const WORKSPACE_ADDON_PRICE = 15; // $15/mo per extra workspace
export const POST_ADDON_PRICE = 10;      // $10 per 1,000 extra posts
export const CHANNEL_ADDON_PRICE = 3;    // $3/mo per extra channel (Creator plan)

// ── Plan Display Names & Metadata ─────────────────────────────

export const PLAN_META = {
  [Plan.Free]: {
    name: "Free",
    tagline: "Get started for free",
    color: "#8888AA",
    badge_class: "free",
    cta: "Get started free",
    highlighted: false,
  },
  [Plan.Creator]: {
    name: "Individual",
    tagline: "For freelancers & creators",
    color: "#6C47FF",
    badge_class: "creator",
    cta: "Upgrade to Individual",
    highlighted: true,
  },
  [Plan.Agency]: {
    name: "Agency",
    tagline: "For agencies & multi-brand owners",
    color: "#9333EA",
    badge_class: "agency",
    cta: "Upgrade to Agency",
    highlighted: false,
  },
  [Plan.Enterprise]: {
    name: "Enterprise",
    tagline: "Custom for large teams",
    color: "#00D4AA",
    badge_class: "enterprise",
    cta: "Talk to sales",
    highlighted: false,
  },
} as const;

// ── Feature → Plan requirements ───────────────────────────────

export const FEATURE_PLANS: Record<PlanFeatureName, Plan> = {
  inbox: Plan.Creator,
  approval_workflow: Plan.Agency,
  white_label: Plan.Agency,
  api_access: Plan.Agency,
  csv_export: Plan.Agency,
  client_portals: Plan.Agency,
  unlimited_queues: Plan.Agency,
  best_time_ai: Plan.Creator,
  advanced_analytics: Plan.Creator,
  multiple_workspaces: Plan.Agency,
};

// ── Plan Hierarchy (higher = more features) ───────────────────

export const PLAN_RANK: Record<Plan, number> = {
  [Plan.Free]: 0,
  [Plan.Creator]: 1,
  [Plan.Agency]: 2,
  [Plan.Enterprise]: 3,
};

export function planMeetsRequirement(userPlan: Plan, requiredPlan: Plan): boolean {
  return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

export function planHasFeature(plan: Plan, feature: PlanFeatureName): boolean {
  const limits = PLAN_LIMITS[plan];
  switch (feature) {
    case "inbox":               return limits.has_inbox;
    case "approval_workflow":   return limits.has_approval_workflow;
    case "white_label":         return limits.has_white_label;
    case "api_access":          return limits.has_api_access;
    case "csv_export":          return limits.has_csv_export;
    case "client_portals":      return limits.has_white_label; // same gate
    case "unlimited_queues":    return limits.max_queues === null;
    case "best_time_ai":        return planMeetsRequirement(plan, Plan.Creator);
    case "advanced_analytics":  return planMeetsRequirement(plan, Plan.Creator);
    case "multiple_workspaces": return planMeetsRequirement(plan, Plan.Agency);
    default:                    return false;
  }
}

// ── Usage warning thresholds ──────────────────────────────────

export const USAGE_THRESHOLDS = {
  WARNING: 0.75,  // 75% — yellow warning
  CRITICAL: 0.90, // 90% — orange urgent
  BLOCKED: 1.0,   // 100% — hard block
} as const;

export type UsageLevel = "safe" | "warning" | "critical" | "blocked";

export function getUsageLevel(used: number, limit: number | null): UsageLevel {
  if (limit === null) return "safe"; // unlimited
  if (used >= limit) return "blocked";
  const pct = used / limit;
  if (pct >= USAGE_THRESHOLDS.CRITICAL) return "critical";
  if (pct >= USAGE_THRESHOLDS.WARNING) return "warning";
  return "safe";
}

export function getUsagePercentage(used: number, limit: number | null): number {
  if (limit === null) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

// ── Character limits per platform ─────────────────────────────

export const PLATFORM_CHAR_LIMITS: Record<Platform, number> = {
  [Platform.Twitter]:        280,
  [Platform.LinkedIn]:       3000,
  [Platform.Instagram]:      2200,
  [Platform.TikTok]:         2200,
  [Platform.Facebook]:       2000,
  [Platform.Threads]:        500,
  [Platform.Bluesky]:        300,
  [Platform.YouTube]:        5000,
  [Platform.Pinterest]:      500,
  [Platform.GoogleBusiness]: 1500,
};

// ── Platform display metadata ─────────────────────────────────

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  [Platform.Twitter]: {
    platform: Platform.Twitter,
    name: "X (Twitter)",
    color: "#1DA1F2",
    icon: "twitter",
    char_limit: 280,
    supports_video: true,
    supports_stories: false,
    supports_reels: false,
    max_images: 4,
    max_video_size_mb: 512,
  },
  [Platform.LinkedIn]: {
    platform: Platform.LinkedIn,
    name: "LinkedIn",
    color: "#0A66C2",
    icon: "linkedin",
    char_limit: 3000,
    supports_video: true,
    supports_stories: false,
    supports_reels: false,
    max_images: 9,
    max_video_size_mb: 200,
  },
  [Platform.Instagram]: {
    platform: Platform.Instagram,
    name: "Instagram",
    color: "#E1306C",
    icon: "instagram",
    char_limit: 2200,
    supports_video: true,
    supports_stories: true,
    supports_reels: true,
    max_images: 10,
    max_video_size_mb: 650,
  },
  [Platform.TikTok]: {
    platform: Platform.TikTok,
    name: "TikTok",
    color: "#010101",
    icon: "tiktok",
    char_limit: 2200,
    supports_video: true,
    supports_stories: false,
    supports_reels: false,
    max_images: 1,
    max_video_size_mb: 287,
  },
  [Platform.Facebook]: {
    platform: Platform.Facebook,
    name: "Facebook",
    color: "#1877F2",
    icon: "facebook",
    char_limit: 2000,
    supports_video: true,
    supports_stories: true,
    supports_reels: true,
    max_images: 10,
    max_video_size_mb: 4096,
  },
  [Platform.Threads]: {
    platform: Platform.Threads,
    name: "Threads",
    color: "#000000",
    icon: "threads",
    char_limit: 500,
    supports_video: true,
    supports_stories: false,
    supports_reels: false,
    max_images: 10,
    max_video_size_mb: 100,
  },
  [Platform.Bluesky]: {
    platform: Platform.Bluesky,
    name: "Bluesky",
    color: "#0085FF",
    icon: "bluesky",
    char_limit: 300,
    supports_video: false,
    supports_stories: false,
    supports_reels: false,
    max_images: 4,
    max_video_size_mb: 0,
  },
  [Platform.YouTube]: {
    platform: Platform.YouTube,
    name: "YouTube",
    color: "#FF0000",
    icon: "youtube",
    char_limit: 5000,
    supports_video: true,
    supports_stories: false,
    supports_reels: false,
    max_images: 0,
    max_video_size_mb: 256000,
  },
  [Platform.Pinterest]: {
    platform: Platform.Pinterest,
    name: "Pinterest",
    color: "#E60023",
    icon: "pinterest",
    char_limit: 500,
    supports_video: true,
    supports_stories: false,
    supports_reels: false,
    max_images: 1,
    max_video_size_mb: 2048,
  },
  [Platform.GoogleBusiness]: {
    platform: Platform.GoogleBusiness,
    name: "Google Business",
    color: "#4285F4",
    icon: "google",
    char_limit: 1500,
    supports_video: true,
    supports_stories: false,
    supports_reels: false,
    max_images: 1,
    max_video_size_mb: 75,
  },
};

// ── Free plan anti-abuse limits ───────────────────────────────

export const FREE_PLAN_LIMITS = {
  MAX_POSTS_PER_DAY: 10,
  MAX_ACCOUNTS_PER_EMAIL: 1,
  MAX_ACCOUNTS_PER_PHONE: 1,
  REQUIRE_EMAIL_VERIFICATION: true,
  REQUIRE_PHONE_FOR_SCHEDULING: true,
  SHOW_BRANDING: true,
} as const;

// ── Upgrade prompt messages ───────────────────────────────────

export function getUpgradeMessage(
  type: "post_limit" | "channel_limit" | "ai_limit" | "feature_locked",
  used?: number,
  limit?: number | null
): { title: string; description: string; cta: string } {
  switch (type) {
    case "post_limit":
      if (used !== undefined && limit !== undefined && limit !== null && used >= limit) {
        return {
          title: "You've reached your plan's post limit.",
          description:
            "Your next post is ready — just waiting on you. Upgrade now to publish it instantly.",
          cta: "Upgrade for $29/mo",
        };
      }
      return {
        title: `You've used ${used} of your ${limit} posts this month.`,
        description:
          "Upgrade to Individual for 1,000 posts/month + unified inbox.",
        cta: "Upgrade Now",
      };
    case "channel_limit":
      return {
        title: "Channel limit reached.",
        description:
          "You've connected the maximum social channels for your plan. Upgrade for more channels.",
        cta: "Upgrade to Individual",
      };
    case "ai_limit":
      return {
        title: "AI credits used up.",
        description:
          "You've used all your AI generations this month. Upgrade to Individual for 200/month.",
        cta: "Upgrade to Individual",
      };
    case "feature_locked":
      return {
        title: "🔒 This feature requires an upgrade.",
        description: "Unlock this feature and much more by upgrading your plan.",
        cta: "See Plans",
      };
  }
}
