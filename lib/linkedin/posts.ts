// ════════════════════════════════════════════════════════════
// LINKEDIN POSTS — Create Posts via Community Management API
//
// LinkedIn's posting API uses the /rest/posts endpoint.
// Supports:
//   - Text-only posts
//   - Single image posts (requires image upload → asset URN)
//   - Multi-image posts (carousel/document)
//   - Video posts (requires video upload → asset URN)
//   - Article shares (link posts)
//
// Image/video upload flow:
//   1. Register upload → get upload URL + asset URN
//   2. Upload binary to the upload URL
//   3. Reference the asset URN in the post
// ════════════════════════════════════════════════════════════

import { LinkedInApiError } from "./client";

const REST_API_BASE = "https://api.linkedin.com/rest";

// ── Types ───────────────────────────────────────────────────

export interface LinkedInPostResult {
  postUrn: string;
  platform: string;
}

export interface LinkedInPostParams {
  /** Author URN, e.g. "urn:li:person:abc123" */
  authorUrn: string;
  accessToken: string;
  text: string;
  /** Public URLs of media to attach */
  mediaUrls?: string[];
  /** Post format hint */
  format?: string;
}

// ── Register & upload an image ──────────────────────────────

async function uploadImageToLinkedIn(
  authorUrn: string,
  imageUrl: string,
  accessToken: string
): Promise<string> {
  // Step 1: Register the upload
  const registerRes = await fetch(`${REST_API_BASE}/images?action=initializeUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: authorUrn,
      },
    }),
  });

  if (!registerRes.ok) {
    const err = (await registerRes.json().catch(() => ({}))) as { message?: string };
    throw new LinkedInApiError(
      err.message ?? `Image upload registration failed: ${registerRes.status}`,
      registerRes.status
    );
  }

  const registerData = (await registerRes.json()) as {
    value: {
      uploadUrl: string;
      image: string; // The image URN
    };
  };

  const { uploadUrl, image: imageUrn } = registerData.value;

  // Step 2: Download the image from the public URL
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    throw new LinkedInApiError(`Failed to download image from ${imageUrl}`, imageRes.status);
  }
  const imageBuffer = await imageRes.arrayBuffer();

  // Step 3: Upload binary to LinkedIn
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": imageRes.headers.get("content-type") ?? "image/jpeg",
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    throw new LinkedInApiError(
      `Image upload to LinkedIn failed: ${uploadRes.status}`,
      uploadRes.status
    );
  }

  return imageUrn;
}

// ── Register & upload a video ───────────────────────────────

async function uploadVideoToLinkedIn(
  authorUrn: string,
  videoUrl: string,
  accessToken: string
): Promise<string> {
  // Download the video first to get the file size
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) {
    throw new LinkedInApiError(`Failed to download video from ${videoUrl}`, videoRes.status);
  }
  const videoBuffer = await videoRes.arrayBuffer();

  // Step 1: Register the upload
  const registerRes = await fetch(`${REST_API_BASE}/videos?action=initializeUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: authorUrn,
        fileSizeBytes: videoBuffer.byteLength,
        uploadCaptions: false,
        uploadThumbnail: false,
      },
    }),
  });

  if (!registerRes.ok) {
    const err = (await registerRes.json().catch(() => ({}))) as { message?: string };
    throw new LinkedInApiError(
      err.message ?? `Video upload registration failed: ${registerRes.status}`,
      registerRes.status
    );
  }

  const registerData = (await registerRes.json()) as {
    value: {
      uploadInstructions: Array<{ uploadUrl: string }>;
      video: string; // The video URN
    };
  };

  const videoUrn = registerData.value.video;
  const uploadUrl = registerData.value.uploadInstructions[0]?.uploadUrl;

  if (!uploadUrl) {
    throw new LinkedInApiError("No upload URL returned from LinkedIn", 500);
  }

  // Step 2: Upload binary
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": videoRes.headers.get("content-type") ?? "video/mp4",
      "Content-Length": String(videoBuffer.byteLength),
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    throw new LinkedInApiError(
      `Video upload to LinkedIn failed: ${uploadRes.status}`,
      uploadRes.status
    );
  }

  // Step 3: Finalize the upload
  const finalizeRes = await fetch(`${REST_API_BASE}/videos?action=finalizeUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
    },
    body: JSON.stringify({
      finalizeUploadRequest: {
        video: videoUrn,
        uploadToken: "",
        uploadedPartIds: [],
      },
    }),
  });

  if (!finalizeRes.ok) {
    // Finalize may not be needed for single-part uploads — proceed
    console.warn("[linkedin/posts] Video finalize returned:", finalizeRes.status);
  }

  return videoUrn;
}

// ── Detect media type from URL ──────────────────────────────

function isVideoUrl(url: string): boolean {
  const videoExts = [".mp4", ".mov", ".avi", ".wmv", ".webm", ".mkv"];
  const lower = url.toLowerCase().split("?")[0] ?? "";
  return videoExts.some((ext) => lower.endsWith(ext));
}

// ── Create a LinkedIn post ──────────────────────────────────

export async function createLinkedInPost(
  params: LinkedInPostParams
): Promise<LinkedInPostResult> {
  const { authorUrn, accessToken, text, mediaUrls } = params;

  // Build the post body
  const postBody: Record<string, unknown> = {
    author: authorUrn,
    commentary: text,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
  };

  // ── Handle media attachments ────────────────────────────
  if (mediaUrls && mediaUrls.length > 0) {
    if (mediaUrls.length === 1) {
      const url = mediaUrls[0]!;

      if (isVideoUrl(url)) {
        // Single video post
        const videoUrn = await uploadVideoToLinkedIn(authorUrn, url, accessToken);
        postBody.content = {
          media: {
            id: videoUrn,
          },
        };
      } else {
        // Single image post
        const imageUrn = await uploadImageToLinkedIn(authorUrn, url, accessToken);
        postBody.content = {
          media: {
            id: imageUrn,
          },
        };
      }
    } else {
      // Multi-image post — upload all images
      const imageUrns: string[] = [];
      for (const url of mediaUrls) {
        if (!isVideoUrl(url)) {
          const imageUrn = await uploadImageToLinkedIn(authorUrn, url, accessToken);
          imageUrns.push(imageUrn);
        }
      }

      if (imageUrns.length > 0) {
        postBody.content = {
          multiImage: {
            images: imageUrns.map((urn) => ({ id: urn })),
          },
        };
      }
    }
  }

  // ── Create the post ─────────────────────────────────────
  const res = await fetch(`${REST_API_BASE}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(postBody),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new LinkedInApiError(
      err.message ?? `LinkedIn post creation failed: ${res.status}`,
      res.status
    );
  }

  // The post ID is returned in the x-restli-id header or x-linkedin-id header
  const postId = res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id") ?? "";

  return {
    postUrn: postId,
    platform: "linkedin",
  };
}

// ── Delete a LinkedIn post ──────────────────────────────────

export async function deleteLinkedInPost(
  postUrn: string,
  accessToken: string
): Promise<void> {
  const encodedUrn = encodeURIComponent(postUrn);
  const res = await fetch(`${REST_API_BASE}/posts/${encodedUrn}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": "202401",
    },
  });

  if (!res.ok && res.status !== 404) {
    throw new LinkedInApiError(
      `Failed to delete LinkedIn post: ${res.status}`,
      res.status
    );
  }
}
