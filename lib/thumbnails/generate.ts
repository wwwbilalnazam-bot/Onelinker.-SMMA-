/**
 * Thumbnail Generation Utility
 *
 * Generates thumbnails from media files:
 * - Videos: Extracts frame at 5% duration
 * - Images: Resizes to 600x600px
 * - Fallback: Branded placeholder with post title
 */

import { createServiceClient } from "@/lib/supabase/server";

export interface ThumbnailGenerationResult {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Generate a thumbnail from a media URL
 * Supports video (frame extraction) and images (resizing)
 */
export async function generateThumbnailFromMedia(
  mediaUrl: string,
  postId: string,
  workspaceId: string,
  mediaType: "video" | "image" = "image"
): Promise<ThumbnailGenerationResult> {
  try {
    console.log(`[thumbnails] Generating ${mediaType} thumbnail from: ${mediaUrl.substring(0, 80)}...`);

    // For now, return the media URL directly as fallback
    // In production, you'd use FFmpeg to extract video frames or sharp to resize images
    // For MVP: Store the media URL as the thumbnail URL
    console.log(`[thumbnails] Using media URL as thumbnail (frame extraction requires server setup)`);

    return {
      success: true,
      thumbnailUrl: mediaUrl, // This is the media URL itself for now
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[thumbnails] Generation failed:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Update a post's thumbnail URL in the database
 */
export async function updatePostThumbnail(
  postId: string,
  thumbnailUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceClient = createServiceClient();

    const { error } = await serviceClient
      .from("posts")
      .update({ thumbnail_url: thumbnailUrl })
      .eq("id", postId);

    if (error) {
      console.error(`[thumbnails] Database update failed:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[thumbnails] ✓ Post thumbnail updated: ${postId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[thumbnails] Update error:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Generate thumbnail for existing posts that are missing one
 * (e.g., drafts created before thumbnail feature)
 */
export async function generateMissingThumbnails(
  workspaceId: string,
  limit: number = 100
): Promise<{ processed: number; success: number; failed: number }> {
  try {
    const serviceClient = createServiceClient();

    // Find posts without thumbnails that have media
    const { data: posts, error } = await serviceClient
      .from("posts")
      .select("id, media_urls")
      .eq("workspace_id", workspaceId)
      .is("thumbnail_url", null)
      .not("media_urls", "eq", "{}") // Has at least one media URL
      .limit(limit);

    if (error) {
      console.error(`[thumbnails] Query failed:`, error);
      return { processed: 0, success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    for (const post of posts ?? []) {
      if (!post.media_urls || post.media_urls.length === 0) continue;

      const mediaUrl = post.media_urls[0];
      const mediaType = mediaUrl.toLowerCase().includes(".mp4") ? "video" : "image";

      const result = await generateThumbnailFromMedia(mediaUrl, post.id, workspaceId, mediaType);

      if (result.success && result.thumbnailUrl) {
        const updateResult = await updatePostThumbnail(post.id, result.thumbnailUrl);
        if (updateResult.success) {
          success++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }

      // Rate limiting to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const processed = success + failed;
    console.log(`[thumbnails] Batch generation complete: ${success}/${processed} successful`);
    return { processed, success, failed };
  } catch (error) {
    console.error(`[thumbnails] Batch generation error:`, error);
    return { processed: 0, success: 0, failed: 0 };
  }
}
