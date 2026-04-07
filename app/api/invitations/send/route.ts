import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, role, workspace_id } = await req.json();

    if (!email || !role || !workspace_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["manager", "editor", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const service = createServiceClient();

    // Verify caller is owner/manager of the workspace
    const { data: callerMember } = await service
      .from("workspace_members")
      .select("role, deactivated_at")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!callerMember || !["owner", "manager"].includes(callerMember.role)) {
      return NextResponse.json({ error: "Only owners and managers can invite members" }, { status: 403 });
    }

    if (callerMember.deactivated_at) {
      return NextResponse.json({ error: "Your access has been deactivated" }, { status: 403 });
    }

    // Generate token
    const normalizedEmail = email.trim().toLowerCase();
    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Delete any existing invitation for this email+workspace (allows re-inviting)
    await service
      .from("invitations")
      .delete()
      .eq("workspace_id", workspace_id)
      .eq("email", normalizedEmail);

    // Insert new invitation
    const { data: invitation, error: insertError } = await service
      .from("invitations")
      .insert({
        workspace_id,
        email: normalizedEmail,
        role,
        invited_by: user.id,
        token,
        expires_at,
      })
      .select("id, email, role, created_at, expires_at")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Get workspace name for the email
    const { data: workspace } = await service
      .from("workspaces")
      .select("name")
      .eq("id", workspace_id)
      .single();

    // Send invitation email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteLink = `${appUrl}/invite/accept?token=${token}`;

    await sendInviteEmail({
      to: email.trim().toLowerCase(),
      inviterName: user.user_metadata?.full_name ?? user.email ?? "A team member",
      workspaceName: workspace?.name ?? "a workspace",
      role,
      inviteLink,
    });

    return NextResponse.json({
      success: true,
      invitation,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function sendInviteEmail({
  to,
  inviterName,
  workspaceName,
  role,
  inviteLink,
}: {
  to: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteLink: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "hello@onelinker.ai";

  if (!apiKey) {
    console.warn("[Invitations] RESEND_API_KEY not set — skipping email. Invite link:", inviteLink);
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: `Onelinker <${from}>`,
      to,
      subject: `${inviterName} invited you to join ${workspaceName} on Onelinker`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 8px;">You've been invited!</h2>
          <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            <strong>${inviterName}</strong> has invited you to join
            <strong>${workspaceName}</strong> as <strong>${role}</strong> on Onelinker.
          </p>
          <a href="${inviteLink}"
             style="display: inline-block; background: #7c3aed; color: #fff; text-decoration: none;
                    padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
            Accept Invitation
          </a>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">
            This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Invitations] Failed to send email:", err);
    // Don't throw — invitation was already created, email is best-effort
  }
}
