"use client";

import { useState } from "react";
import { Check, Zap, X, Loader2, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plan, BillingInterval } from "@/types";
import { PLAN_LIMITS, PLAN_PRICES, PLAN_META } from "@/lib/plans/limits";
import { useWorkspace } from "@/hooks/useWorkspace";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════
// UPGRADE MODAL
// Shown when a user hits a plan limit or tries to access
// a locked feature. Compares current vs upgrade plan and
// has a direct "Upgrade Now" CTA to Stripe Checkout.
// ════════════════════════════════════════════════════════════

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: "post_limit" | "channel_limit" | "ai_limit" | "feature_locked";
  currentUsage?: number;
  limit?: number | null;
}

const UPGRADE_TARGET: Record<UpgradeModalProps["trigger"], Plan> = {
  post_limit: Plan.Creator,
  channel_limit: Plan.Creator,
  ai_limit: Plan.Creator,
  feature_locked: Plan.Agency,
};

const TRIGGER_HIGHLIGHTS: Record<
  UpgradeModalProps["trigger"],
  { icon: string; title: string; subtitle: string }
> = {
  post_limit: {
    icon: "🚫",
    title: "You've reached your post limit",
    subtitle: "Your next post is ready — upgrade to publish it instantly.",
  },
  channel_limit: {
    icon: "📱",
    title: "Channel limit reached",
    subtitle: "Connect unlimited social profiles on Creator or higher.",
  },
  ai_limit: {
    icon: "🤖",
    title: "AI credits used up",
    subtitle: "Get 200 AI generations/month on Creator.",
  },
  feature_locked: {
    icon: "🔒",
    title: "Feature not available on your plan",
    subtitle: "Upgrade to unlock this and many more features.",
  },
};

const CREATOR_HIGHLIGHTS = [
  "6 social channels (+$3/mo extra)",
  "1,000 posts / month",
  "200 AI generations / month",
  "Full analytics (90 days)",
  "Unified inbox",
  "Priority support",
  "No Onelinker branding",
];

const AGENCY_HIGHLIGHTS = [
  "Everything in Creator",
  "50 social channels (+$3/mo extra)",
  "5,000 posts / month",
  "Unlimited AI generations",
  "5 workspaces + unlimited users",
  "Approval workflows",
  "White label reports",
];

export function UpgradeModal({
  isOpen,
  onClose,
  trigger,
  currentUsage,
  limit,
}: UpgradeModalProps) {
  const { workspace } = useWorkspace();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(
    BillingInterval.Yearly
  );
  const [selectedPlan, setSelectedPlan] = useState<Plan>(UPGRADE_TARGET[trigger]);
  const [isLoading, setIsLoading] = useState(false);

  const triggerInfo = TRIGGER_HIGHLIGHTS[trigger];
  const currentPlan = (workspace?.plan as Plan) ?? Plan.Free;

  async function handleUpgrade() {
    if (!workspace) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          interval: billingInterval,
          workspace_id: workspace.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to create checkout session");

      const { data } = await res.json() as { data: { url: string } };
      window.location.href = data.url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
      setIsLoading(false);
    }
  }

  const creatorPrice = billingInterval === BillingInterval.Yearly
    ? PLAN_PRICES[Plan.Creator].yearly
    : PLAN_PRICES[Plan.Creator].monthly;

  const agencyPrice = billingInterval === BillingInterval.Yearly
    ? PLAN_PRICES[Plan.Agency].yearly
    : PLAN_PRICES[Plan.Agency].monthly;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl mb-2">{triggerInfo.icon}</div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {triggerInfo.title}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {triggerInfo.subtitle}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors mt-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          {/* Usage indicator */}
          {currentUsage !== undefined && limit !== null && limit !== undefined && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{ width: "100%" }}
                />
              </div>
              <span className="text-red-400 font-medium text-xs shrink-0">
                {currentUsage} / {limit} used
              </span>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 my-4">
            <span
              className={cn(
                "text-sm cursor-pointer",
                billingInterval === BillingInterval.Monthly
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
              onClick={() => setBillingInterval(BillingInterval.Monthly)}
            >
              Monthly
            </span>
            <button
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                billingInterval === BillingInterval.Yearly ? "bg-primary" : "bg-muted"
              )}
              onClick={() =>
                setBillingInterval(
                  billingInterval === BillingInterval.Yearly
                    ? BillingInterval.Monthly
                    : BillingInterval.Yearly
                )
              }
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                  billingInterval === BillingInterval.Yearly ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
            <span
              className={cn(
                "text-sm cursor-pointer",
                billingInterval === BillingInterval.Yearly
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
              onClick={() => setBillingInterval(BillingInterval.Yearly)}
            >
              Yearly
              <span className="ml-1.5 text-xs font-semibold text-emerald-400 bg-emerald-400/15 px-1.5 py-0.5 rounded-full">
                2 months free
              </span>
            </span>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Creator plan */}
            <button
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                selectedPlan === Plan.Creator
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                  : "border-border bg-muted/30 hover:border-border/80"
              )}
              onClick={() => setSelectedPlan(Plan.Creator)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground">Creator</span>
                {selectedPlan === Plan.Creator && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="mb-3">
                <span className="text-2xl font-bold text-foreground">${creatorPrice}</span>
                <span className="text-muted-foreground text-sm">/mo</span>
                {billingInterval === BillingInterval.Yearly && (
                  <div className="text-xs text-emerald-400 mt-0.5">
                    Save $48/year
                  </div>
                )}
              </div>
              <ul className="space-y-1.5">
                {CREATOR_HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </button>

            {/* Agency plan */}
            <button
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                selectedPlan === Plan.Agency
                  ? "border-amber-400 bg-amber-400/10 ring-2 ring-amber-400/30"
                  : "border-border bg-muted/30 hover:border-border/80"
              )}
              onClick={() => setSelectedPlan(Plan.Agency)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground">Agency</span>
                {selectedPlan === Plan.Agency && (
                  <Check className="h-4 w-4 text-amber-400" />
                )}
              </div>
              <div className="mb-3">
                <span className="text-2xl font-bold text-foreground">${agencyPrice}</span>
                <span className="text-muted-foreground text-sm">/mo</span>
                {billingInterval === BillingInterval.Yearly && (
                  <div className="text-xs text-emerald-400 mt-0.5">
                    Save $120/year
                  </div>
                )}
              </div>
              <ul className="space-y-1.5">
                {AGENCY_HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-amber-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </button>
          </div>

          {/* CTA */}
          <div className="mt-4 space-y-2">
            <Button
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold gap-2"
              onClick={handleUpgrade}
              disabled={isLoading || currentPlan === selectedPlan}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isLoading
                ? "Redirecting to checkout..."
                : `Upgrade to ${PLAN_META[selectedPlan].name} — $${selectedPlan === Plan.Creator ? creatorPrice : agencyPrice}/mo`}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              No long-term contract · Cancel anytime · Instant access
            </p>
          </div>

          {/* Annual savings nudge */}
          {billingInterval === BillingInterval.Monthly && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
              <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-400">
                <strong>Switch to annual</strong> and save{" "}
                {selectedPlan === Plan.Creator ? "$48" : "$120"}/year — that&apos;s 2 months free.
              </p>
              <button
                className="text-xs text-emerald-400 underline shrink-0"
                onClick={() => setBillingInterval(BillingInterval.Yearly)}
              >
                Switch
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
