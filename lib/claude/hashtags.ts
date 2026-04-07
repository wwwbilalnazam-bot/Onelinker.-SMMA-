import { runCompletion, trackAIUsage } from "./client";
import type { AiHashtagRequest, AiHashtagResponse, Platform } from "@/types";

// ════════════════════════════════════════════════════════════
// HASHTAG GENERATOR
// Generates platform-optimised hashtags for any post content.
// Mixes popular and niche tags for maximum reach + targeting.
// ════════════════════════════════════════════════════════════

// Optimal hashtag counts per platform (based on engagement research)
const HASHTAG_COUNTS: Record<string, { min: number; max: number; sweet_spot: number }> = {
  twitter:         { min: 1,  max: 2,  sweet_spot: 1  },
  linkedin:        { min: 3,  max: 5,  sweet_spot: 3  },
  instagram:       { min: 10, max: 30, sweet_spot: 15 },
  tiktok:          { min: 3,  max: 6,  sweet_spot: 4  },
  facebook:        { min: 0,  max: 3,  sweet_spot: 2  },
  threads:         { min: 1,  max: 5,  sweet_spot: 3  },
  bluesky:         { min: 0,  max: 4,  sweet_spot: 2  },
  youtube:         { min: 3,  max: 8,  sweet_spot: 5  },
  pinterest:       { min: 5,  max: 15, sweet_spot: 8  },
  google_business: { min: 0,  max: 0,  sweet_spot: 0  },
};

const PLATFORM_HASHTAG_GUIDANCE: Record<string, string> = {
  twitter:
    "Use 1-2 highly relevant hashtags only. Overhashing kills engagement on X.",
  linkedin:
    "Mix professional + industry hashtags. Avoid over-tagging — 3-5 is ideal.",
  instagram:
    "Use a mix: 3-5 very popular (1M+), 5-7 medium (100K-1M), 5-8 niche (<100K). Total 15-20 for best reach.",
  tiktok:
    "Include trending hashtags + niche ones. FYP tag if relevant. Keep it to 3-6.",
  facebook:
    "Hashtags have limited impact on Facebook. Use 1-3 only if clearly relevant.",
  threads:
    "Hashtags are emerging on Threads. Keep it to 2-4 relevant ones.",
  bluesky:
    "Hashtag culture is growing. Use 2-3 niche, relevant tags.",
  youtube:
    "Use in description for discoverability. Mix broad + specific topic tags.",
  pinterest:
    "Keyword-style hashtags work best. Include product/style/niche terms.",
  google_business:
    "Google Business posts don't use hashtags. Return empty array.",
};

// ── Generate hashtags ─────────────────────────────────────────

export async function generateHashtags(
  request: AiHashtagRequest,
  workspaceId: string
): Promise<AiHashtagResponse> {
  const counts = HASHTAG_COUNTS[request.platform] ?? { min: 5, max: 15, sweet_spot: 10 };
  const guidance = PLATFORM_HASHTAG_GUIDANCE[request.platform] ?? "";

  // Google Business doesn't use hashtags
  if (counts.sweet_spot === 0) {
    return { hashtags: [], tokens_used: 0 };
  }

  const systemPrompt = `You are a social media hashtag strategist with expertise in ${request.platform}.
Generate exactly ${counts.sweet_spot} hashtags optimised for ${request.platform}.
Platform guidance: ${guidance}

Rules:
- Output ONLY the hashtags, one per line, starting with #
- No explanations, no numbering, no categories
- Mix popularity levels: some broad, some niche
- Make them directly relevant to the post content
- Do NOT include generic spam tags like #follow #like #viral
- Ensure all hashtags are real and used on the platform
- Format: one hashtag per line, no commas`;

  const result = await runCompletion({
    systemPrompt,
    userMessage: `Post content:\n\n${request.content}`,
    maxTokens: 300,
  });

  await trackAIUsage(workspaceId);

  // Parse hashtags — accept both "#tag" and "tag" formats
  const hashtags = result.content
    .split("\n")
    .map((line) => {
      const cleaned = line.trim();
      if (!cleaned) return null;
      return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
    })
    .filter((h): h is string => h !== null && /^#[a-zA-Z0-9_]+$/.test(h))
    .slice(0, counts.max);

  return {
    hashtags,
    tokens_used: result.total_tokens,
  };
}

// ── Generate hashtag strategy for a campaign ─────────────────

export interface HashtagStrategyRequest {
  topic: string;
  industry: string;
  platform: Platform;
  goal: "reach" | "engagement" | "conversions" | "brand_awareness";
}

export interface HashtagStrategy {
  pillar_tags: string[];    // 2-3 branded/campaign tags
  discovery_tags: string[]; // broad reach tags
  niche_tags: string[];     // targeted, conversion-focused
  trending_tags: string[];  // currently trending (if applicable)
  total_count: number;
  tokens_used: number;
}

export async function generateHashtagStrategy(
  request: HashtagStrategyRequest,
  workspaceId: string
): Promise<HashtagStrategy> {
  const systemPrompt = `You are a social media hashtag strategist.
Create a structured hashtag strategy for a ${request.platform} campaign.
Return ONLY a valid JSON object in this exact format:
{
  "pillar_tags": ["#BrandedTag1", "#CampaignTag"],
  "discovery_tags": ["#BroadTopic1", "#BroadTopic2", "#BroadTopic3"],
  "niche_tags": ["#NicheTopic1", "#NicheTopic2", "#NicheTopic3", "#NicheTopic4", "#NicheTopic5"],
  "trending_tags": ["#TrendingTag1"]
}
Rules:
- All tags must start with #
- No spaces in hashtags
- Niche tags should have under 500K uses for better targeting
- Discovery tags should have 500K+ uses for reach
- No generic tags like #instagood #follow
Return ONLY the JSON — no markdown, no preamble.`;

  const userMessage = `Topic: ${request.topic}
Industry: ${request.industry}
Platform: ${request.platform}
Campaign goal: ${request.goal}`;

  const result = await runCompletion({
    systemPrompt,
    userMessage,
    maxTokens: 400,
  });

  await trackAIUsage(workspaceId);

  const parsed = parseHashtagStrategyJson(result.content);

  return {
    pillar_tags: parsed?.pillar_tags ?? [],
    discovery_tags: parsed?.discovery_tags ?? [],
    niche_tags: parsed?.niche_tags ?? [],
    trending_tags: parsed?.trending_tags ?? [],
    total_count:
      (parsed?.pillar_tags.length ?? 0) +
      (parsed?.discovery_tags.length ?? 0) +
      (parsed?.niche_tags.length ?? 0) +
      (parsed?.trending_tags.length ?? 0),
    tokens_used: result.total_tokens,
  };
}

// ── Utility ───────────────────────────────────────────────────

function parseHashtagStrategyJson(text: string): {
  pillar_tags: string[];
  discovery_tags: string[];
  niche_tags: string[];
  trending_tags: string[];
} | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
