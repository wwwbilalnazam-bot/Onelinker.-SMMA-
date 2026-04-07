// ════════════════════════════════════════════════════════════
// YOUTUBE POSTS — Upload Videos & Shorts
//
// YouTube uses a resumable upload protocol:
//   1. POST /upload/youtube/v3/videos?uploadType=resumable
//      → returns an upload URI in the Location header
//   2. PUT the video file bytes to that URI
//
// For URL-based uploads (our case — media is already hosted),
// we download the video first, then upload to YouTube.
//
// Shorts are just regular videos with:
//   - Vertical aspect ratio (9:16)
//   - ≤60 seconds
//   - "#Shorts" in title or description
// ════════════════════════════════════════════════════════════

import { YouTubeApiError } from "./client";

const UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3";

// ── Types ───────────────────────────────────────────────────

export interface YouTubeVideoResult {
  videoId: string;
  status: "uploaded" | "processing" | "private" | "public";
}

export interface YouTubeUploadParams {
  channelId: string;
  accessToken: string;
  videoUrl: string;          // Public URL of the video file
  title: string;
  description: string;
  isShort?: boolean;
  privacyStatus?: "public" | "private" | "unlisted";
  categoryId?: string;
  tags?: string[];
  madeForKids?: boolean;
  scheduledAt?: string;      // ISO 8601 — publishes at this time (must be private first)
  thumbnailUrl?: string;     // Custom thumbnail URL
}

// ── Upload a video to YouTube ───────────────────────────────

export async function uploadYouTubeVideo(
  params: YouTubeUploadParams
): Promise<YouTubeVideoResult> {
  const {
    accessToken,
    videoUrl,
    title,
    description,
    isShort = false,
    privacyStatus = "public",
    categoryId = "22", // "People & Blogs"
    tags = [],
    madeForKids = false,
    scheduledAt,
    thumbnailUrl,
  } = params;

  // If scheduling, video must be set to "private" first, then auto-published
  const effectivePrivacy = scheduledAt ? "private" : privacyStatus;

  // Build video resource metadata
  const videoResource: Record<string, unknown> = {
    snippet: {
      title: isShort && !title.includes("#Shorts") ? `${title} #Shorts` : title,
      description,
      categoryId,
      tags: tags.length > 0 ? tags : undefined,
    },
    status: {
      privacyStatus: effectivePrivacy,
      selfDeclaredMadeForKids: madeForKids,
      ...(scheduledAt ? { publishAt: scheduledAt } : {}),
    },
  };

  // ── Step 1: Download the video from URL ────────────────────
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) {
    throw new YouTubeApiError(
      `Failed to download video from ${videoUrl}: ${videoRes.status}`,
      videoRes.status
    );
  }

  const videoBuffer = await videoRes.arrayBuffer();
  const contentType = videoRes.headers.get("content-type") ?? "video/mp4";

  // ── Step 2: Initiate resumable upload ──────────────────────
  const initUrl = new URL(`${UPLOAD_BASE}/videos`);
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");

  const initRes = await fetch(initUrl.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(videoBuffer.byteLength),
      "X-Upload-Content-Type": contentType,
    },
    body: JSON.stringify(videoResource),
  });

  if (!initRes.ok) {
    const err = (await initRes.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new YouTubeApiError(
      err.error?.message ?? `Upload init failed: ${initRes.status}`,
      initRes.status
    );
  }

  const uploadUri = initRes.headers.get("Location");
  if (!uploadUri) {
    throw new YouTubeApiError("No upload URI returned from YouTube", 500);
  }

  // ── Step 3: Upload the video bytes ─────────────────────────
  const uploadRes = await fetch(uploadUri, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(videoBuffer.byteLength),
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    const err = (await uploadRes.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new YouTubeApiError(
      err.error?.message ?? `Video upload failed: ${uploadRes.status}`,
      uploadRes.status
    );
  }

  const videoData = (await uploadRes.json()) as {
    id: string;
    status: { uploadStatus: string; privacyStatus: string };
  };

  // ── Step 4: Set custom thumbnail (optional) ────────────────
  if (thumbnailUrl && videoData.id) {
    try {
      await setVideoThumbnail(videoData.id, thumbnailUrl, accessToken);
    } catch (err) {
      console.error("[youtube/posts] Failed to set thumbnail:", err);
      // Don't fail the upload for thumbnail errors
    }
  }

  return {
    videoId: videoData.id,
    status: videoData.status.uploadStatus === "uploaded" ? "uploaded" : "processing",
  };
}

// ── Set custom thumbnail ────────────────────────────────────

async function setVideoThumbnail(
  videoId: string,
  thumbnailUrl: string,
  accessToken: string
): Promise<void> {
  // Download thumbnail
  const thumbRes = await fetch(thumbnailUrl);
  if (!thumbRes.ok) return;

  const thumbBuffer = await thumbRes.arrayBuffer();
  const contentType = thumbRes.headers.get("content-type") ?? "image/jpeg";

  const url = new URL(`${UPLOAD_BASE}/thumbnails/set`);
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("uploadType", "media");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: thumbBuffer,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new YouTubeApiError(
      err.error?.message ?? `Thumbnail upload failed: ${res.status}`,
      res.status
    );
  }
}

// ── Delete a video ──────────────────────────────────────────

export async function deleteYouTubeVideo(
  videoId: string,
  accessToken: string
): Promise<void> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("id", videoId);

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    throw new YouTubeApiError(
      `Failed to delete video: ${res.status}`,
      res.status
    );
  }
}

// ── Get video status ────────────────────────────────────────

export async function getYouTubeVideoStatus(
  videoId: string,
  accessToken: string
): Promise<{ status: string; publishedAt?: string }> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("id", videoId);
  url.searchParams.set("part", "status,snippet");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new YouTubeApiError(`Failed to get video status: ${res.status}`, res.status);
  }

  const data = (await res.json()) as {
    items?: Array<{
      status: { uploadStatus: string; privacyStatus: string; publishAt?: string };
      snippet: { publishedAt?: string };
    }>;
  };

  const item = data.items?.[0];
  if (!item) {
    return { status: "not_found" };
  }

  return {
    status: item.status.uploadStatus,
    publishedAt: item.snippet.publishedAt,
  };
}
