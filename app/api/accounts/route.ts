import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/accounts?workspaceId=<uuid>
// Returns social_accounts for a workspace.
// Used by onboarding StepConnectAccount to poll for newly connected accounts.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { data: null, error: "workspaceId is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    // RLS enforces membership — this query returns [] if user is not a member
    const { data: accounts, error } = await supabase
      .from("social_accounts")
      .select(
        "id, platform, username, display_name, profile_picture, " +
        "followers_count, is_active, health_status, connected_at, outstand_account_id"
      )
      .eq("workspace_id", workspaceId)
      .order("connected_at", { ascending: false });

    if (error) {
      console.error("[api/accounts] Query error:", error);
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: accounts ?? [] });
  } catch (err) {
    console.error("[api/accounts] Unexpected error:", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
