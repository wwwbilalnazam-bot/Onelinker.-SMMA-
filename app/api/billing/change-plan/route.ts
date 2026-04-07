import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { Plan, BillingInterval } from "@/types";
import { PLAN_PRICES } from "@/lib/plans/limits";

// POST /api/billing/change-plan
// Body: { plan: Plan, interval: BillingInterval }
// Changes the user's subscription to a different plan (upgrade or downgrade).
// For downgrades to Free, use /api/billing/cancel instead.

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return NextResponse.json(
      { data: null, error: "Billing is not configured" },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as { plan?: string; interval?: string };
    const { plan, interval } = body;

    if (!plan || !interval) {
      return NextResponse.json(
        { data: null, error: "Missing required fields: plan, interval" },
        { status: 400 }
      );
    }

    if (!Object.values(Plan).includes(plan as Plan) || plan === Plan.Free) {
      return NextResponse.json(
        { data: null, error: "Invalid plan. Use cancel endpoint to downgrade to Free." },
        { status: 400 }
      );
    }

    if (!Object.values(BillingInterval).includes(interval as BillingInterval)) {
      return NextResponse.json(
        { data: null, error: "Invalid interval." },
        { status: 400 }
      );
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { data: null, error: "No active subscription found. Use checkout to subscribe." },
        { status: 404 }
      );
    }

    // Get the new price ID
    const planPrices = PLAN_PRICES[plan as Plan];
    const newPriceId = interval === BillingInterval.Yearly
      ? planPrices.stripe_price_id_yearly
      : planPrices.stripe_price_id_monthly;

    if (!newPriceId) {
      return NextResponse.json(
        { data: null, error: "Pricing not configured for this plan/interval" },
        { status: 503 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });

    // Get current subscription to find the item to replace
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    const currentItem = stripeSubscription.items.data[0];
    if (!currentItem) {
      return NextResponse.json(
        { data: null, error: "No subscription items found" },
        { status: 500 }
      );
    }

    // Update the subscription with the new price
    // proration_behavior: "create_prorations" gives credit for unused time
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [{ id: currentItem.id, price: newPriceId }],
      proration_behavior: "create_prorations",
      cancel_at_period_end: false, // reactivate if was cancelling
      metadata: { user_id: user.id, plan },
    });

    // Update local DB
    await supabase
      .from("subscriptions")
      .update({
        plan,
        billing_interval: interval,
        cancel_at_period_end: false,
      })
      .eq("user_id", user.id);

    // Sync plan to all owned workspaces
    await supabase
      .from("workspaces")
      .update({ plan })
      .eq("owner_id", user.id);

    return NextResponse.json({
      data: { status: "changed", new_plan: plan, new_interval: interval },
    });
  } catch (err) {
    console.error("[api/billing/change-plan] Error:", err);
    return NextResponse.json(
      { data: null, error: "Failed to change plan" },
      { status: 500 }
    );
  }
}
