"use client";

import { AlertTriangle, Zap, XCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUsageLevel, getUsagePercentage, type UsageLevel } from "@/lib/plans/limits";
import { Plan } from "@/types";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRouter } from "next/navigation";

// ════════════════════════════════════════════════════════════
// USAGE WARNING
// Shows warning bars at 75%, 90%, and 100% usage.
// Renders nothing when usage is below warning threshold.
// ════════════════════════════════════════════════════════════

interface UsageWarningProps {
  used: number;
  limit: number | null;
  label?: string;
  /** Type of resource (for upgrade copy) */
  type?: "posts" | "ai" | "channels" | "storage";
  className?: string;
  /** Show full banner (dashboard) vs compact bar */
  variant?: "banner" | "compact";
}

const LEVEL_CONFIG: Record<
  Exclude<UsageLevel, "safe">,
  {
    icon: React.ElementType;
    bg: string;
    border: string;
    text: string;
    bar: string;
    label: string;
  }
> = {
  warning: {
    icon: Zap,
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    bar: "bg-amber-400",
    label: "Approaching limit",
  },
  critical: {
    icon: AlertTriangle,
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
    bar: "bg-orange-400",
    label: "Almost at limit",
  },
  blocked: {
    icon: XCircle,
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    bar: "bg-red-500",
    label: "Limit reached",
  },
};

export function UsageWarning({
  used,
  limit,
  label = "posts",
  type = "posts",
  className,
  variant = "banner",
}: UsageWarningProps) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const level = getUsageLevel(used, limit);
  const pct = getUsagePercentage(used, limit);

  // Render nothing if safe
  if (level === "safe") return null;

  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;
  const plan = (workspace?.plan as Plan) ?? Plan.Free;

  const upgradeMessages: Record<typeof type, string> = {
    posts: `⚡ You've used ${used} of your ${limit} free posts this month. Upgrade to Creator for 1,000 posts/month + AI.`,
    ai: `🤖 You've used ${used} of ${limit} AI generations. Upgrade for more.`,
    channels: `📱 ${used} of ${limit} social channels connected.`,
    storage: `💾 ${pct}% of storage used. Upgrade for more space.`,
  };

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Icon className={cn("h-3.5 w-3.5 shrink-0", config.text)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={cn("font-medium truncate", config.text)}>{config.label}</span>
            <span className="text-muted-foreground shrink-0 ml-2">
              {limit !== null ? `${used} / ${limit}` : used}
            </span>
          </div>
          <div className="usage-bar-track">
            <div
              className={cn("usage-bar-fill", config.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        config.bg,
        config.border,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 shrink-0", config.text)}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className={cn("text-sm font-medium", config.text)}>
              {level === "blocked"
                ? `🚫 You've reached your ${label} limit`
                : upgradeMessages[type]}
            </p>
            <span className={cn("text-xs font-semibold shrink-0", config.text)}>
              {pct}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="usage-bar-track mb-3">
            <div
              className={cn("usage-bar-fill transition-all duration-500", config.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {limit !== null
                ? `${used} of ${limit} ${label} used this month`
                : `${used} ${label} used`}
            </p>

            {plan !== Plan.Enterprise && (
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-7 text-xs shrink-0 border-current",
                  config.text,
                  "hover:bg-current/10"
                )}
                onClick={() => router.push("/billing")}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard usage bar (always visible) ─────────────────────

interface UsageBarProps {
  used: number;
  limit: number | null;
  label: string;
  size?: "sm" | "md";
  showNumbers?: boolean;
  className?: string;
}

export function UsageBar({
  used,
  limit,
  label,
  size = "md",
  showNumbers = true,
  className,
}: UsageBarProps) {
  const level = getUsageLevel(used, limit);
  const pct = getUsagePercentage(used, limit);

  const barColor =
    level === "blocked"
      ? "bg-red-500"
      : level === "critical"
      ? "bg-orange-400"
      : level === "warning"
      ? "bg-amber-400"
      : "bg-blue-500";

  return (
    <div className={cn("space-y-1", className)}>
      {showNumbers && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xs font-medium text-foreground">
            {limit !== null ? `${used.toLocaleString()} / ${limit.toLocaleString()}` : `${used.toLocaleString()}`}
          </span>
        </div>
      )}
      <div className={cn("usage-bar-track", size === "sm" ? "h-1" : "h-1.5")}>
        <div
          className={cn("usage-bar-fill transition-all duration-700", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
