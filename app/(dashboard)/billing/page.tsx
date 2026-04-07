"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CreditCard, ArrowRight, Check, Building2, Loader2,
  ExternalLink, ChevronRight, Zap, Crown, Shield,
  BarChart3, Users, FileText, Layers, Download,
  Receipt, MapPin, CalendarClock, AlertCircle,
  Plus, XCircle, ArrowDownCircle, ArrowUpCircle, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Plan, BillingInterval } from "@/types";
import {
  PLAN_LIMITS,
  PLAN_PRICES,
  PLAN_META,
  WORKSPACE_ADDON_PRICE,
  POST_ADDON_PRICE,
  CHANNEL_ADDON_PRICE,
  getUsagePercentage,
} from "@/lib/plans/limits";

// ── Types ────────────────────────────────────────────────────

interface Invoice {
  id: string;
  number: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string | null;
  created: number;
  period_start: number;
  period_end: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

interface PaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  funding: string;
}

interface BillingAddress {
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

interface BillingInfo {
  subscription: {
    id: string;
    plan: string;
    status: string;
    billing_interval: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    stripe_customer_id: string | null;
    extra_workspaces: number;
  } | null;
  plan: Plan;
  plan_name: string;
  plan_limits: (typeof PLAN_LIMITS)[Plan];
  plan_prices: (typeof PLAN_PRICES)[Plan];
  user_name: string;
  user_email: string;
  workspaces: { id: string; name: string; slug: string; logo_url: string | null }[];
  workspace_count: number;
  max_workspaces: number | null;
  extra_workspaces: number;
  extra_channels: number;
  max_channels: number | null;
  extra_workspace_price: number;
  usage: {
    total_posts: number;
    total_ai: number;
    posts_limit: number | null;
    ai_limit: number | null;
  };
  invoices: Invoice[];
  payment_method: PaymentMethod | null;
  billing_address: BillingAddress | null;
  upcoming_invoice: {
    amount_due: number;
    currency: string;
    period_start: number;
    period_end: number;
  } | null;
}

// ── Billing Page ─────────────────────────────────────────────

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [addingPayment, setAddingPayment] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(BillingInterval.Monthly);

  // Show checkout result toast
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const paymentMethod = searchParams.get("payment_method");
    if (checkout === "success") {
      toast.success("Subscription activated! Welcome to your new plan.");
    } else if (checkout === "cancelled") {
      toast("Checkout cancelled. No changes were made.");
    }
    if (paymentMethod === "added") {
      toast.success("Payment method added successfully!");
    }
  }, [searchParams]);

  const [error, setError] = useState<string | null>(null);

  const loadBillingInfo = useCallback(async (retry = true) => {
    setError(null);
    try {
      const res = await fetch("/api/billing/info");
      const json = await res.json();
      if (res.ok && json.data) {
        setInfo({
          ...json.data,
          invoices: json.data.invoices ?? [],
          payment_method: json.data.payment_method ?? null,
          billing_address: json.data.billing_address ?? null,
          upcoming_invoice: json.data.upcoming_invoice ?? null,
        });
      } else if (res.status === 401 && retry) {
        // Session may have just been refreshed — retry once
        setTimeout(() => loadBillingInfo(false), 500);
        return; // don't set loading=false yet
      } else {
        setError(json.error || `Server returned ${res.status}`);
      }
    } catch (err) {
      setError("Network error — could not reach server.");
      console.error("[billing] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBillingInfo();
  }, [loadBillingInfo]);

  const handleUpgrade = async (plan: Plan) => {
    setUpgrading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval: billingInterval }),
      });
      const { data, error } = await res.json();
      if (error) {
        toast.error(error);
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const { data, error } = await res.json();
      if (error) {
        toast.error(error);
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Failed to open billing portal");
    }
  };

  const handleAddPaymentMethod = async () => {
    setAddingPayment(true);
    try {
      const res = await fetch("/api/billing/setup-payment", { method: "POST" });
      const { data, error } = await res.json();
      if (error) {
        toast.error(error);
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Failed to start payment setup");
    } finally {
      setAddingPayment(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const { data, error } = await res.json();
      if (error) {
        toast.error(error);
      } else {
        toast.success("Your plan will be cancelled at the end of the billing period.");
        setShowCancelConfirm(false);
        loadBillingInfo();
      }
    } catch {
      toast.error("Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactivate: true }),
      });
      const { data, error } = await res.json();
      if (error) {
        toast.error(error);
      } else {
        toast.success("Subscription reactivated! You'll keep your current plan.");
        loadBillingInfo();
      }
    } catch {
      toast.error("Failed to reactivate subscription");
    } finally {
      setCancelling(false);
    }
  };

  const handleChangePlan = async (plan: Plan) => {
    setChangingPlan(plan);
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval: billingInterval }),
      });
      const { data, error } = await res.json();
      if (error) {
        // If no active subscription, fall back to checkout
        if (res.status === 404) {
          handleUpgrade(plan);
          return;
        }
        toast.error(error);
      } else {
        toast.success(`Plan changed to ${PLAN_META[plan].name}! Changes take effect immediately.`);
        loadBillingInfo();
      }
    } catch {
      toast.error("Failed to change plan");
    } finally {
      setChangingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading billing info…</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <CreditCard className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-muted-foreground">Failed to load billing info.</p>
        {error && (
          <p className="text-xs text-red-500/80 max-w-sm text-center">{error}</p>
        )}
        <Button variant="outline" size="sm" onClick={loadBillingInfo}>Try again</Button>
      </div>
    );
  }

  const currentPlan = info.plan;
  const isPaid = currentPlan !== Plan.Free;
  const isAgency = currentPlan === Plan.Agency;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 sm:space-y-8 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
          <CreditCard className="h-6 w-6 text-primary hidden sm:block" />
          Billing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription, plan, and payment method.
        </p>
      </div>

      {/* ═══ Current Plan Card ═══ */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              currentPlan === Plan.Free ? "bg-muted/80" :
              currentPlan === Plan.Creator ? "bg-blue-500/15" :
              "bg-purple-500/15"
            )}>
              {currentPlan === Plan.Free ? <Zap className="h-5 w-5 text-muted-foreground" /> :
               currentPlan === Plan.Creator ? <Crown className="h-5 w-5 text-blue-500" /> :
               <Shield className="h-5 w-5 text-purple-500" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {info.plan_name} Plan
              </h2>
              <p className="text-xs text-muted-foreground">
                {isPaid && info.subscription?.billing_interval
                  ? `$${info.subscription.billing_interval === "yearly"
                      ? info.plan_prices.yearly_total
                      : info.plan_prices.monthly * 12}/year \u00b7 ${info.subscription.billing_interval} billing`
                  : "Free forever \u2014 no credit card required"}
              </p>
            </div>
          </div>
          {isPaid && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageBilling}
                className="text-xs"
              >
                Manage Billing <ExternalLink className="h-3 w-3 ml-1.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Period info */}
        {isPaid && info.subscription?.current_period_end && (
          <div className={cn(
            "text-xs mb-4 p-3 rounded-lg",
            info.subscription.cancel_at_period_end
              ? "bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400"
              : "bg-muted/20 text-muted-foreground"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {info.subscription.cancel_at_period_end && (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>
                  {info.subscription.cancel_at_period_end
                    ? `Your plan will downgrade to Free on ${new Date(info.subscription.current_period_end).toLocaleDateString()}`
                    : `Next billing date: ${new Date(info.subscription.current_period_end).toLocaleDateString()}`}
                </span>
              </div>
              {info.subscription.cancel_at_period_end && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReactivateSubscription}
                  disabled={cancelling}
                  className="text-xs ml-3 h-7 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                >
                  {cancelling ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="h-3 w-3 mr-1" /> Reactivate
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Cancel subscription button for paid, non-cancelling users */}
        {isPaid && !info.subscription?.cancel_at_period_end && (
          <>
            {!showCancelConfirm ? (
              <div className="mt-4 pt-4 border-t border-border/30">
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-xs text-muted-foreground/60 hover:text-red-500 transition-colors"
                >
                  Cancel subscription
                </button>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-border/30 rounded-lg bg-red-500/5 border border-red-500/20 p-4 -mx-0">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Cancel your {info.plan_name} plan?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your subscription will remain active until the end of your billing period
                      {info.subscription?.current_period_end && (
                        <> on <span className="font-medium">{new Date(info.subscription.current_period_end).toLocaleDateString()}</span></>
                      )}. After that, you'll be downgraded to the Free plan.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="text-xs h-8"
                      >
                        {cancelling ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        Yes, cancel plan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCancelConfirm(false)}
                        className="text-xs h-8"
                      >
                        Keep my plan
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Usage overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <UsageStat
            label="Posts this month"
            used={info.usage.total_posts}
            limit={info.usage.posts_limit}
            icon={FileText}
          />
          <UsageStat
            label="AI generations"
            used={info.usage.total_ai}
            limit={info.usage.ai_limit}
            icon={Zap}
          />
          <UsageStat
            label="Workspaces"
            used={info.workspace_count}
            limit={info.max_workspaces}
            icon={Layers}
          />
          <UsageStat
            label="Channels limit"
            used={null}
            limit={info.max_channels}
            icon={BarChart3}
            displayValue={
              info.max_channels === null
                ? "Unlimited"
                : `${info.max_channels} ${isAgency ? "total" : "per workspace"}${info.extra_channels > 0 ? ` (incl. ${info.extra_channels} add-on)` : ""}`
            }
          />
        </div>
      </div>

      {/* ═══ Workspaces Section ═══ */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Your Workspaces
          </h2>
          <span className="text-xs text-muted-foreground">
            {info.workspace_count} of {info.max_workspaces ?? "\u221e"} used
            {info.extra_workspaces > 0 && ` (incl. ${info.extra_workspaces} add-on)`}
          </span>
        </div>

        <div className="space-y-2">
          {info.workspaces.map((ws) => (
            <div
              key={ws.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              {ws.logo_url ? (
                <img src={ws.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {ws.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{ws.name}</p>
                <p className="text-xs text-muted-foreground">/{ws.slug}</p>
              </div>
              <Link
                href="/settings"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings <ChevronRight className="h-3 w-3 inline" />
              </Link>
            </div>
          ))}
        </div>

        {isAgency && (
          <p className="text-xs text-muted-foreground mt-3">
            Need more workspaces? +${WORKSPACE_ADDON_PRICE}/mo per extra workspace.
            <button onClick={handleManageBilling} className="text-primary ml-1 hover:underline">
              Add workspace
            </button>
          </p>
        )}
      </div>

      {/* ═══ Upgrade / Downgrade Section ═══ */}
      {currentPlan !== Plan.Enterprise && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              {isPaid ? "Change Plan" : "Upgrade Your Plan"}
            </h2>
            {/* Billing interval toggle */}
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-medium", billingInterval === BillingInterval.Monthly ? "text-foreground" : "text-muted-foreground")}>
                Monthly
              </span>
              <button
                onClick={() => setBillingInterval(
                  billingInterval === BillingInterval.Monthly ? BillingInterval.Yearly : BillingInterval.Monthly
                )}
                className={cn(
                  "relative inline-flex h-6 w-10 items-center rounded-full transition-colors",
                  billingInterval === BillingInterval.Yearly ? "bg-primary" : "bg-muted/60"
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  billingInterval === BillingInterval.Yearly ? "translate-x-5" : "translate-x-1"
                )} />
              </button>
              <span className={cn("text-xs font-medium", billingInterval === BillingInterval.Yearly ? "text-foreground" : "text-muted-foreground")}>
                Annual
              </span>
              {billingInterval === BillingInterval.Yearly && (
                <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 rounded-full px-2 py-0.5">
                  Save 2 months
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([Plan.Creator, Plan.Agency] as const).map((plan) => {
              const meta = PLAN_META[plan];
              const prices = PLAN_PRICES[plan];
              const limits = PLAN_LIMITS[plan];
              const isCurrent = currentPlan === plan;
              const isIndividual = plan === Plan.Creator;
              const price = billingInterval === BillingInterval.Yearly
                ? prices.yearly
                : prices.monthly;

              // Determine if this is an upgrade or downgrade
              const planRankMap: Record<Plan, number> = {
                [Plan.Free]: 0,
                [Plan.Creator]: 1,
                [Plan.Agency]: 2,
                [Plan.Enterprise]: 3,
              };
              const isDowngrade = planRankMap[plan] < planRankMap[currentPlan];
              const isUpgrade = planRankMap[plan] > planRankMap[currentPlan];
              const hasExistingSubscription = !!info.subscription?.stripe_subscription_id;

              const features = isIndividual
                ? [
                    "1 user account",
                    "6 social channels",
                    "1,000 posts/month",
                    "Bulk scheduling",
                    "Unified inbox",
                    "Analytics dashboard",
                    "Priority support",
                  ]
                : [
                    "Unlimited users",
                    "5 workspaces included",
                    "50 social channels total",
                    "5,000 posts/month",
                    "AI assistant",
                    "Advanced analytics",
                    "Approval workflows",
                    "Dedicated manager",
                  ];

              const actionLabel = isCurrent
                ? "Current Plan"
                : isDowngrade
                ? `Downgrade to ${meta.name}`
                : hasExistingSubscription
                ? `Upgrade to ${meta.name}`
                : meta.cta;

              return (
                <div
                  key={plan}
                  className={cn(
                    "rounded-xl border p-5 relative transition-all",
                    isCurrent
                      ? "border-primary/40 bg-primary/5"
                      : isIndividual
                      ? "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50"
                      : "border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50"
                  )}
                >
                  {isIndividual && !isCurrent && !isDowngrade && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-blue-500 text-white text-[10px] font-bold px-2.5 py-0.5">
                      POPULAR
                    </span>
                  )}
                  {!isIndividual && !isCurrent && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-purple-600 text-white text-[10px] font-bold px-2.5 py-0.5">
                      BEST VALUE
                    </span>
                  )}

                  <p className={cn(
                    "text-base font-bold mb-0.5",
                    isIndividual ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400"
                  )}>
                    {meta.name}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    ${price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  {billingInterval === BillingInterval.Yearly && (
                    <p className="text-xs text-muted-foreground">
                      ${prices.yearly_total}/year &mdash; save ${prices.yearly_savings}
                    </p>
                  )}

                  <div className="mt-3 space-y-1.5 mb-4">
                    {features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-emerald-500 shrink-0" /> {f}
                      </div>
                    ))}
                  </div>

                  {/* Add-on info */}
                  {isIndividual && (
                    <div className="text-[11px] text-muted-foreground/70 mb-3 space-y-0.5">
                      <p>+${CHANNEL_ADDON_PRICE}/mo per extra channel</p>
                      <p>+${POST_ADDON_PRICE} per 1,000 extra posts</p>
                    </div>
                  )}
                  {!isIndividual && (
                    <div className="text-[11px] text-muted-foreground/70 mb-3 space-y-0.5">
                      <p>+${CHANNEL_ADDON_PRICE}/mo per extra channel</p>
                      <p>+${POST_ADDON_PRICE} per 1,000 extra posts</p>
                      <p>+${WORKSPACE_ADDON_PRICE}/mo per extra workspace</p>
                    </div>
                  )}

                  {isCurrent ? (
                    <Button variant="outline" className="w-full text-sm" disabled>
                      Current Plan
                    </Button>
                  ) : isDowngrade && hasExistingSubscription ? (
                    <Button
                      variant="outline"
                      className="w-full text-sm border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                      onClick={() => handleChangePlan(plan)}
                      disabled={!!changingPlan || !!upgrading}
                    >
                      {changingPlan === plan ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ArrowDownCircle className="h-4 w-4 mr-1.5" /> {actionLabel}
                        </>
                      )}
                    </Button>
                  ) : hasExistingSubscription ? (
                    <Button
                      className={cn(
                        "w-full text-sm text-white",
                        isIndividual ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"
                      )}
                      onClick={() => handleChangePlan(plan)}
                      disabled={!!changingPlan || !!upgrading}
                    >
                      {changingPlan === plan ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ArrowUpCircle className="h-4 w-4 mr-1.5" /> {actionLabel}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className={cn(
                        "w-full text-sm text-white",
                        isIndividual ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"
                      )}
                      onClick={() => handleUpgrade(plan)}
                      disabled={!!upgrading}
                    >
                      {upgrading === plan ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {actionLabel} <ChevronRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Channel Add-on (Creator & Agency plans) ═══ */}
      {(currentPlan === Plan.Creator || currentPlan === Plan.Agency) && isPaid && (
        <ChannelAddonSection
          extraChannels={info.extra_channels}
          baseChannels={PLAN_LIMITS[Plan.Creator].max_channels ?? 6}
          onManageBilling={handleManageBilling}
        />
      )}

      {/* ═══ Payment Method & Billing Details ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Payment Method Card */}
        <div className="rounded-xl border border-border/60 bg-card/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Payment Method
            </h2>
            {isPaid && (
              <button
                onClick={handleManageBilling}
                className="text-xs text-primary hover:underline"
              >
                Update
              </button>
            )}
          </div>
          {info.payment_method ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-14 rounded-md bg-muted/20 border border-border/40 flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground uppercase">
                    {info.payment_method.brand}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    •••• •••• •••• {info.payment_method.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires {String(info.payment_method.exp_month).padStart(2, "0")}/{info.payment_method.exp_year}
                    {info.payment_method.exp_year <= new Date().getFullYear() &&
                     info.payment_method.exp_month <= new Date().getMonth() + 1 && (
                      <span className="text-red-500 ml-1.5 font-medium">Expired</span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={isPaid ? handleManageBilling : handleAddPaymentMethod}
                disabled={addingPayment}
                className="w-full text-xs"
              >
                {addingPayment ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <CreditCard className="h-3 w-3 mr-1.5" />
                )}
                Change Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-border/30">
                <CreditCard className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">No payment method on file</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Add a card to be ready for upgrades and avoid interruptions.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={isPaid ? handleManageBilling : handleAddPaymentMethod}
                disabled={addingPayment}
                className="w-full text-xs"
              >
                {addingPayment ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Plus className="h-3 w-3 mr-1.5" />
                )}
                Add Payment Method
              </Button>
            </div>
          )}
        </div>

        {/* Billing Contact & Address */}
        <div className="rounded-xl border border-border/60 bg-card/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Billing Details
            </h2>
            {isPaid && (
              <button
                onClick={handleManageBilling}
                className="text-xs text-primary hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          <div className="space-y-2.5">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Email</p>
              <p className="text-sm text-foreground">{info.user_email}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Name</p>
              <p className="text-sm text-foreground">{info.user_name}</p>
            </div>
            {info.billing_address ? (
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Address</p>
                <p className="text-sm text-foreground leading-relaxed">
                  {info.billing_address.name && <>{info.billing_address.name}<br /></>}
                  {info.billing_address.line1}
                  {info.billing_address.line2 && <><br />{info.billing_address.line2}</>}
                  {(info.billing_address.city || info.billing_address.state || info.billing_address.postal_code) && (
                    <><br />{[info.billing_address.city, info.billing_address.state, info.billing_address.postal_code].filter(Boolean).join(", ")}</>
                  )}
                  {info.billing_address.country && <><br />{info.billing_address.country}</>}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Address</p>
                <p className="text-xs text-muted-foreground">
                  {isPaid ? (
                    <>No billing address set. <button onClick={handleManageBilling} className="text-primary hover:underline">Add one</button></>
                  ) : "Will be set during checkout."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Next Invoice Estimate ═══ */}
      {info.upcoming_invoice && (
        <div className="rounded-xl border border-border/60 bg-card/60 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarClock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Next Invoice</h2>
                <p className="text-xs text-muted-foreground">
                  Estimated on {new Date(info.upcoming_invoice.period_end * 1000).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(info.upcoming_invoice.amount_due, info.upcoming_invoice.currency)}
            </p>
          </div>
        </div>
      )}

      {/* ═══ Invoice History ═══ */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Invoice History
          </h2>
          {isPaid && info.invoices.length > 0 && (
            <button
              onClick={handleManageBilling}
              className="text-xs text-primary hover:underline"
            >
              View all in Stripe
            </button>
          )}
        </div>
        {info.invoices.length > 0 ? (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs text-muted-foreground">
                  <th className="text-left font-medium pb-2.5 pr-4">Invoice</th>
                  <th className="text-left font-medium pb-2.5 pr-4 hidden sm:table-cell">Date</th>
                  <th className="text-left font-medium pb-2.5 pr-4">Amount</th>
                  <th className="text-left font-medium pb-2.5 pr-4">Status</th>
                  <th className="text-right font-medium pb-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {info.invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/20 last:border-0 hover:bg-muted/5 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="text-foreground font-medium">{inv.number || inv.id.slice(-8).toUpperCase()}</span>
                      <span className="sm:hidden block text-[11px] text-muted-foreground mt-0.5">
                        {new Date(inv.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell">
                      {new Date(inv.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-3 pr-4 font-medium text-foreground tabular-nums">
                      {formatCurrency(inv.amount_paid || inv.amount_due, inv.currency)}
                    </td>
                    <td className="py-3 pr-4">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.hosted_invoice_url && (
                          <a
                            href={inv.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            title="View invoice"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {inv.invoice_pdf && (
                          <a
                            href={inv.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Invoices will appear here after your first payment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amountCents / 100);
}

function InvoiceStatusBadge({ status }: { status: string | null }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    paid: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Paid" },
    open: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "Open" },
    draft: { bg: "bg-muted/30", text: "text-muted-foreground", label: "Draft" },
    void: { bg: "bg-muted/30", text: "text-muted-foreground", label: "Void" },
    uncollectible: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", label: "Failed" },
  };
  const c = config[status ?? ""] ?? { bg: "bg-muted/30", text: "text-muted-foreground", label: status ?? "Unknown" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", c.bg, c.text)}>
      {c.label}
    </span>
  );
}

// ── Usage stat mini-card ─────────────────────────────────────

function UsageStat({
  label,
  used,
  limit,
  icon: Icon,
  displayValue,
}: {
  label: string;
  used: number | null;
  limit: number | null;
  icon: React.ElementType;
  displayValue?: string;
}) {
  const pct = used !== null ? getUsagePercentage(used, limit) : 0;

  return (
    <div className="p-3 rounded-lg bg-muted/10">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground">
        {displayValue ?? (
          used !== null
            ? `${used.toLocaleString()} / ${limit !== null ? limit.toLocaleString() : "\u221e"}`
            : limit !== null ? limit.toLocaleString() : "Unlimited"
        )}
      </p>
      {used !== null && limit !== null && (
        <div className="mt-1.5 h-1 rounded-full bg-muted/30 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500"
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Channel Add-on Section ──────────────────────────────────

function ChannelAddonSection({
  extraChannels,
  baseChannels,
  onManageBilling,
}: {
  extraChannels: number;
  baseChannels: number;
  onManageBilling: () => void;
}) {
  const totalChannels = baseChannels + extraChannels;

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Channel Add-ons
        </h2>
        <span className="text-xs text-muted-foreground">
          {totalChannels} channels total ({baseChannels} included{extraChannels > 0 ? ` + ${extraChannels} add-on` : ""})
        </span>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
          <Plus className="h-5 w-5 text-blue-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Need more channels?
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add extra social channels for ${CHANNEL_ADDON_PRICE}/mo each.
            {extraChannels > 0 && (
              <span className="text-blue-600 dark:text-blue-400 ml-1">
                You currently have {extraChannels} extra channel{extraChannels !== 1 ? "s" : ""} (+${extraChannels * CHANNEL_ADDON_PRICE}/mo).
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onManageBilling}
          className="text-xs shrink-0 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
        >
          <Plus className="h-3 w-3 mr-1" />
          {extraChannels > 0 ? "Manage Channels" : "Add Channels"}
        </Button>
      </div>
    </div>
  );
}
