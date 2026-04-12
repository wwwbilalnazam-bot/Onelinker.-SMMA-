// ════════════════════════════════════════════════════════════
// GET /api/inbox/messages
// Fetch messages and comments with filters
//
// Query params:
// - type: 'all' | 'comments' | 'messages' (default: 'all')
// - status: 'unread' | 'read' | 'replied' | 'archived' (default: all)
// - platform: 'facebook' | 'instagram' | 'twitter' | 'youtube' (can be array)
// - account_id: filter by specific account
// - search: full-text search on content
// - limit: number of results (default: 20, max: 100)
// - offset: pagination offset
// ════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");
    const type = (searchParams.get("type") || "all") as "all" | "comments" | "messages";
    const status = searchParams.get("status");
    const platform = searchParams.getAll("platform");
    const accountId = searchParams.get("account_id");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!workspaceId) {
      return NextResponse.json(
        { data: null, error: "Missing required parameter: workspace_id" },
        { status: 400 }
      );
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .not("accepted_at", "is", null)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { data: null, error: "Not a workspace member" },
        { status: 403 }
      );
    }

    // Build queries for both comments and messages
    const results: any[] = [];
    let total = 0;

    // Fetch comments (inbox_messages)
    if (type === "all" || type === "comments") {
      let commentsQuery = supabase
        .from("inbox_messages")
        .select("*, post:posts(id, content, platforms, published_at)", { count: "exact" })
        .eq("workspace_id", workspaceId);

      if (status) {
        commentsQuery = commentsQuery.eq("status", status);
      }

      if (platform && platform.length > 0) {
        commentsQuery = commentsQuery.in("platform", platform);
      }

      if (accountId) {
        commentsQuery = commentsQuery.eq("account_id", accountId);
      }

      if (search) {
        commentsQuery = commentsQuery.ilike("content", `%${search}%`);
      }

      const { data: comments, count, error: commentsError } = await commentsQuery
        .order("received_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (commentsError) {
        console.error("[get comments] Error:", commentsError);
        return NextResponse.json(
          { data: null, error: "Failed to fetch comments" },
          { status: 500 }
        );
      }

      results.push(
        ...(comments || []).map((comment) => ({
          ...comment,
          message_type: "comment",
        }))
      );

      total += count || 0;
    }

    // Fetch messages (DMs)
    if (type === "all" || type === "messages") {
      let messagesQuery = supabase
        .from("messages")
        .select("*", { count: "exact" })
        .eq("workspace_id", workspaceId);

      if (status) {
        messagesQuery = messagesQuery.eq("status", status);
      }

      if (platform && platform.length > 0) {
        messagesQuery = messagesQuery.in("platform", platform);
      }

      if (accountId) {
        messagesQuery = messagesQuery.eq("account_id", accountId);
      }

      if (search) {
        messagesQuery = messagesQuery.ilike("content", `%${search}%`);
      }

      const { data: messages, count, error: messagesError } = await messagesQuery
        .order("received_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (messagesError) {
        console.error("[get messages] Error:", messagesError);
        return NextResponse.json(
          { data: null, error: "Failed to fetch messages" },
          { status: 500 }
        );
      }

      results.push(
        ...(messages || []).map((msg) => ({
          ...msg,
          message_type: "message",
        }))
      );

      total += count || 0;
    }

    // Sort combined results by received_at (newest first)
    results.sort((a, b) => {
      const timeA = new Date(a.received_at).getTime();
      const timeB = new Date(b.received_at).getTime();
      return timeB - timeA;
    });

    // Apply limit to combined results
    const paginated = results.slice(0, limit);

    return NextResponse.json({
      data: paginated,
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    });
  } catch (error) {
    console.error("[api/inbox/messages] Unexpected error:", error);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
