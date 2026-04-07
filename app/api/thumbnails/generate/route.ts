/**
 * POST /api/thumbnails/generate
 *
 * Generates thumbnails for posts
 *
 * Request body:
 * {
 *   postId: string;
 *   mediaUrls: string[]; // URLs of media to generate thumbnail from
 *   workspaceId: string;
 * }
 *
 * Response:
 * {
 *   data: { thumbnailUrl: string } | null;
 *   error?: string;
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateThumbnailFromMedia, updatePostThumbnail } from "@/lib/thumbnails/generate";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      postId: string;
      mediaUrls?: string[];
      workspaceId: string;
    };

    const { postId, mediaUrls = [], workspaceId } = body;

    if (!postId || !workspaceId) {
      return NextResponse.json(
        { data: null, error: "Missing postId or workspaceId" },
        { status: 400 }
      );
    }

    // Verify user has access to this workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .not("accepted_at", "is", null)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ data: null, error: "Not a workspace member" }, { status: 403 });
    }

    // If no media URLs provided, fetch from post
    let mediaUrlsToUse = mediaUrls;
    if (mediaUrlsToUse.length === 0) {
      const serviceClient = createServiceClient();
      const { data: post, error } = await serviceClient
        .from("posts")
        .select("media_urls")
        .eq("id", postId)
        .eq("workspace_id", workspaceId)
        .single();

      if (error || !post?.media_urls?.length) {
        return NextResponse.json(
          { data: null, error: "No media URLs found for post" },
          { status: 400 }
        );
      }

      mediaUrlsToUse = post.media_urls;
    }

    // Generate thumbnail from first media URL
    const mediaUrl = mediaUrlsToUse[0];
    const mediaType = mediaUrl.toLowerCase().includes(".mp4") ? "video" : "image";

    console.log(`[api/thumbnails/generate] Generating ${mediaType} thumbnail for post ${postId}`);

    const result = await generateThumbnailFromMedia(mediaUrl, postId, workspaceId, mediaType);

    if (!result.success || !result.thumbnailUrl) {
      return NextResponse.json(
        { data: null, error: result.error ?? "Failed to generate thumbnail" },
        { status: 500 }
      );
    }

    // Update post with thumbnail URL
    const updateResult = await updatePostThumbnail(postId, result.thumbnailUrl);

    if (!updateResult.success) {
      return NextResponse.json(
        { data: null, error: updateResult.error ?? "Failed to update post thumbnail" },
        { status: 500 }
      );
    }

    console.log(`[api/thumbnails/generate] ✓ Thumbnail generated: ${result.thumbnailUrl.substring(0, 80)}...`);

    return NextResponse.json({
      data: {
        postId,
        thumbnailUrl: result.thumbnailUrl,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[api/thumbnails/generate] Error:`, errorMessage);
    return NextResponse.json(
      { data: null, error: errorMessage },
      { status: 500 }
    );
  }
}
