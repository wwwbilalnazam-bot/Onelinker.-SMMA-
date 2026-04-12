import { graphGet } from "./client";

export interface MetaMetrics {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  clicks: number;
}

/**
 * Fetch Facebook post insights.
 * Doc: https://developers.facebook.com/docs/graph-api/reference/v21.0/insights
 */
export async function fetchFacebookPostMetrics(
  pagePostId: string,
  pageAccessToken: string
): Promise<MetaMetrics> {
  // We use post_impressions_unique as proxy for reach
  const metrics = [
    "post_reactions_by_type_total",
    "post_impressions",
    "post_impressions_unique",
    "post_clicks"
  ];

  try {
    const res = await graphGet<{ data: Array<{ name: string; values: Array<{ value: any }> }> }>(
      `/${pagePostId}/insights`,
      { metric: metrics.join(",") },
      pageAccessToken
    );

    const getMetric = (name: string) => {
      const item = res.data.find(d => d.name === name);
      return item?.values[0]?.value ?? 0;
    };

    // post_reactions_by_type_total is an object { like: X, love: Y, ... }
    const reactions = getMetric("post_reactions_by_type_total");
    const likes = typeof reactions === "object" ? Object.values(reactions).reduce((a: any, b: any) => a + b, 0) : 0;

    return {
      likes: Number(likes),
      comments: 0, // Not in insights, usually fetched via /{post-id}?fields=comments.summary(true)
      shares: 0,   // Not in insights, usually fetched via /{post-id}?fields=shares
      reach: Number(getMetric("post_impressions_unique")),
      impressions: Number(getMetric("post_impressions")),
      clicks: Number(getMetric("post_clicks")),
    };
  } catch (err) {
    console.error(`[meta/analytics] Failed to fetch FB insights for ${pagePostId}:`, err);
    return { likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0, clicks: 0 };
  }
}

/**
 * Fetch Instagram media insights.
 * Doc: https://developers.facebook.com/docs/instagram-api/reference/ig-media/insights
 */
export async function fetchInstagramMediaMetrics(
  igMediaId: string,
  pageAccessToken: string
): Promise<MetaMetrics> {
  // Metrics vary by media type (image vs video vs reel)
  // For simplicity, we fetch common ones.
  const metrics = [
    "impressions",
    "reach",
    "engagement",
    "saved"
  ];

  try {
    const res = await graphGet<{ data: Array<{ name: string; values: Array<{ value: any }> }> }>(
      `/${igMediaId}/insights`,
      { metric: metrics.join(",") },
      pageAccessToken
    );

    const getMetric = (name: string) => {
      const item = res.data.find(d => d.name === name);
      return item?.values[0]?.value ?? 0;
    };

    // We also need likes and comments which are on the media object itself, not in insights
    const mediaRes = await graphGet<{ like_count: number; comments_count: number }>(
      `/${igMediaId}`,
      { fields: "like_count,comments_count" },
      pageAccessToken
    );

    return {
      likes: mediaRes.like_count ?? 0,
      comments: mediaRes.comments_count ?? 0,
      shares: 0,
      reach: Number(getMetric("reach")),
      impressions: Number(getMetric("impressions")),
      clicks: 0,
    };
  } catch (err) {
    console.error(`[meta/analytics] Failed to fetch IG insights for ${igMediaId}:`, err);
    return { likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0, clicks: 0 };
  }
}
