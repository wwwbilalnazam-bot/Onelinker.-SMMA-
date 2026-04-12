import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { validateIGStoryEligibility } from "@/lib/meta/stories/instagram";
import { getMetaAccessToken } from "@/lib/meta/accounts";

/**
 * GET /api/meta/validate-story
 * Pre-flight check: Can this account post stories?
 * Query params: accountId, workspaceId
 * Returns: { eligible: boolean }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const workspaceId = searchParams.get("workspaceId");

    if (!accountId || !workspaceId) {
      return NextResponse.json(
        { error: "Missing accountId or workspaceId" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Fetch account details
    const { data: account, error: accountError } = await serviceClient
      .from("social_accounts")
      .select("platform, outstand_account_id")
      .eq("id", accountId)
      .eq("workspace_id", workspaceId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Facebook: Always eligible
    if (account.platform === "facebook") {
      return NextResponse.json({ eligible: true }, { status: 200 });
    }

    // Instagram: Check if Business Account
    if (account.platform === "instagram") {
      try {
        const tokenData = await getMetaAccessToken(
          workspaceId,
          account.outstand_account_id
        );

        if (!tokenData?.igUserId) {
          return NextResponse.json(
            { eligible: false },
            { status: 200 }
          );
        }

        const eligible = await validateIGStoryEligibility(
          tokenData.igUserId,
          tokenData.accessToken
        );

        return NextResponse.json({ eligible }, { status: 200 });
      } catch (err: any) {
        console.error("[validate-story] IG validation error:", err);
        return NextResponse.json(
          { eligible: false },
          { status: 200 }
        );
      }
    }

    // Other platforms: Not eligible
    return NextResponse.json({ eligible: false }, { status: 200 });
  } catch (err: any) {
    console.error("[api/meta/validate-story] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
