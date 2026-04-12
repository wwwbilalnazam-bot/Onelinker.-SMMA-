// ════════════════════════════════════════════════════════════
// POST /api/inbox/reply
// Sends a reply to a comment or direct message
// ════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ChannelAdapterFactory } from "@/lib/channels/factory";
import { Platform } from "@/types";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { messageId, table = "inbox_messages", content } = body;

    if (!messageId || !content) {
      return NextResponse.json(
        { data: null, error: "Missing required fields: messageId, content" },
        { status: 400 }
      );
    }

    if (!["inbox_messages", "messages"].includes(table)) {
      return NextResponse.json(
        { data: null, error: "Invalid table" },
        { status: 400 }
      );
    }

    // Get the message to find workspace_id, platform, account_id, external_message_id
    const { data: message, error: fetchError } = await supabase
      .from(table)
      .select("workspace_id, account_id, platform, external_message_id, status")
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

    const { getMetaAccessToken } = await import("@/lib/meta/accounts");
    
    // Get token
    const tokenData = await getMetaAccessToken(message.workspace_id, message.account_id);
    if (!tokenData) {
      return NextResponse.json(
        { data: null, error: "Account disconnected or token expired" },
        { status: 400 }
      );
    }

    let adapter;
    try {
      adapter = ChannelAdapterFactory.getAdapter(message.platform as Platform);
    } catch (err) {
      return NextResponse.json(
        { data: null, error: `Sending replies for ${message.platform} is currently unsupported` },
        { status: 400 }
      );
    }

    // Send reply via adapter and capture the external reply ID
    let externalReplyId: string;
    try {
      const replyResult = await adapter.sendReply({
        targetId: message.external_message_id,
        content,
        accessToken: tokenData.accessToken,
        targetType: table === "inbox_messages" ? "comment" : "message"
      });
      externalReplyId = replyResult.externalId;
    } catch (err: any) {
      console.error("[reply] Error sending reply:", err);
      return NextResponse.json(
        { data: null, error: err.message || "Failed to send reply to platform API" },
        { status: 500 }
      );
    }

    // Update status to 'replied' and save the reply content with user tracking
    const { data: updated, error: updateError } = await supabase
      .from(table)
      .update({
        status: "replied",
        reply_text: content,
        external_reply_id: externalReplyId,
        replied_by_user_id: user.id,
        replied_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", messageId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("[reply] Error updating message with reply:", updateError);
      return NextResponse.json(
        { data: null, error: "Failed to update message with reply" },
        { status: 500 }
      );
    }

    // Log the reply activity
    try {
      await supabase
        .from("message_activity_log")
        .insert({
          workspace_id: message.workspace_id,
          message_id: messageId,
          message_table: table,
          action: "replied",
          performed_by_user_id: user.id,
          reply_content: content,
          external_reply_id: updated?.external_reply_id,
        });
    } catch (logErr) {
      console.warn("[reply] Failed to log activity:", logErr);
      // Don't fail the whole request if logging fails
    }

    return NextResponse.json({
      data: updated,
      error: null,
    });
  } catch (error) {
    console.error("[api/inbox/reply] Unexpected error:", error);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
