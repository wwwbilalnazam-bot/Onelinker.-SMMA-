import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// POST /api/billing/cancel
// Cancels the user's subscription at end of billing period (or reactivates if already cancelling).
// Body: { reactivate?: boolean }

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => ({})) as { reactivate?: boolean };

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, plan, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { data: null, error: "No active subscription found" },
        { status: 404 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });

    if (body.reactivate) {
      // Reactivate: undo the scheduled cancellation
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: false,
      });

      await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: false })
        .eq("user_id", user.id);

      return NextResponse.json({ data: { status: "reactivated" } });
    } else {
      // Cancel at end of period (not immediate)
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: true })
        .eq("user_id", user.id);

      return NextResponse.json({ data: { status: "cancelling" } });
    }
  } catch (err) {
    console.error("[api/billing/cancel] Error:", err);
    return NextResponse.json(
      { data: null, error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}
