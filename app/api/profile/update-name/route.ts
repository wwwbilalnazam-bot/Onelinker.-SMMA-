import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// POST /api/profile/update-name
// Updates user's full name in profile

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { fullName } = body;

    if (!fullName || typeof fullName !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (fullName.trim().length === 0) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    if (fullName.length > 100) {
      return NextResponse.json({ error: "Name must be under 100 characters" }, { status: 400 });
    }

    // Update user profile with new name
    const service = createServiceClient();
    const { error: updateError } = await service
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", userId);

    if (updateError) {
      console.error("[api/profile/update-name] Update error:", updateError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true, fullName: fullName.trim() });
  } catch (err) {
    console.error("[api/profile/update-name] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// GET /api/profile/update-name
// Fetch current user profile

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const service = createServiceClient();

    const { data: profile, error } = await service
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[api/profile/update-name] Fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    return NextResponse.json({
      fullName: profile?.full_name || "",
      email: session.user.email || ""
    });
  } catch (err) {
    console.error("[api/profile/update-name] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
