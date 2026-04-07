import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllProviders } from "@/lib/providers";

// POST /api/accounts/sync
// Syncs connected accounts from all active providers into Supabase.
// Called after OAuth popup closes and on page load.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as { workspaceId?: string };
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Sync all registered providers
    let totalSynced = 0;
    let totalErrors = 0;

    for (const provider of getAllProviders()) {
      try {
        const result = await provider.syncAccounts({ workspaceId });
        totalSynced += result.synced;
        totalErrors += result.errors;
      } catch {
        // Individual provider sync failures are non-fatal
        totalErrors++;
      }
    }

    return NextResponse.json({ data: { synced: totalSynced, errors: totalErrors } });
  } catch (err) {
    console.error("[api/accounts/sync] Error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
