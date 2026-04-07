import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// POST /api/billing/portal
// Creates a Stripe Customer Portal session for the authenticated user.

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

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { data: null, error: "No billing account found. Please upgrade first." },
        { status: 404 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ data: { url: session.url } });
  } catch (err) {
    console.error("[api/billing/portal] Error:", err);
    return NextResponse.json(
      { data: null, error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
