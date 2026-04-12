// ════════════════════════════════════════════════════════════
// PATCH /api/inbox/messages/[id]
// Update message or comment status (read, unread, replied, archived)
// ════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const messageId = params.id;
    const { status, table = "inbox_messages" } = await request.json();

    if (!messageId || !status) {
      return NextResponse.json(
        { data: null, error: "Missing required fields: id, status" },
        { status: 400 }
      );
    }

    if (!["unread", "read", "replied", "archived"].includes(status)) {
      return NextResponse.json(
        { data: null, error: "Invalid status value" },
        { status: 400 }
      );
    }

    if (!["inbox_messages", "messages"].includes(table)) {
      return NextResponse.json(
        { data: null, error: "Invalid table" },
        { status: 400 }
      );
    }

    // Get the message to find workspace_id and current status
    const { data: message, error: fetchError } = await supabase
      .from(table)
      .select("workspace_id, status")
      .eq("id", messageId)
      .maybeSingle();

    if (fetchError || !message) {
      return NextResponse.json(
        { data: null, error: "Message not found" },
        { status: 404 }
      );
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", message.workspace_id)
      .eq("user_id", user.id)
      .not("accepted_at", "is", null)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { data: null, error: "Not a workspace member" },
        { status: 403 }
      );
    }

    // Update status with user tracking
    const { data: updated, error: updateError } = await supabase
      .from(table)
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", messageId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error(`[patch message] Error updating status:`, updateError);
      return NextResponse.json(
        { data: null, error: "Failed to update message" },
        { status: 500 }
      );
    }

    // Log the activity for audit purposes
    try {
      await supabase
        .from("message_activity_log")
        .insert({
          workspace_id: message.workspace_id,
          message_id: messageId,
          message_table: table,
          action: "status_changed",
          performed_by_user_id: user.id,
          previous_status: message.status,
          new_status: status,
        });
    } catch (logErr) {
      console.warn("[patch message] Failed to log activity:", logErr);
      // Don't fail the whole request if logging fails
    }

    return NextResponse.json({
      data: updated,
      error: null,
    });
  } catch (error) {
    console.error("[api/inbox/messages/[id]] Unexpected error:", error);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
