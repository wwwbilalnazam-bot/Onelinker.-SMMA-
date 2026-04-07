import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// POST /api/onboarding/complete/simple
// Standalone endpoint that marks user as onboarded.
// Uses ONLY service client (bypasses all RLS/auth issues).
// The userId comes from the authenticated session via middleware,
// but we also accept it from the request body as a fallback.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { userId?: string };
    const userId = body.userId;

    console.log("[onboarding/complete/simple] Marking user as onboarded:", userId);

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const service = createServiceClient();

    // Step 1: Verify profile exists
    const { data: profile, error: selectError } = await service
      .from("profiles")
      .select("id, onboarded")
      .eq("id", userId)
      .single();

    if (selectError || !profile) {
      console.error("[onboarding/complete/simple] Profile not found:", userId);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Step 2: If already onboarded, just return success
    if (profile.onboarded) {
      console.log("[onboarding/complete/simple] Already onboarded:", userId);
      return NextResponse.json({ success: true, already_onboarded: true });
    }

    // Step 3: Update profile.onboarded = true
    const { error: updateError, data: updated } = await service
      .from("profiles")
      .update({ onboarded: true })
      .eq("id", userId)
      .select("id, onboarded")
      .single();

    if (updateError) {
      console.error("[onboarding/complete/simple] Update failed:", updateError);
      return NextResponse.json(
        { error: "Failed to mark as onboarded", details: updateError.message },
        { status: 500 }
      );
    }

    console.log("[onboarding/complete/simple] Success! Updated profile:", updated);

    // Step 4: Verify the update actually stuck
    const { data: verify } = await service
      .from("profiles")
      .select("onboarded")
      .eq("id", userId)
      .single();

    if (!verify?.onboarded) {
      console.error("[onboarding/complete/simple] Verification failed - onboarded still false after update");
      return NextResponse.json(
        { error: "Update verification failed" },
        { status: 500 }
      );
    }

    console.log("[onboarding/complete/simple] Verification passed - onboarded is TRUE");
    return NextResponse.json({ success: true, verified: true });
  } catch (err) {
    console.error("[onboarding/complete/simple] Exception:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
