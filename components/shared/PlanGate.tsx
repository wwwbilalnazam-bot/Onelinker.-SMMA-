"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plan, type PlanFeatureName } from "@/types";
import { planHasFeature, PLAN_META, FEATURE_PLANS } from "@/lib/plans/limits";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════
// PLAN GATE
// Wraps any UI element. If the feature is locked on the
// current plan, shows a blur overlay + upgrade prompt
// instead of the component.
//
// Usage:
//   <PlanGate feature="inbox">
//     <InboxComponent />
//   </PlanGate>
// ════════════════════════════════════════════════════════════

interface PlanGateProps {
  feature: PlanFeatureName;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  /** If true, renders nothing instead of the locked overlay */
  hideWhenLocked?: boolean;
}

export function PlanGate({
  feature,
  children,
  fallback,
  className,
  hideWhenLocked = false,
}: PlanGateProps) {
  const { workspace } = useWorkspace();
  const router = useRouter();

  const currentPlan = (workspace?.plan as Plan) ?? Plan.Free;
  const hasAccess = planHasFeature(currentPlan, feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideWhenLocked) return null;

  if (fallback) return <>{fallback}</>;

  const requiredPlan = FEATURE_PLANS[feature];
  const planMeta = PLAN_META[requiredPlan];

  return (
    <div className={cn("relative", className)}>
      {/* Blurred preview of the locked content */}
      <div
        className="pointer-events-none select-none"
        aria-hidden="true"
        style={{ filter: "blur(4px)", opacity: 0.4 }}
      >
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm border border-border/50">
        <div className="flex flex-col items-center gap-3 p-6 text-center max-w-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>

          <div>
            <p className="font-semibold text-foreground text-sm">
              {planMeta.name} Plan Required
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Unlock this feature by upgrading to the{" "}
              <span className="text-primary font-medium">{planMeta.name}</span> plan.
            </p>
          </div>

          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white w-full"
            onClick={() => router.push("/billing")}
          >
            Upgrade to {planMeta.name}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Inline variant (for inline elements like buttons) ─────────

interface PlanGateInlineProps {
  feature: PlanFeatureName;
  children: React.ReactNode;
  /** Renders a disabled version of the child with a tooltip */
  showDisabled?: boolean;
}

export function PlanGateInline({ feature, children, showDisabled = true }: PlanGateInlineProps) {
  const { workspace } = useWorkspace();
  const router = useRouter();

  const currentPlan = (workspace?.plan as Plan) ?? Plan.Free;
  const hasAccess = planHasFeature(currentPlan, feature);

  if (hasAccess) return <>{children}</>;

  if (!showDisabled) return null;

  const requiredPlan = FEATURE_PLANS[feature];

  return (
    <span
      className="relative inline-flex cursor-not-allowed"
      title={`Requires ${PLAN_META[requiredPlan].name} plan`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push("/billing");
      }}
    >
      <span className="pointer-events-none opacity-40">{children}</span>
      <Lock className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground" />
    </span>
  );
}
