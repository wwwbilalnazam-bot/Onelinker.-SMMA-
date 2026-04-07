import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// POST /api/onboarding/complete
// Marks the user's profile as onboarded using the service client.
// Accepts userId from request body as fallback when session cookies
// aren't available (common right after OAuth signup).

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { userId?: string };

    // Try to get authenticated user from session
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    let userId = session?.user?.id ?? null;

    if (!userId) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      userId = authUser?.id ?? null;
    }

    // Fallback: accept userId from request body (passed from server-rendered onboarding page)
    if (!userId && body.userId) {
      userId = body.userId;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the profile exists before updating (prevents marking arbitrary UUIDs)
    const service = createServiceClient();

    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { error } = await service
      .from("profiles")
      .update({ onboarded: true })
      .eq("id", userId);

    if (error) {
      console.error("[api/onboarding/complete] Update failed:", error);
      return NextResponse.json(
        { error: "Failed to complete onboarding" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/onboarding/complete] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
