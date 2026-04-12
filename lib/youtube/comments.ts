// ════════════════════════════════════════════════════════════
// YOUTUBE COMMENTS FETCHER
//
// Fetches top-level comments from YouTube videos
// using the YouTube Data API v3
// ════════════════════════════════════════════════════════════

import { youtubeGet, YouTubeApiError } from "./client";

export interface FetchedComment {
  externalId: string;       // platform's comment ID
  authorName: string;
  authorAvatar: string | null;
  content: string;
  receivedAt: string;       // ISO timestamp
}

/**
 * Fetch top-level comment threads from a YouTube video.
 *
 * @param videoId - YouTube video ID (e.g. "dQw4w9WgXcQ")
 * @param accessToken - User's OAuth access token with youtube.readonly scope
 * @param publishedAfter - Optional ISO timestamp; only fetch comments after this date
 * @param maxResults - Maximum number of comments to fetch (default 50, max 50)
 * @returns Array of FetchedComment objects
 */
export async function fetchYouTubeVideoComments(params: {
  videoId: string;
  accessToken: string;
  publishedAfter?: string;
  maxResults?: number;
}): Promise<FetchedComment[]> {
  const { videoId, accessToken, publishedAfter, maxResults = 50 } = params;

  const apiParams: Record<string, string | number> = {
    part: "snippet",
    videoId,
    order: "time",
    maxResults: Math.min(maxResults, 50),
  };

  if (publishedAfter) {
    apiParams.publishedAfter = publishedAfter;
  }

  try {
    const response = await youtubeGet<{
      items: Array<{
        snippet: {
          topLevelComment: {
            id: string;
            snippet: {
              authorDisplayName: string;
              authorProfileImageUrl: string;
              textDisplay: string;
              publishedAt: string;
            };
          };
          canReply: boolean;
          totalReplyCount: number;
          isPublic: boolean;
        };
      }>;
      pageInfo: { totalResults: number; resultsPerPage: number };
    }>("/commentThreads", apiParams, accessToken);

    return (response.items || []).map((thread) => {
      const comment = thread.snippet.topLevelComment;
      const snippet = comment.snippet;

      return {
        externalId: comment.id,
        authorName: snippet.authorDisplayName || "Unknown",
        authorAvatar: snippet.authorProfileImageUrl || null,
        content: snippet.textDisplay || "",
        receivedAt: snippet.publishedAt,
      };
    });
  } catch (error) {
    if (error instanceof YouTubeApiError) {
      console.error(`[youtube] Error fetching comments for video ${videoId}:`, error.message);
    } else {
      console.error(`[youtube] Unexpected error fetching comments:`, error);
    }
    return [];
  }
}
