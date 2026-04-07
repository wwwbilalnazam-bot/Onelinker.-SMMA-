import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { Plan, BillingInterval } from "@/types";
import { PLAN_PRICES } from "@/lib/plans/limits";

// POST /api/billing/checkout
// Body: { plan: Plan, interval: BillingInterval }
// Creates a Stripe Checkout session for the authenticated user (account-level).

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    console.error("[api/billing/checkout] STRIPE_SECRET_KEY not configured");
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

    const body = await request.json() as {
      plan?: string;
      interval?: string;
    };

    const { plan, interval } = body;

    if (!plan || !interval) {
      return NextResponse.json(
        { data: null, error: "Missing required fields: plan, interval" },
        { status: 400 }
      );
    }

    // Validate plan & interval
    if (!Object.values(Plan).includes(plan as Plan) || plan === Plan.Free) {
      return NextResponse.json(
        { data: null, error: "Invalid plan. Must be creator, agency, or enterprise." },
        { status: 400 }
      );
    }

    if (!Object.values(BillingInterval).includes(interval as BillingInterval)) {
      return NextResponse.json(
        { data: null, error: "Invalid interval. Must be monthly or yearly." },
        { status: 400 }
      );
    }

    // Get the Stripe Price ID
    const planPrices = PLAN_PRICES[plan as Plan];
    const priceId = interval === BillingInterval.Yearly
      ? planPrices.stripe_price_id_yearly
      : planPrices.stripe_price_id_monthly;

    if (!priceId) {
      return NextResponse.json(
        { data: null, error: "Pricing not configured for this plan/interval" },
        { status: 503 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });

    // Get or create Stripe customer per USER (account-level)
    let stripeCustomerId: string | undefined;

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscription?.stripe_customer_id) {
      stripeCustomerId = subscription.stripe_customer_id;
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? undefined,
        metadata: {
          user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Store customer ID on subscription
      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customer.id })
        .eq("user_id", user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?checkout=success`,
      cancel_url:  `${appUrl}/billing?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        plan,
        interval,
      },
      subscription_data: {
        metadata: { user_id: user.id, plan },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ data: { url: session.url } });
  } catch (err) {
    console.error("[api/billing/checkout] Error:", err);
    return NextResponse.json(
      { data: null, error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
