import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProviderForPlatform } from "@/lib/providers";

// POST /api/accounts/connect
// Body: { platform: string, workspaceId: string, redirect_uri: string }
// Initiates OAuth for a social platform via the direct provider.
// Returns { data: { oauth_url: string } }

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ data: null, error: "Unauthorized", message: "Authentication required" }, { status: 401 });
    }

    const body = await request.json() as {
      platform?: string;
      workspaceId?: string;
      redirect_uri?: string;
    };

    const { platform, workspaceId, redirect_uri } = body;

    if (!platform || !workspaceId || !redirect_uri) {
      return NextResponse.json(
        { data: null, error: "Missing required fields: platform, workspaceId, redirect_uri", message: "Bad request" },
        { status: 400 }
      );
    }

    // Verify workspace membership (owner or manager can connect accounts)
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!member || !["owner", "manager"].includes(member.role)) {
      return NextResponse.json(
        { data: null, error: "Forbidden", message: "You must be a workspace owner or manager to connect accounts" },
        { status: 403 }
      );
    }

    // Resolve the provider for this platform and start OAuth
    const provider = getProviderForPlatform(platform);

    const result = await provider.startOAuth({
      platform,
      redirectUri: redirect_uri,
      workspaceId,
    });

    return NextResponse.json({ data: { oauth_url: result.oauthUrl } });
  } catch (err) {
    console.error("[api/accounts/connect] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to initiate connection";
    const status = (err as { status?: number })?.status;
    return NextResponse.json(
      { data: null, error: message, message },
      { status: status && status >= 400 && status < 600 ? status : 500 }
    );
  }
}
