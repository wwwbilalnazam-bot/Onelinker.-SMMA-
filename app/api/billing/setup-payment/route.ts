import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// POST /api/billing/setup-payment
// Creates a Stripe Checkout session in "setup" mode to collect a payment method
// without charging. Works for both free and paid users.

export async function POST() {
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

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Get or create Stripe customer
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
        metadata: { user_id: user.id },
      });

      stripeCustomerId = customer.id;

      // Store customer ID
      if (subscription) {
        await supabase
          .from("subscriptions")
          .update({ stripe_customer_id: customer.id })
          .eq("user_id", user.id);
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "setup",
      payment_method_types: ["card"],
      success_url: `${appUrl}/billing?payment_method=added`,
      cancel_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ data: { url: session.url } });
  } catch (err) {
    console.error("[api/billing/setup-payment] Error:", err);
    return NextResponse.json(
      { data: null, error: "Failed to create payment setup session" },
      { status: 500 }
    );
  }
}
