"use server";

import { runCompletion, parseNumberedList, trackAIUsage } from "./client";
import { PLATFORM_CHAR_LIMITS } from "@/lib/plans/limits";
import type {
  AiCaptionRequest,
  AiCaptionResponse,
  AiRewriteRequest,
  AiRewriteResponse,
  Platform,
  AiTone,
} from "@/types";

// ════════════════════════════════════════════════════════════
// CAPTION GENERATOR
// Generates 3 caption variations for a given topic/tone/platform.
// Also handles rewrite of existing captions.
// ════════════════════════════════════════════════════════════

const TONE_DESCRIPTIONS: Record<AiTone, string> = {
  professional:   "authoritative, polished, and business-appropriate",
  casual:         "friendly, conversational, and approachable",
  funny:          "witty, humorous, and entertaining — use wordplay or light jokes",
  viral:          "attention-grabbing, bold, and optimised for shares — use hooks",
  inspirational:  "uplifting, motivating, and emotionally resonant",
  educational:    "informative, clear, and value-driven — teach something useful",
};

const PLATFORM_CONTEXT: Record<string, string> = {
  twitter:         "X (Twitter). Keep it punchy. Can use threads. 280 char limit.",
  linkedin:        "LinkedIn. Professional audience. Longer thoughtful posts perform well.",
  instagram:       "Instagram. Visual-first. Strong first line before 'more'. Emojis welcome.",
  tiktok:          "TikTok. Energetic, trend-aware, Gen-Z friendly. Short hooks.",
  facebook:        "Facebook. Conversational and community-focused. Stories work well.",
  threads:         "Threads. Casual, conversational. Like Twitter but less formal.",
  bluesky:         "Bluesky. Like Twitter but for tech-savvy, thoughtful audiences.",
  youtube:         "YouTube description. SEO-friendly, include keywords, add timestamps.",
  pinterest:       "Pinterest. Descriptive, keyword-rich, inspiring.",
  google_business: "Google Business post. Local, informative, action-oriented.",
};

// ── Generate 3 caption variations ────────────────────────────

export async function generateCaptions(
  request: AiCaptionRequest,
  workspaceId: string
): Promise<AiCaptionResponse> {
  const charLimit =
    request.charLimit ??
    PLATFORM_CHAR_LIMITS[request.platform as Platform] ??
    280;

  const platformCtx = PLATFORM_CONTEXT[request.platform] ?? request.platform;
  const toneDesc = TONE_DESCRIPTIONS[request.tone];

  const systemPrompt = `You are an expert social media copywriter with 10+ years of experience creating viral content.
Your task: write 3 distinct caption variations for ${platformCtx}
Tone: ${toneDesc}.
Hard limit: each caption must be UNDER ${charLimit} characters.
Rules:
- Number each variation (1. 2. 3.)
- Each must be meaningfully different in approach, not just rephrased
- Include relevant emojis naturally (don't overdo it)
- No hashtags (those are generated separately)
- No preamble, no "Here are your captions:", just the numbered captions
- Never exceed the character limit`;

  const userMessage = [
    `Topic: ${request.topic}`,
    request.keywords ? `Keywords to include: ${request.keywords}` : null,
    `Platform: ${request.platform}`,
    `Tone: ${request.tone}`,
    `Character limit per caption: ${charLimit}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await runCompletion({
    systemPrompt,
    userMessage,
    maxTokens: 800,
  });

  await trackAIUsage(workspaceId);

  const variations = parseNumberedList(result.content);

  // Enforce char limit — truncate any that exceed
  const enforced = variations.map((v) =>
    v.length > charLimit ? v.slice(0, charLimit - 3) + "..." : v
  );

  return {
    variations: enforced.slice(0, 3),
    tokens_used: result.total_tokens,
  };
}

// ── Rewrite an existing caption ───────────────────────────────

export async function rewriteCaption(
  request: AiRewriteRequest,
  workspaceId: string
): Promise<AiRewriteResponse> {
  const charLimit = request.platform
    ? PLATFORM_CHAR_LIMITS[request.platform as Platform] ?? 280
    : request.content.length * 1.5;

  const toneDesc = TONE_DESCRIPTIONS[request.tone];
  const platformCtx = request.platform
    ? PLATFORM_CONTEXT[request.platform] ?? request.platform
    : "social media";

  const systemPrompt = `You are an expert social media copywriter.
Rewrite the given post caption in a ${toneDesc} tone for ${platformCtx}.
Rules:
- Keep the core message and key information intact
- Match approximately the same length as the original (±20%)
- Stay under ${Math.round(charLimit)} characters
- Include natural emojis where appropriate
- No hashtags
- No preamble — output ONLY the rewritten caption`;

  const result = await runCompletion({
    systemPrompt,
    userMessage: `Original caption:\n\n${request.content}`,
    maxTokens: 512,
  });

  await trackAIUsage(workspaceId);

  return {
    content: result.content.trim(),
    tokens_used: result.total_tokens,
  };
}

// ── Get best posting time suggestion ─────────────────────────

export interface BestTimeRequest {
  platform: Platform;
  industry?: string;
  timezone?: string;
  audience_location?: string;
}

export interface BestTimeResponse {
  suggestions: BestTimeSuggestion[];
  reasoning: string;
  tokens_used: number;
}

export interface BestTimeSuggestion {
  day: string;
  time: string;
  score: number; // 1-10
  reason: string;
}

export async function getBestPostingTimes(
  request: BestTimeRequest,
  workspaceId: string
): Promise<BestTimeResponse> {
  const systemPrompt = `You are a social media analytics expert with deep knowledge of optimal posting times.
Based on platform-specific research and industry data, suggest the best times to post.
Return ONLY a valid JSON object in this exact format:
{
  "suggestions": [
    {"day": "Tuesday", "time": "10:00 AM", "score": 9, "reason": "Peak engagement window for professional content"},
    {"day": "Wednesday", "time": "12:00 PM", "score": 8, "reason": "Lunch break scrolling peak"},
    {"day": "Thursday", "time": "6:00 PM", "score": 8, "reason": "After-work browsing peak"}
  ],
  "reasoning": "One sentence summary of the strategy"
}
Return ONLY the JSON — no markdown, no preamble.`;

  const userMessage = [
    `Platform: ${request.platform}`,
    request.industry ? `Industry: ${request.industry}` : null,
    request.timezone ? `Timezone: ${request.timezone}` : null,
    request.audience_location
      ? `Audience location: ${request.audience_location}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await runCompletion({
    systemPrompt,
    userMessage,
    maxTokens: 400,
  });

  await trackAIUsage(workspaceId);

  const parsed = parseJsonSafe<{ suggestions: BestTimeSuggestion[]; reasoning: string }>(
    result.content
  );

  return {
    suggestions: parsed?.suggestions ?? [],
    reasoning: parsed?.reasoning ?? "",
    tokens_used: result.total_tokens,
  };
}

// ── AI insights from analytics data ──────────────────────────

export interface InsightsRequest {
  analytics: {
    total_reach: number;
    engagement_rate: number;
    top_platform: string | null;
    posts_published: number;
    follower_growth: number;
    date_range: string;
  };
}

export interface InsightsResponse {
  insights: Array<{ title: string; description: string; action: string }>;
  tokens_used: number;
}

export async function generateInsights(
  request: InsightsRequest,
  workspaceId: string
): Promise<InsightsResponse> {
  const systemPrompt = `You are a social media strategy expert who analyzes performance data.
Analyze the given metrics and return ONLY a valid JSON array of 3 actionable insights:
[
  {
    "title": "Short insight title",
    "description": "1-2 sentence analysis of what the data shows",
    "action": "Specific, concrete next step to improve performance"
  }
]
Be specific and data-driven. Reference actual numbers. No generic advice.
Return ONLY the JSON array — no markdown, no preamble.`;

  const userMessage = `Analytics data (${request.analytics.date_range}):
- Total reach: ${request.analytics.total_reach.toLocaleString()}
- Engagement rate: ${request.analytics.engagement_rate}%
- Top performing platform: ${request.analytics.top_platform ?? "N/A"}
- Posts published: ${request.analytics.posts_published}
- Follower growth: ${request.analytics.follower_growth > 0 ? "+" : ""}${request.analytics.follower_growth}`;

  const result = await runCompletion({
    systemPrompt,
    userMessage,
    maxTokens: 600,
  });

  await trackAIUsage(workspaceId);

  const parsed = parseJsonSafe<
    Array<{ title: string; description: string; action: string }>
  >(result.content);

  return {
    insights: parsed ?? [],
    tokens_used: result.total_tokens,
  };
}

// ── YouTube title generator ───────────────────────────────────
// Generates a single punchy YouTube title (≤100 chars) from content.

export async function generateYoutubeTitle(
  description: string,
  workspaceId: string
): Promise<string> {
  const systemPrompt = `You are a YouTube title expert who writes viral, click-worthy titles.
Rules:
- Maximum 100 characters
- Title case (capitalize major words)
- Be specific and compelling — avoid vague or generic titles
- Create a curiosity gap or emotional hook when possible
- No quotation marks, no hashtags
- Return ONLY the title — nothing else, no explanation`;

  const userMessage = description.trim()
    ? `Write a YouTube Short title for this content:\n\n${description.slice(0, 600)}`
    : "Write a YouTube Short title for a short lifestyle/motivation video";

  const result = await runCompletion({ systemPrompt, userMessage, maxTokens: 60 });
  await trackAIUsage(workspaceId);
  return result.content.trim().replace(/^["']|["']$/g, "").slice(0, 100);
}

// ── Utility: safe JSON parse ──────────────────────────────────

function parseJsonSafe<T>(text: string): T | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    const jsonStr = arrayMatch?.[0] ?? objectMatch?.[0];
    if (jsonStr) {
      try {
        return JSON.parse(jsonStr) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
