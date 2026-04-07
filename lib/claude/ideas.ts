import { runCompletion, parseJsonOutput, trackAIUsage } from "./client";
import type {
  AiIdeasRequest,
  AiIdeasResponse,
  AiContentIdea,
  Platform,
} from "@/types";

// ════════════════════════════════════════════════════════════
// CONTENT IDEAS GENERATOR
// Produces a 7-day content calendar and standalone ideas.
// Output is structured JSON for direct use in the scheduler.
// ════════════════════════════════════════════════════════════

const DAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday",
];

// Best posting times by platform (fallback if no analytics data)
const DEFAULT_POSTING_TIMES: Record<string, string[]> = {
  twitter:   ["9:00 AM", "12:00 PM", "5:00 PM", "8:00 PM"],
  linkedin:  ["8:00 AM", "12:00 PM", "5:00 PM"],
  instagram: ["11:00 AM", "1:00 PM", "7:00 PM"],
  tiktok:    ["7:00 AM", "11:00 AM", "7:00 PM", "9:00 PM"],
  facebook:  ["9:00 AM", "1:00 PM", "3:00 PM"],
  threads:   ["9:00 AM", "12:00 PM", "7:00 PM"],
  bluesky:   ["8:00 AM", "12:00 PM", "5:00 PM"],
  youtube:   ["3:00 PM", "5:00 PM", "8:00 PM"],
  pinterest: ["8:00 PM", "9:00 PM"],
  google_business: ["9:00 AM"],
};

// ── Generate 7-day content calendar ──────────────────────────

export async function generateContentCalendar(
  request: AiIdeasRequest,
  workspaceId: string
): Promise<AiIdeasResponse> {
  const platformList = request.platforms.join(", ");
  const topicList = request.topics.join(", ");

  const systemPrompt = `You are a social media content strategist with expertise in building content calendars.
Create a 7-day social media content calendar.
Return ONLY a valid JSON array — no markdown fences, no explanation, no preamble.
Format exactly:
[
  {
    "day": 1,
    "platform": "instagram",
    "idea": "Detailed idea: what to post, what angle to take, what CTA to include",
    "suggested_time": "11:00 AM"
  }
]

Rules:
- Exactly 7 items, one per day (days 1-7 = Monday-Sunday)
- Rotate across the provided platforms
- Each idea must be specific and actionable — not generic ("Post a photo" is bad; "Share a before/after showing your process of X" is good)
- Vary content types: educational, behind-the-scenes, promotional, entertaining, UGC, Q&A, storytelling
- Include realistic suggested posting times for each platform
- Make ideas directly relevant to the industry and topics provided
- Each idea string: 30-80 words
Return ONLY the JSON array.`;

  const userMessage = `Industry: ${request.industry}
Topics to cover: ${topicList}
Platforms: ${platformList}
Days: Monday through Sunday`;

  const result = await runCompletion({
    systemPrompt,
    userMessage,
    maxTokens: 1500,
  });

  await trackAIUsage(workspaceId);

  const parsed = parseJsonOutput<AiContentIdea[]>(result.content);

  // Validate and fill defaults
  const ideas: AiContentIdea[] = (parsed ?? [])
    .slice(0, 7)
    .map((item, i) => ({
      day: item.day ?? i + 1,
      platform: (item.platform as Platform) ?? request.platforms[0] ?? "instagram" as Platform,
      idea: item.idea ?? "",
      suggested_time:
        item.suggested_time ??
        (DEFAULT_POSTING_TIMES[item.platform]?.[0] ?? "12:00 PM"),
    }))
    .filter((item) => item.idea.length > 0);

  return {
    ideas,
    tokens_used: result.total_tokens,
  };
}

// ── Generate standalone content ideas (no calendar) ──────────

export interface StandaloneIdeasRequest {
  industry: string;
  platform: Platform;
  topic?: string;
  content_type?: "educational" | "entertaining" | "promotional" | "engagement" | "any";
  count?: number;
}

export interface StandaloneIdea {
  hook: string;        // First line / attention grabber
  body_idea: string;   // What the post body should cover
  cta: string;         // Call to action
  format: string;      // Post format: carousel, video, image, text
  estimated_reach: "low" | "medium" | "high";
}

export interface StandaloneIdeasResponse {
  ideas: StandaloneIdea[];
  tokens_used: number;
}

export async function generateStandaloneIdeas(
  request: StandaloneIdeasRequest,
  workspaceId: string
): Promise<StandaloneIdeasResponse> {
  const count = request.count ?? 5;

  const systemPrompt = `You are a viral social media content strategist.
Generate ${count} content ideas for ${request.platform}.
Return ONLY a valid JSON array:
[
  {
    "hook": "Attention-grabbing opening line or question",
    "body_idea": "What the post body should cover in 1-2 sentences",
    "cta": "Specific call to action (comment, save, share, DM, link in bio)",
    "format": "carousel|video|image|text|reel",
    "estimated_reach": "low|medium|high"
  }
]
Rules:
- Hooks must be scroll-stopping — ask a question, make a bold claim, or share a surprising fact
- Each idea must be unique and non-generic
- Match the platform's content style
- Vary the formats
Return ONLY the JSON array.`;

  const userMessage = [
    `Industry: ${request.industry}`,
    `Platform: ${request.platform}`,
    request.topic ? `Topic focus: ${request.topic}` : null,
    request.content_type && request.content_type !== "any"
      ? `Content type: ${request.content_type}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await runCompletion({
    systemPrompt,
    userMessage,
    maxTokens: 1000,
  });

  await trackAIUsage(workspaceId);

  const parsed = parseJsonOutput<StandaloneIdea[]>(result.content);

  return {
    ideas: (parsed ?? []).slice(0, count),
    tokens_used: result.total_tokens,
  };
}

// ── Generate trending topic ideas ────────────────────────────

export interface TrendingIdeasRequest {
  industry: string;
  platform: Platform;
  current_events?: string; // optional context about what's trending
}

export interface TrendingIdeasResponse {
  ideas: Array<{
    topic: string;
    angle: string;
    urgency: "post_today" | "post_this_week" | "evergreen";
  }>;
  tokens_used: number;
}

export async function generateTrendingIdeas(
  request: TrendingIdeasRequest,
  workspaceId: string
): Promise<TrendingIdeasResponse> {
  const systemPrompt = `You are a social media trend analyst.
Generate 5 content ideas that tie into current trends or evergreen formats that perform well.
Return ONLY a valid JSON array:
[
  {
    "topic": "Specific topic or trend to tap into",
    "angle": "The unique angle or perspective to take on this topic",
    "urgency": "post_today|post_this_week|evergreen"
  }
]
Rules:
- Mix trending (timely) and evergreen ideas
- Be specific to the industry
- Each angle must be genuinely differentiated from generic takes
Return ONLY the JSON array.`;

  const userMessage = [
    `Industry: ${request.industry}`,
    `Platform: ${request.platform}`,
    request.current_events ? `Current context: ${request.current_events}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await runCompletion({
    systemPrompt,
    userMessage,
    maxTokens: 600,
  });

  await trackAIUsage(workspaceId);

  const parsed = parseJsonOutput<TrendingIdeasResponse["ideas"]>(result.content);

  return {
    ideas: parsed ?? [],
    tokens_used: result.total_tokens,
  };
}

// ── Utility: day number to name ───────────────────────────────

export function dayNumberToName(day: number): string {
  return DAY_NAMES[(day - 1) % 7] ?? "Monday";
}
