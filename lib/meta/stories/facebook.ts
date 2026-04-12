import { z } from "zod";
import { graphPost, graphPut } from "../client";

const FacebookPhotoStorySchema = z.object({
  pageId: z.string().min(1),
  pageAccessToken: z.string().min(1),
  imageUrl: z.string().url(),
  caption: z.string().optional(),
});

const FacebookVideoStorySchema = z.object({
  pageId: z.string().min(1),
  pageAccessToken: z.string().min(1),
  videoUrl: z.string().url(),
  caption: z.string().optional(),
});

type PhotoStoryInput = z.infer<typeof FacebookPhotoStorySchema>;
type VideoStoryInput = z.infer<typeof FacebookVideoStorySchema>;

/**
 * Publish a photo story to a Facebook Page
 * Uses POST /{page-id}/photo_stories endpoint
 * @throws {Error} If upload fails or token is invalid
 */
export async function publishPhotoStory(
  input: PhotoStoryInput
): Promise<{ id: string; platform: "facebook" }> {
  const validated = FacebookPhotoStorySchema.parse(input);

  try {
    const res = await graphPost<{ id: string }>(
      `/${validated.pageId}/photo_stories`,
      {
        url: validated.imageUrl,
        ...(validated.caption && { caption: validated.caption }),
      },
      validated.pageAccessToken
    );

    console.log(`[facebook-story] Photo story published: ${res.id}`);
    return { id: res.id, platform: "facebook" };
  } catch (err: any) {
    const msg = err?.error?.message || err?.message || String(err);
    if (msg.includes("permission")) {
      throw new Error(
        "Permission denied. Ensure the page has `pages_manage_posts` scope and is active."
      );
    }
    throw new Error(`Failed to publish photo story: ${msg}`);
  }
}

/**
 * Publish a video story to a Facebook Page (resumable upload)
 * 3-step flow: start → upload → finish
 * Uses POST /{page-id}/video_stories with upload_phase parameter
 * @throws {Error} If any step fails after max retries
 */
export async function publishVideoStory(
  input: VideoStoryInput,
  maxRetries = 3
): Promise<{ id: string; platform: "facebook" }> {
  const validated = FacebookVideoStorySchema.parse(input);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Step 1: Start upload session
      console.log(
        `[facebook-story] Starting video upload (attempt ${attempt + 1}/${maxRetries})`
      );
      const startRes = await graphPost<{
        upload_session_id: string;
        upload_url: string;
      }>(
        `/${validated.pageId}/video_stories`,
        { upload_phase: "start" },
        validated.pageAccessToken
      );

      // Step 2: Upload video binary to the returned URL
      console.log(`[facebook-story] Uploading video to temporary URL`);
      const videoBlob = await fetch(validated.videoUrl).then((r) =>
        r.blob()
      );

      const uploadRes = await fetch(startRes.upload_url, {
        method: "PUT",
        body: videoBlob,
        headers: { "Content-Type": "video/mp4" },
      });

      if (!uploadRes.ok) {
        throw new Error(
          `Upload failed: ${uploadRes.status} ${uploadRes.statusText}`
        );
      }

      // Step 3: Finish upload and publish
      console.log(
        `[facebook-story] Finalizing story with session ${startRes.upload_session_id}`
      );
      const finishRes = await graphPost<{ id: string }>(
        `/${validated.pageId}/video_stories`,
        {
          upload_session_id: startRes.upload_session_id,
          upload_phase: "finish",
          ...(validated.caption && { caption: validated.caption }),
        },
        validated.pageAccessToken
      );

      console.log(`[facebook-story] Video story published: ${finishRes.id}`);
      return { id: finishRes.id, platform: "facebook" };
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || String(err);
      const code = err?.error?.code;
      const isRetryable =
        code === 2 || msg.includes("timeout") || msg.includes("temporary");

      if (isRetryable && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // exponential backoff
        console.warn(
          `[facebook-story] Retrying in ${delay}ms due to: ${msg}`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (msg.includes("permission") || code === 200) {
        throw new Error(
          "Permission denied. Ensure scope `pages_manage_posts` is granted."
        );
      }
      throw new Error(`Failed to publish video story: ${msg}`);
    }
  }

  throw new Error("Video story upload failed after max retries");
}
