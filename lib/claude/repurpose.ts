import { runCompletion, trackAIUsage } from "./client";
import { PLATFORM_CHAR_LIMITS } from "@/lib/plans/limits";
import type { AiRepurposeRequest, AiRepurposeResponse, Platform } from "@/types";

// ════════════════════════════════════════════════════════════
// CONTENT REPURPOSER
// Adapts existing content from one platform to another,
// adjusting format, length, tone, and hashtag strategy.
// ════════════════════════════════════════════════════════════

interface PlatformProfile {
  name: string;
  format_tips: string;
  tone: string;
  char_limit: number;
}

const PLATFORM_PROFILES: Record<string, PlatformProfile> = {
  twitter: {
    name: "X (Twitter)",
    format_tips: "Short, punchy, conversational. Can use threads for long content. 1-2 hashtags max.",
    tone: "Direct, witty, opinionated",
    char_limit: 280,
  },
  linkedin: {
    name: "LinkedIn",
    format_tips: "Longer narrative posts perform well. Use line breaks for readability. Start with a hook. End with a question or CTA. 3-5 hashtags.",
    tone: "Professional but personable. Share insights and lessons learned.",
    char_limit: 3000,
  },
  instagram: {
    name: "Instagram",
    format_tips: "Strong opening line (visible before 'more'). Story-driven. Use emojis to break up text. 10-15 hashtags in post or first comment.",
    tone: "Visually descriptive, aspirational, authentic",
    char_limit: 2200,
  },
  tiktok: {
    name: "TikTok",
    format_tips: "This is a video platform — write a video script or caption. Hook in first 2 seconds. Use trending sounds/formats. 3-5 hashtags.",
    tone: "Energetic, entertaining, trend-aware, Gen-Z friendly",
    char_limit: 2200,
  },
  facebook: {
    name: "Facebook",
    format_tips: "Conversational, community-focused. Ask questions to drive comments. Can be longer. 1-3 hashtags optional.",
    tone: "Friendly, community-oriented, storytelling",
    char_limit: 2000,
  },
  threads: {
    name: "Threads",
    format_tips: "Short, conversational threads. Can do multi-post threads. Casual tone. 2-4 hashtags.",
    tone: "Casual, unfiltered, conversational",
    char_limit: 500,
  },
  bluesky: {
    name: "Bluesky",
    format_tips: "Similar to Twitter. Thoughtful, nuanced posts perform well. 2-3 hashtags.",
    tone: "Thoughtful, slightly more intellectual than Twitter",
    char_limit: 300,
  },
  youtube: {
    name: "YouTube",
    format_tips: "Write a video script or description. SEO-optimized title, description with timestamps, tags.",
    tone: "Engaging, educational, entertaining — 'edutainment'",
    char_limit: 5000,
  },
  pinterest: {
    name: "Pinterest",
    format_tips: "Keyword-rich descriptions. Inspirational and aspirational. Focus on benefits and outcomes.",
    tone: "Inspirational, aspirational, how-to focused",
    char_limit: 500,
  },
  google_business: {
    name: "Google Business",
    format_tips: "Local, informative, action-oriented. Include location context. Highlight offers/events.",
    tone: "Professional, local, helpful",
    char_limit: 1500,
  },
};

// ── Repurpose content for a new platform ─────────────────────

export async function repurposeContent(
  request: AiRepurposeRequest,
  workspaceId: string
): Promise<AiRepurposeResponse> {
  const sourceProfile = PLATFORM_PROFILES[request.source_platform];
  const targetProfile = PLATFORM_PROFILES[request.target_platform];
  const charLimit =
    PLATFORM_CHAR_LIMITS[request.target_platform as Platform] ??
    targetProfile?.char_limit ??
    500;

  if (!targetProfile) {
    throw new Error(`Unknown target platform: ${request.target_platform}`);
  }

  const systemPrompt = `You are a social media content strategist who specialises in cross-platform content adaptation.
Repurpose the given content from ${sourceProfile?.name ?? request.source_platform} to ${targetProfile.name}.

Target platform requirements:
- Format: ${targetProfile.format_tips}
- Tone: ${targetProfile.tone}
- Character limit: ${charLimit} characters

Rules:
- Preserve the core message and key information
- Completely reformat for the target platform's conventions
- Adjust length appropriately (do NOT just truncate)
- Add/remove emojis as appropriate for the platform
- Do NOT include hashtags (those are generated separately)
- Output ONLY the repurposed content — no preamble, no explanation
- Must be under ${charLimit} characters`;

  const result = await runCompletion({
    systemPrompt,
    userMessage: `Original ${sourceProfile?.name ?? request.source_platform} content:\n\n${request.content}`,
    maxTokens: Math.min(Math.ceil(charLimit / 3) + 200, 1500),
  });

  await trackAIUsage(workspaceId);

  let repurposed = result.content.trim();

  // Enforce character limit
  if (repurposed.length > charLimit) {
    repurposed = repurposed.slice(0, charLimit - 3) + "...";
  }

  return {
    content: repurposed,
    tokens_used: result.total_tokens,
  };
}

// ── Repurpose to multiple platforms at once ───────────────────

export interface MultiRepurposeRequest {
  content: string;
  source_platform: Platform;
  target_platforms: Platform[];
}

export interface MultiRepurposeResponse {
  results: Record<Platform, string>;
  tokens_used: number;
}

export async function repurposeToMultiplePlatforms(
  request: MultiRepurposeRequest,
  workspaceId: string
): Promise<MultiRepurposeResponse> {
  const results: Partial<Record<Platform, string>> = {};
  let totalTokens = 0;

  // Process platforms sequentially to avoid rate limit issues
  for (const platform of request.target_platforms) {
    if (platform === request.source_platform) {
      results[platform] = request.content;
      continue;
    }

    try {
      const res = await repurposeContent(
        {
          content: request.content,
          source_platform: request.source_platform,
          target_platform: platform,
        },
        workspaceId
      );
      results[platform] = res.content;
      totalTokens += res.tokens_used;
    } catch {
      // On failure, fall back to original content
      results[platform] = request.content;
    }
  }

  return {
    results: results as Record<Platform, string>,
    tokens_used: totalTokens,
  };
}

// ── Long-form to social snippet ───────────────────────────────

export interface LongFormToSocialRequest {
  long_form_content: string;
  content_type: "blog_post" | "article" | "newsletter" | "podcast_transcript" | "video_script";
  target_platform: Platform;
  angle?: "key_insight" | "quote" | "statistic" | "story" | "tip";
}

export interface LongFormToSocialResponse {
  snippet: string;
  source_quote?: string; // The part of the original that was used
  tokens_used: number;
}

export async function longFormToSocial(
  request: LongFormToSocialRequest,
  workspaceId: string
): Promise<LongFormToSocialResponse> {
  const targetProfile = PLATFORM_PROFILES[request.target_platform];
  const charLimit =
    PLATFORM_CHAR_LIMITS[request.target_platform as Platform] ??
    targetProfile?.char_limit ??
    500;

  const angleInstructions: Record<string, string> = {
    key_insight: "Extract the single most valuable insight and build a post around it",
    quote:       "Find the most quotable, shareable sentence and frame it as a quote post",
    statistic:   "Pull out a surprising or compelling stat and build context around it",
    story:       "Identify a mini-story or anecdote and adapt it into a narrative post",
    tip:         "Extract a practical, actionable tip and present it as a quick win",
  };

  const angleInstruction = request.angle
    ? angleInstructions[request.angle]
    : "Choose the most compelling angle for social media";

  const systemPrompt = `You are a content repurposing expert.
Extract and adapt content from a ${request.content_type} into a ${targetProfile?.name ?? request.target_platform} post.

${angleInstruction}.

Platform requirements:
- ${targetProfile?.format_tips ?? "Adapt appropriately"}
- Tone: ${targetProfile?.tone ?? "Engaging"}
- Character limit: ${charLimit}

Return ONLY a JSON object:
{
  "snippet": "The adapted social media post",
  "source_quote": "The exact sentence/passage from the original that inspired this (optional)"
}
No markdown fences. Just the JSON.`;

  // Truncate very long content for the prompt
  const truncated =
    request.long_form_content.length > 4000
      ? request.long_form_content.slice(0, 4000) + "..."
      : request.long_form_content;

  const result = await runCompletion({
    systemPrompt,
    userMessage: truncated,
    maxTokens: 600,
  });

  await trackAIUsage(workspaceId);

  // Parse JSON response
  let snippet = result.content.trim();
  let sourceQuote: string | undefined;

  try {
    const cleaned = snippet
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { snippet: string; source_quote?: string };
    snippet = parsed.snippet ?? snippet;
    sourceQuote = parsed.source_quote;
  } catch {
    // If JSON parse fails, use raw output as the snippet
  }

  // Enforce char limit
  if (snippet.length > charLimit) {
    snippet = snippet.slice(0, charLimit - 3) + "...";
  }

  return {
    snippet,
    source_quote: sourceQuote,
    tokens_used: result.total_tokens,
  };
}
