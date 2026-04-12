export interface YouTubeMetrics {
  views: number;
  likes: number;
  comments: number;
}

/**
 * Fetch YouTube video statistics.
 * Doc: https://developers.google.com/youtube/v3/docs/videos/list
 */
export async function fetchYouTubeVideoMetrics(
  videoId: string,
  accessToken: string
): Promise<YouTubeMetrics> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("id", videoId);
  url.searchParams.set("part", "statistics");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`YouTube API error: ${res.status}`);
    }

    const data = (await res.json()) as {
      items?: Array<{
        statistics: {
          viewCount: string;
          likeCount: string;
          commentCount: string;
        };
      }>;
    };

    const stats = data.items?.[0]?.statistics;
    if (!stats) {
      return { views: 0, likes: 0, comments: 0 };
    }

    return {
      views: Number(stats.viewCount || 0),
      likes: Number(stats.likeCount || 0),
      comments: Number(stats.commentCount || 0),
    };
  } catch (err) {
    console.error(`[youtube/analytics] Failed to fetch metrics for ${videoId}:`, err);
    return { views: 0, likes: 0, comments: 0 };
  }
}
