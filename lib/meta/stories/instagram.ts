import { z } from "zod";
import { graphPost, graphGet } from "../client";

const IGStorySchema = z.object({
  igUserId: z.string().min(1),
  accessToken: z.string().min(1),
  mediaUrl: z.string().url(),
  isVideo: z.boolean(),
});

type IGStoryInput = z.infer<typeof IGStorySchema>;

/**
 * Validate if IG account can post stories (must be Business Account, not Creator)
 * Checks account_type field via Graph API
 */
export async function validateIGStoryEligibility(
  igUserId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const res = await graphGet<{ account_type: string }>(
      `/${igUserId}`,
      { fields: "account_type" },
      accessToken
    );
    return res.account_type === "BUSINESS";
  } catch (err) {
    console.warn("[ig-story] Eligibility check failed:", err);
    return false;
  }
}

/**
 * Publish a story to Instagram Business Account (container-based flow)
 * Creates media container → polls for ready → publishes
 * Uses POST /{ig-user-id}/media with media_type: "STORIES"
 * @throws {Error} If container fails or polling times out
 */
export async function publishIGStory(
  input: IGStoryInput,
  maxPolls = 30,
  pollInterval = 1000
): Promise<{ id: string; platform: "instagram" }> {
  const validated = IGStorySchema.parse(input);

  try {
    // Step 1: Create media container
    console.log(
      `[ig-story] Creating ${validated.isVideo ? "video" : "photo"} story container`
    );
    const container = await graphPost<{ id: string }>(
      `/${validated.igUserId}/media`,
      {
        media_type: "STORIES",
        ...(validated.isVideo
          ? { video_url: validated.mediaUrl }
          : { image_url: validated.mediaUrl }),
      },
      validated.accessToken
    );

    console.log(`[ig-story] Container created: ${container.id}`);

    // Step 2: Poll container status until FINISHED or ERROR
    let isReady = false;
    for (let i = 0; i < maxPolls; i++) {
      const status = await graphGet<{
        status_code: string;
        status?: string;
      }>(
        `/${container.id}`,
        { fields: "status_code,status" },
        validated.accessToken
      );

      if (status.status_code === "FINISHED") {
        console.log(
          `[ig-story] Container ready after ${(i + 1) * (pollInterval / 1000)}s`
        );
        isReady = true;
        break;
      }
      if (status.status_code === "ERROR") {
        throw new Error(
          `Container processing failed: ${status.status || "unknown error"}`
        );
      }

      await new Promise((r) => setTimeout(r, pollInterval));
    }

    if (!isReady) {
      throw new Error("Instagram container processing timeout (30s)");
    }

    // Step 3: Publish container
    console.log(`[ig-story] Publishing container ${container.id}`);
    const published = await graphPost<{ id: string }>(
      `/${validated.igUserId}/media_publish`,
      { creation_id: container.id },
      validated.accessToken
    );

    console.log(`[ig-story] Story published: ${published.id}`);
    return { id: published.id, platform: "instagram" };
  } catch (err: any) {
    const msg = err?.error?.message || err?.message || String(err);

    if (msg.includes("permission") || msg.includes("does not exist")) {
      throw new Error(
        "Instagram account ineligible. Ensure it's a Business Account with `instagram_content_publish` scope."
      );
    }
    throw new Error(`Failed to publish IG story: ${msg}`);
  }
}
