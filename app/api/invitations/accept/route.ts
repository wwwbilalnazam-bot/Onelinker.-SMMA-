import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing invitation token" }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use service client to bypass RLS for cross-table operations
    const service = createServiceClient();

    // Find the invitation by token
    const { data: invitation, error: invError } = await service
      .from("invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .single();

    if (invError || !invitation) {
      return NextResponse.json({ error: "Invalid or already used invitation" }, { status: 404 });
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invitation has expired" }, { status: 410 });
    }

    // Verify the email matches the authenticated user
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    // Check if user is already a member of this workspace
    const { data: existingMember } = await service
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", invitation.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      // Mark invitation as accepted anyway
      await service
        .from("invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return NextResponse.json({ error: "You are already a member of this workspace" }, { status: 409 });
    }

    // Insert workspace member and mark invitation as accepted in parallel
    const [memberResult, inviteUpdateResult] = await Promise.all([
      service.from("workspace_members").insert({
        workspace_id: invitation.workspace_id,
        user_id: user.id,
        role: invitation.role,
        accepted_at: new Date().toISOString(),
      }),
      service
        .from("invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id),
    ]);

    if (memberResult.error) {
      return NextResponse.json(
        { error: `Failed to join workspace: ${memberResult.error.message}` },
        { status: 500 }
      );
    }

    // Fetch workspace name for the response
    const { data: workspace } = await service
      .from("workspaces")
      .select("id, name, slug")
      .eq("id", invitation.workspace_id)
      .single();

    return NextResponse.json({
      success: true,
      workspace: workspace ?? { id: invitation.workspace_id },
      role: invitation.role,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
