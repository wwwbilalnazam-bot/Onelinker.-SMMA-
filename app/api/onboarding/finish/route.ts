import { NextRequest, NextResponse } from "next/server";

// POST /api/onboarding/finish
// SIMPLIFIED endpoint that ONLY marks user as onboarded.
// Uses Supabase service role to directly update the profiles table.
// No session checks, no RLS, no fallbacks — just raw update.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { userId?: string };
    const userId = body.userId;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[finish] Missing Supabase credentials");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Direct HTTP call to Supabase REST API using service role key
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ onboarded: true }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[finish] Supabase update failed:", res.status, errorText);
      return NextResponse.json(
        { error: "Failed to update profile", details: errorText },
        { status: res.status }
      );
    }

    // Verify the update by reading it back
    const verifyRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=id,onboarded`, {
      method: "GET",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
    });

    if (!verifyRes.ok) {
      console.error("[finish] Verification failed:", verifyRes.status);
      return NextResponse.json({ success: true }); // Still return success even if verify fails
    }

    const profiles = await verifyRes.json() as Array<{ id: string; onboarded: boolean }>;
    const updated = profiles[0];

    if (!updated?.onboarded) {
      console.error("[finish] Verification shows onboarded still false after update");
      return NextResponse.json({ success: false, error: "Update verification failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[finish] Exception:", err);
    return NextResponse.json(
      { error: "Internal error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
