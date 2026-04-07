import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

// POST /api/billing/webhook
// Handles Stripe webhook events for account-level billing.

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    console.error("[webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      // ── Checkout completed — activate subscription ──────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        const interval = session.metadata?.interval;

        if (!userId || !plan) break;

        await supabase
          .from("subscriptions")
          .update({
            plan,
            status: "active",
            billing_interval: interval ?? "monthly",
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            current_period_start: new Date().toISOString(),
          })
          .eq("user_id", userId);

        // Sync plan to all workspaces owned by user (backward compat)
        await supabase
          .from("workspaces")
          .update({ plan })
          .eq("owner_id", userId);

        break;
      }

      // ── Subscription updated (plan change, renewal) ─────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const plan = sub.metadata?.plan;

        if (!userId) break;

        const status = sub.status === "active" ? "active"
          : sub.status === "past_due" ? "past_due"
          : sub.status === "trialing" ? "trialing"
          : sub.status === "canceled" ? "cancelled"
          : sub.status;

        const updateData: Record<string, unknown> = {
          status,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        };

        if (plan) {
          updateData.plan = plan;
        }

        await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("user_id", userId);

        // Sync plan to workspaces
        if (plan) {
          await supabase
            .from("workspaces")
            .update({ plan })
            .eq("owner_id", userId);
        }

        break;
      }

      // ── Subscription deleted (cancelled/expired) ────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;

        if (!userId) break;

        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            plan: "free",
            stripe_subscription_id: null,
            cancel_at_period_end: false,
          })
          .eq("user_id", userId);

        // Downgrade all workspaces to free
        await supabase
          .from("workspaces")
          .update({ plan: "free" })
          .eq("owner_id", userId);

        break;
      }

      // ── Invoice payment failed ──────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by stripe customer ID
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (subscription?.user_id) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("user_id", subscription.user_id);
        }

        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Error processing event:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
