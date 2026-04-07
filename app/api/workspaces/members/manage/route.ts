import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4, manager: 3, editor: 2, viewer: 1,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, workspace_id } = body;

    if (!action || !workspace_id) {
      return NextResponse.json({ error: "Missing action or workspace_id" }, { status: 400 });
    }

    // Verify authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const service = createServiceClient();

    // Get caller's membership
    const { data: caller } = await service
      .from("workspace_members")
      .select("id, role, deactivated_at")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!caller) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
    }

    if (caller.deactivated_at) {
      return NextResponse.json({ error: "Your access has been deactivated" }, { status: 403 });
    }

    const callerLevel = ROLE_HIERARCHY[caller.role] ?? 0;

    switch (action) {
      // ── Cancel a pending invitation ──────────────────────
      case "cancel_invite": {
        const { invitation_id } = body;
        if (!invitation_id) return NextResponse.json({ error: "Missing invitation_id" }, { status: 400 });

        if (!["owner", "manager"].includes(caller.role)) {
          return NextResponse.json({ error: "Only owners and managers can cancel invitations" }, { status: 403 });
        }

        const { error } = await service
          .from("invitations")
          .delete()
          .eq("id", invitation_id)
          .eq("workspace_id", workspace_id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      // ── Remove a workspace member ────────────────────────
      case "remove_member": {
        const { member_id } = body;
        if (!member_id) return NextResponse.json({ error: "Missing member_id" }, { status: 400 });

        if (!["owner", "manager"].includes(caller.role)) {
          return NextResponse.json({ error: "Only owners and managers can remove members" }, { status: 403 });
        }

        // Get target member
        const { data: target } = await service
          .from("workspace_members")
          .select("id, role, user_id")
          .eq("id", member_id)
          .eq("workspace_id", workspace_id)
          .single();

        if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
        if (target.user_id === user.id) return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
        if (target.role === "owner") return NextResponse.json({ error: "Cannot remove the workspace owner" }, { status: 403 });

        const targetLevel = ROLE_HIERARCHY[target.role] ?? 0;
        if (callerLevel <= targetLevel && caller.role !== "owner") {
          return NextResponse.json({ error: "Cannot remove a member with equal or higher role" }, { status: 403 });
        }

        const { error } = await service
          .from("workspace_members")
          .delete()
          .eq("id", member_id)
          .eq("workspace_id", workspace_id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      // ── Change a member's role ───────────────────────────
      case "change_role": {
        const { member_id, new_role } = body;
        if (!member_id || !new_role) return NextResponse.json({ error: "Missing member_id or new_role" }, { status: 400 });

        if (!["manager", "editor", "viewer"].includes(new_role)) {
          return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        if (caller.role !== "owner") {
          return NextResponse.json({ error: "Only the workspace owner can change roles" }, { status: 403 });
        }

        // Get target member
        const { data: target } = await service
          .from("workspace_members")
          .select("id, role, user_id")
          .eq("id", member_id)
          .eq("workspace_id", workspace_id)
          .single();

        if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
        if (target.user_id === user.id) return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
        if (target.role === "owner") return NextResponse.json({ error: "Cannot change the owner's role" }, { status: 403 });

        const { error } = await service
          .from("workspace_members")
          .update({ role: new_role })
          .eq("id", member_id)
          .eq("workspace_id", workspace_id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      // ── Deactivate a member ──────────────────────────────
      case "deactivate_member": {
        const { member_id } = body;
        if (!member_id) return NextResponse.json({ error: "Missing member_id" }, { status: 400 });

        if (caller.role !== "owner") {
          return NextResponse.json({ error: "Only the workspace owner can deactivate members" }, { status: 403 });
        }

        const { data: target } = await service
          .from("workspace_members")
          .select("id, role, user_id, deactivated_at")
          .eq("id", member_id)
          .eq("workspace_id", workspace_id)
          .single();

        if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
        if (target.user_id === user.id) return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 });
        if (target.role === "owner") return NextResponse.json({ error: "Cannot deactivate the workspace owner" }, { status: 403 });
        if (target.deactivated_at) return NextResponse.json({ error: "Member is already deactivated" }, { status: 400 });

        const { error } = await service
          .from("workspace_members")
          .update({ deactivated_at: new Date().toISOString() })
          .eq("id", member_id)
          .eq("workspace_id", workspace_id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      // ── Reactivate a member ─────────────────────────────
      case "reactivate_member": {
        const { member_id } = body;
        if (!member_id) return NextResponse.json({ error: "Missing member_id" }, { status: 400 });

        if (caller.role !== "owner") {
          return NextResponse.json({ error: "Only the workspace owner can reactivate members" }, { status: 403 });
        }

        const { data: target } = await service
          .from("workspace_members")
          .select("id, deactivated_at")
          .eq("id", member_id)
          .eq("workspace_id", workspace_id)
          .single();

        if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
        if (!target.deactivated_at) return NextResponse.json({ error: "Member is not deactivated" }, { status: 400 });

        const { error } = await service
          .from("workspace_members")
          .update({ deactivated_at: null })
          .eq("id", member_id)
          .eq("workspace_id", workspace_id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
