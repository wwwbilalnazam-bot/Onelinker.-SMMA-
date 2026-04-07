import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { Plan } from "@/types";
import { PLAN_LIMITS, PLAN_PRICES, PLAN_META, WORKSPACE_ADDON_PRICE, CHANNEL_ADDON_PRICE } from "@/lib/plans/limits";

// GET /api/billing/info
// Returns the authenticated user's account-level billing info.
// Works with both old (workspace_id) and new (user_id) schema.

export async function GET() {
  try {
    const supabase = await createClient();

    // Use getSession (local JWT) first, fall back to getUser (network call).
    // The middleware already validates auth, so getSession is safe here.
    const { data: { session } } = await supabase.auth.getSession();
    let user = session?.user ?? null;

    if (!user) {
      // Fallback: try getUser (server validation)
      const { data: { user: verifiedUser } } = await supabase.auth.getUser();
      user = verifiedUser;
    }

    if (!user) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const month = new Date().toISOString().slice(0, 7);

    // Fetch workspaces and profile in parallel (these are reliable)
    const [workspacesResult, profileResult] = await Promise.all([
      supabase
        .from("workspaces")
        .select("id, name, slug, logo_url, plan, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single(),
    ]);

    if (workspacesResult.error) {
      console.error("[api/billing/info] Workspaces query failed:", workspacesResult.error);
    }

    const workspaces = workspacesResult.data ?? [];

    // Fetch usage separately (table may not exist in all setups)
    let usageData: { post_count: number; ai_count: number; workspace_id: string }[] = [];
    try {
      const usageResult = await supabase
        .from("post_usage")
        .select("post_count, ai_count, workspace_id")
        .eq("month", month);
      usageData = usageResult.data ?? [];
    } catch {
      console.warn("[api/billing/info] post_usage query failed — skipping");
    }

    // Try to find subscription — first by user_id (new schema), fallback to workspace_id (old schema)
    let subscription: Record<string, unknown> | null = null;

    try {
      // Try user_id-based lookup first
      const { data: userSub, error: userSubError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!userSubError && userSub) {
        subscription = userSub;
      } else if (workspaces.length > 0) {
        // Fallback: look up by workspace_id (pre-migration)
        const wsIds = workspaces.map((w) => w.id);
        const { data: wsSub } = await supabase
          .from("subscriptions")
          .select("*")
          .in("workspace_id", wsIds)
          .in("status", ["active", "trialing", "past_due"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (wsSub) subscription = wsSub;
      }
    } catch {
      console.warn("[api/billing/info] subscriptions query failed — using defaults");
    }

    // Determine plan: subscription > workspace > free
    const plan = (subscription?.plan as Plan)
      ?? (workspaces[0]?.plan as Plan)
      ?? Plan.Free;

    const limits = PLAN_LIMITS[plan];
    const prices = PLAN_PRICES[plan];
    const meta = PLAN_META[plan];

    // Aggregate usage across all owned workspaces
    const ownerWsIds = new Set(workspaces.map((w) => w.id));
    const relevantUsage = usageData.filter((u) =>
      ownerWsIds.has(u.workspace_id)
    );
    const totalPosts = relevantUsage.reduce((sum, u) => sum + (u.post_count ?? 0), 0);
    const totalAi = relevantUsage.reduce((sum, u) => sum + (u.ai_count ?? 0), 0);

    const extraWorkspaces = (subscription?.extra_workspaces as number) ?? 0;
    const extraChannels = (subscription?.extra_channels as number) ?? 0;
    const maxWorkspaces = limits.max_workspaces !== null
      ? limits.max_workspaces + extraWorkspaces
      : null;
    const maxChannels = limits.max_channels !== null
      ? limits.max_channels + extraChannels
      : limits.max_channels;

    // Fetch invoices and payment method from Stripe if customer exists
    let invoices: {
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
    }[] = [];
    let payment_method: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
      funding: string;
    } | null = null;
    let billing_address: {
      name: string | null;
      line1: string | null;
      line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null = null;
    let upcoming_invoice: {
      amount_due: number;
      currency: string;
      period_start: number;
      period_end: number;
    } | null = null;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripeCustomerId = subscription?.stripe_customer_id as string | null;

    if (stripeSecretKey && stripeCustomerId) {
      try {
        const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });

        // Fetch invoices, customer (for payment method + address), and upcoming invoice in parallel
        const [invoicesResult, customerResult, upcomingResult] = await Promise.allSettled([
          stripe.invoices.list({
            customer: stripeCustomerId,
            limit: 12,
            expand: ["data.subscription"],
          }),
          stripe.customers.retrieve(stripeCustomerId, {
            expand: ["default_source", "invoice_settings.default_payment_method"],
          }),
          stripe.invoices.retrieveUpcoming({
            customer: stripeCustomerId,
          }),
        ]);

        // Parse invoices
        if (invoicesResult.status === "fulfilled") {
          invoices = invoicesResult.value.data.map((inv) => ({
            id: inv.id,
            number: inv.number,
            amount_due: inv.amount_due,
            amount_paid: inv.amount_paid,
            currency: inv.currency,
            status: inv.status,
            created: inv.created,
            period_start: inv.period_start,
            period_end: inv.period_end,
            hosted_invoice_url: inv.hosted_invoice_url,
            invoice_pdf: inv.invoice_pdf,
          }));
        }

        // Parse payment method & billing address from customer
        if (customerResult.status === "fulfilled" && !("deleted" in customerResult.value)) {
          const customer = customerResult.value;
          const pm = customer.invoice_settings?.default_payment_method;
          if (pm && typeof pm === "object" && "card" in pm && pm.card) {
            payment_method = {
              brand: pm.card.brand ?? "unknown",
              last4: pm.card.last4 ?? "****",
              exp_month: pm.card.exp_month ?? 0,
              exp_year: pm.card.exp_year ?? 0,
              funding: pm.card.funding ?? "unknown",
            };
          }
          if (customer.address) {
            billing_address = {
              name: customer.name,
              line1: customer.address.line1,
              line2: customer.address.line2,
              city: customer.address.city,
              state: customer.address.state,
              postal_code: customer.address.postal_code,
              country: customer.address.country,
            };
          }
        }

        // Parse upcoming invoice
        if (upcomingResult.status === "fulfilled") {
          const upc = upcomingResult.value;
          upcoming_invoice = {
            amount_due: upc.amount_due,
            currency: upc.currency,
            period_start: upc.period_start,
            period_end: upc.period_end,
          };
        }
      } catch (stripeErr) {
        console.warn("[api/billing/info] Stripe data fetch warning:", stripeErr);
        // Non-fatal — we still return core billing info
      }
    }

    return NextResponse.json({
      data: {
        subscription,
        plan,
        plan_name: meta.name,
        plan_limits: limits,
        plan_prices: prices,
        user_name: profileResult.data?.full_name ?? user.email,
        user_email: user.email,
        workspaces,
        workspace_count: workspaces.length,
        max_workspaces: maxWorkspaces,
        extra_workspaces: extraWorkspaces,
        extra_channels: extraChannels,
        max_channels: maxChannels,
        extra_workspace_price: WORKSPACE_ADDON_PRICE,
        usage: {
          total_posts: totalPosts,
          total_ai: totalAi,
          posts_limit: limits.max_posts_per_month,
          ai_limit: limits.max_ai_generations,
        },
        invoices,
        payment_method,
        billing_address,
        upcoming_invoice,
      },
    });
  } catch (err) {
    console.error("[api/billing/info] Error:", err);
    return NextResponse.json(
      { data: null, error: "Failed to load billing info" },
      { status: 500 }
    );
  }
}
