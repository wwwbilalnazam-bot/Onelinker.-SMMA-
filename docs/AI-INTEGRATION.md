# Onelinker AI Integration Guide

> Complete technical reference for AI features. Use this document when switching providers, adding new AI capabilities, or onboarding new developers.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start — Switching AI Providers](#quick-start--switching-ai-providers)
3. [Core Client (`lib/claude/client.ts`)](#core-client)
4. [AI Modules](#ai-modules)
   - [Caption Generator](#caption-generator)
   - [Hashtag Generator](#hashtag-generator)
   - [Content Ideas](#content-ideas)
   - [Content Repurposer](#content-repurposer)
5. [API Routes](#api-routes)
6. [Type Definitions](#type-definitions)
7. [Platform Limits & Constants](#platform-limits--constants)
8. [Usage Tracking & Plan Limits](#usage-tracking--plan-limits)
9. [Environment Variables](#environment-variables)
10. [Adding a New AI Provider](#adding-a-new-ai-provider)
11. [Adding a New AI Feature](#adding-a-new-ai-feature)
12. [File Reference Map](#file-reference-map)

---

## Architecture Overview

```
Frontend (React)                    API Routes                     AI Layer
┌────────────────┐    POST /api/ai/*    ┌──────────────┐    ┌──────────────────┐
│ Create Page     │──────────────────────│ Route Handler │───│ lib/claude/*.ts   │
│ (client comp.)  │                     │ (auth + valid)│   │ (business logic)  │
└────────────────┘                     └──────────────┘    └────────┬─────────┘
                                                                    │
                                                           ┌────────▼─────────┐
                                                           │ client.ts         │
                                                           │ runCompletion()   │
                                                           │ (provider-agnostic│
                                                           │  interface)       │
                                                           └────────┬─────────┘
                                                                    │
                                                           ┌────────▼─────────┐
                                                           │ OpenAI SDK        │
                                                           │ (gpt-4o-mini)     │
                                                           └──────────────────┘
```

**Key Design Principle**: All AI modules (`caption.ts`, `hashtags.ts`, etc.) call a single function: `runCompletion()`. To switch providers, you only modify `client.ts`. Everything else stays the same.

---

## Quick Start — Switching AI Providers

To swap from OpenAI to any other provider (Anthropic, Google Gemini, Groq, Mistral, etc.), you only need to edit **one file**: `lib/claude/client.ts`.

### Step 1: Install the new SDK

```bash
npm install @anthropic-ai/sdk    # Anthropic Claude
npm install @google/generative-ai # Google Gemini
npm install groq-sdk              # Groq
npm install @mistralai/mistralai  # Mistral
```

### Step 2: Add API key to `.env.local`

```env
ANTHROPIC_API_KEY=sk-ant-...
# or
GOOGLE_AI_API_KEY=AIza...
# or
GROQ_API_KEY=gsk_...
```

### Step 3: Modify `lib/claude/client.ts`

Replace the `getOpenAIClient()` and `runCompletion()` functions. The interface must stay the same:

```typescript
// Input interface — DO NOT CHANGE
export interface ClaudeCompletionOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

// Output interface — DO NOT CHANGE
export interface ClaudeCompletionResult {
  content: string;        // The generated text
  input_tokens: number;   // Prompt tokens used
  output_tokens: number;  // Completion tokens used
  total_tokens: number;   // Total tokens (for billing/tracking)
}
```

**That's it.** All AI features (captions, hashtags, ideas, repurposing, YouTube titles) will automatically use the new provider.

---

## Core Client

**File**: `lib/claude/client.ts`

This is the single point of contact with the AI provider. All other modules call `runCompletion()`.

### Current Configuration (OpenAI)

| Setting | Value |
|---------|-------|
| Provider | OpenAI |
| Model | `gpt-4o-mini` |
| Max Tokens | 2048 (default) |
| Temperature | 0.7 (default) |
| SDK | `openai` npm package |
| Env Var | `OPENAI_API_KEY` |

### Exported Functions

#### `runCompletion(options)`

The core function all AI features use.

```typescript
const result = await runCompletion({
  systemPrompt: "You are an expert copywriter...",
  userMessage: "Write a caption about product launches",
  maxTokens: 800,       // optional, default 2048
  temperature: 0.7,     // optional, default 0.7
});

// result.content      → "🚀 We just launched..."
// result.total_tokens  → 245
```

#### `runStreamingCompletion(options, onChunk)`

Real-time streaming for progressive UI updates.

```typescript
const result = await runStreamingCompletion(
  { systemPrompt: "...", userMessage: "..." },
  (chunk) => process.stdout.write(chunk)  // each token as it arrives
);
```

#### `trackAIUsage(workspaceId)`

Increments the workspace AI usage counter in Supabase.

```typescript
await trackAIUsage("workspace-uuid");
// Calls: supabase.rpc("increment_ai_usage", { p_workspace_id, p_month })
```

#### `parseNumberedList(text)`

Parses numbered list responses into an array.

```typescript
parseNumberedList("1. First\n2. Second\n3. Third")
// → ["First", "Second", "Third"]
```

#### `parseJsonOutput<T>(text)`

Safely extracts JSON from AI responses (handles markdown code blocks, mixed text).

```typescript
parseJsonOutput<{ title: string }>('```json\n{"title": "Hello"}\n```')
// → { title: "Hello" }
```

#### `createSSEStream(generator)`

Builds a Server-Sent Events `ReadableStream` for streaming API routes.

```typescript
// In a route handler:
const stream = createSSEStream(async (send) => {
  await runStreamingCompletion(opts, send);
});
return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
```

---

## AI Modules

### Caption Generator

**File**: `lib/claude/caption.ts`

#### `generateCaptions(request, workspaceId)`

Generates 3 distinct caption variations.

```typescript
import { generateCaptions } from "@/lib/claude/caption";

const result = await generateCaptions({
  topic: "Launching our new scheduling tool",
  tone: "viral",               // professional | casual | funny | viral | inspirational | educational
  platform: "instagram",       // any Platform value
  keywords: "SaaS, productivity",  // optional
  charLimit: 2200,             // optional, auto-detected from platform
}, "workspace-id");

// result.variations → ["🔥 Stop posting...", "Your content...", "What if I told..."]
// result.tokens_used → 312
```

**Prompt Strategy**: System prompt defines the copywriter persona, tone, platform context, and hard char limit. User prompt provides topic + keywords. Output is numbered list (parsed by `parseNumberedList`).

#### `rewriteCaption(request, workspaceId)`

Rewrites existing content in a different tone.

```typescript
const result = await rewriteCaption({
  content: "We just launched our new product!",
  tone: "funny",
  platform: "twitter",  // optional
}, "workspace-id");

// result.content → "Plot twist: we actually built something people want 😂"
```

#### `generateYoutubeTitle(description, workspaceId)`

Single punchy YouTube title, max 100 characters.

```typescript
const title = await generateYoutubeTitle(
  "Tips for growing your Instagram following as a small business",
  "workspace-id"
);
// → "I Grew 10K Followers in 30 Days — Here's How"
```

#### `getBestPostingTimes(request, workspaceId)`

Suggests optimal posting times with confidence scores.

```typescript
const result = await getBestPostingTimes({
  platform: "linkedin",
  industry: "SaaS",
  timezone: "America/New_York",
  audience_location: "North America",
}, "workspace-id");

// result.suggestions → [
//   { day: "Tuesday", time: "10:00 AM", score: 9, reason: "Peak engagement..." },
//   ...
// ]
// result.reasoning → "LinkedIn professional audience peaks mid-morning..."
```

#### `generateInsights(request, workspaceId)`

Analyzes analytics data and returns actionable insights.

```typescript
const result = await generateInsights({
  analytics: {
    total_reach: 45000,
    engagement_rate: 3.2,
    top_platform: "instagram",
    posts_published: 28,
    follower_growth: 150,
    date_range: "March 2026",
  }
}, "workspace-id");

// result.insights → [
//   { title: "Instagram is your growth engine", description: "...", action: "..." },
//   ...
// ]
```

---

### Hashtag Generator

**File**: `lib/claude/hashtags.ts`

#### `generateHashtags(request, workspaceId)`

Platform-optimized hashtags with correct counts per platform.

```typescript
import { generateHashtags } from "@/lib/claude/hashtags";

const result = await generateHashtags({
  content: "5 tips to grow your Instagram following organically",
  platform: "instagram",
}, "workspace-id");

// result.hashtags → ["#InstagramGrowth", "#SocialMediaTips", "#OrganicReach", ...] (15 tags)
// result.tokens_used → 180
```

**Platform-Specific Counts** (sweet_spot):

| Platform | Tags | Guidance |
|----------|------|----------|
| Twitter/X | 1 | Overhashing kills engagement |
| LinkedIn | 3 | Professional + industry mix |
| Instagram | 15 | Mix popular (1M+), medium (100K-1M), niche (<100K) |
| TikTok | 4 | Trending + niche, include FYP if relevant |
| Facebook | 2 | Limited impact, only if clearly relevant |
| Threads | 3 | Emerging platform, keep it relevant |
| Bluesky | 2 | Growing hashtag culture, niche tags |
| YouTube | 5 | Description discoverability, broad + specific |
| Pinterest | 8 | Keyword-style, product/style/niche |
| Google Business | 0 | No hashtags (returns empty array) |

#### `generateHashtagStrategy(request, workspaceId)`

Structured campaign hashtag strategy.

```typescript
const strategy = await generateHashtagStrategy({
  topic: "Sustainable fashion",
  industry: "Fashion & Retail",
  platform: "instagram",
  goal: "engagement",  // reach | engagement | conversions | brand_awareness
}, "workspace-id");

// strategy.pillar_tags     → ["#SustainableFashion", "#EcoStyle"]
// strategy.discovery_tags  → ["#Fashion", "#OOTD", "#StyleInspo"]
// strategy.niche_tags      → ["#SlowFashionMovement", "#EthicalBrands", ...]
// strategy.trending_tags   → ["#ThriftFlip"]
// strategy.total_count     → 11
```

---

### Content Ideas

**File**: `lib/claude/ideas.ts`

#### `generateContentCalendar(request, workspaceId)`

7-day content calendar with platform rotation.

```typescript
import { generateContentCalendar } from "@/lib/claude/ideas";

const result = await generateContentCalendar({
  industry: "SaaS / Tech",
  topics: ["productivity", "remote work", "AI tools"],
  platforms: ["twitter", "linkedin", "instagram"],
}, "workspace-id");

// result.ideas → [
//   { day: 1, platform: "twitter", idea: "Thread: 5 AI tools...", suggested_time: "9:00 AM" },
//   { day: 2, platform: "linkedin", idea: "Carousel: Remote work stats...", suggested_time: "12:00 PM" },
//   ...7 items
// ]
```

#### `generateStandaloneIdeas(request, workspaceId)`

Individual post ideas with hooks, CTAs, and format suggestions.

```typescript
const result = await generateStandaloneIdeas({
  industry: "Fitness",
  platform: "instagram",
  topic: "Home workouts",        // optional
  content_type: "educational",   // optional
  count: 5,                      // optional, default 5
}, "workspace-id");

// result.ideas → [
//   {
//     hook: "Stop doing crunches for abs — here's why",
//     body_idea: "Explain planks vs crunches with demonstration",
//     cta: "Save this for your next workout!",
//     format: "reel",
//     estimated_reach: "high"
//   },
//   ...
// ]
```

#### `generateTrendingIdeas(request, workspaceId)`

Trending + evergreen content ideas with urgency levels.

```typescript
const result = await generateTrendingIdeas({
  industry: "Marketing",
  platform: "linkedin",
  current_events: "AI tools boom, layoff season",  // optional
}, "workspace-id");

// result.ideas → [
//   { topic: "AI replacing marketers?", angle: "Hot take", urgency: "post_today" },
//   { topic: "Evergreen SEO tips", angle: "Tutorial", urgency: "evergreen" },
//   ...
// ]
```

---

### Content Repurposer

**File**: `lib/claude/repurpose.ts`

#### `repurposeContent(request, workspaceId)`

Adapts content from one platform's format to another.

```typescript
import { repurposeContent } from "@/lib/claude/repurpose";

const result = await repurposeContent({
  content: "Long LinkedIn post about productivity...",
  source_platform: "linkedin",
  target_platform: "twitter",
}, "workspace-id");

// result.content → "Punchy 280-char tweet version"
```

#### `repurposeToMultiplePlatforms(request, workspaceId)`

Batch repurpose to multiple platforms at once.

```typescript
const result = await repurposeToMultiplePlatforms({
  content: "Original blog excerpt...",
  source_platform: "linkedin",
  target_platforms: ["twitter", "instagram", "threads"],
}, "workspace-id");

// result.results → {
//   twitter: "280-char version...",
//   instagram: "Story-driven version with emojis...",
//   threads: "Casual conversational version..."
// }
```

#### `longFormToSocial(request, workspaceId)`

Extract social media snippets from long-form content.

```typescript
const result = await longFormToSocial({
  long_form_content: "Full blog post text (up to 3000 chars used)...",
  content_type: "blog_post",  // blog_post | article | newsletter | podcast_transcript | video_script
  target_platform: "linkedin",
  angle: "key_insight",       // optional: key_insight | quote | statistic | story | tip
}, "workspace-id");

// result.snippet → "Here's what 500 marketers told us about AI..."
// result.source_quote → "The original paragraph this was derived from"
```

---

## API Routes

All routes require authentication (Supabase session cookie).

### `POST /api/ai/captions`

Generate 3 caption variations.

```json
// Request
{
  "topic": "Product launch announcement",
  "tone": "viral",
  "platform": "instagram",
  "keywords": "SaaS, free trial",
  "workspaceId": "uuid"
}

// Response 200
{
  "data": {
    "variations": ["Caption 1...", "Caption 2...", "Caption 3..."],
    "tokens_used": 312
  }
}
```

### `POST /api/ai/hashtags`

Generate platform-optimized hashtags.

```json
// Request
{
  "content": "Your post content here...",
  "platform": "instagram",
  "workspaceId": "uuid"
}

// Response 200
{
  "data": {
    "hashtags": ["#GrowthHacking", "#SocialMedia", ...],
    "tokens_used": 180
  }
}
```

### `POST /api/ai/rewrite`

Rewrite content in a different tone.

```json
// Request
{
  "content": "Original caption text...",
  "tone": "funny",
  "platform": "twitter",
  "workspaceId": "uuid"
}

// Response 200
{
  "data": {
    "content": "Rewritten caption...",
    "tokens_used": 156
  }
}
```

### `POST /api/ai/youtube-title`

Generate a YouTube title.

```json
// Request
{
  "content": "Video description or post content...",
  "workspaceId": "uuid"
}

// Response 200
{
  "data": {
    "title": "How I Built a Million-Dollar Brand in 60 Seconds"
  }
}
```

---

## Type Definitions

**File**: `types/index.ts`

```typescript
// ── Enums ──

export enum AiTone {
  Professional = "professional",
  Casual = "casual",
  Funny = "funny",
  Viral = "viral",
  Inspirational = "inspirational",
  Educational = "educational",
}

export enum Platform {
  Twitter = "twitter",
  LinkedIn = "linkedin",
  Instagram = "instagram",
  TikTok = "tiktok",
  Facebook = "facebook",
  Threads = "threads",
  Bluesky = "bluesky",
  YouTube = "youtube",
  Pinterest = "pinterest",
  GoogleBusiness = "google_business",
}

// ── Request/Response Types ──

interface AiCaptionRequest {
  topic: string;
  tone: AiTone;
  platform: Platform;
  keywords?: string;
  charLimit?: number;
}

interface AiCaptionResponse {
  variations: string[];
  tokens_used: number;
}

interface AiHashtagRequest {
  content: string;
  platform: Platform;
}

interface AiHashtagResponse {
  hashtags: string[];
  tokens_used: number;
}

interface AiRewriteRequest {
  content: string;
  tone: AiTone;
  platform?: Platform;
}

interface AiRewriteResponse {
  content: string;
  tokens_used: number;
}

interface AiRepurposeRequest {
  content: string;
  source_platform: Platform;
  target_platform: Platform;
}

interface AiRepurposeResponse {
  content: string;
  tokens_used: number;
}

interface AiIdeasRequest {
  industry: string;
  topics: string[];
  platforms: Platform[];
}

interface AiIdeasResponse {
  ideas: AiContentIdea[];
  tokens_used: number;
}

interface AiContentIdea {
  day: number;
  platform: Platform;
  idea: string;
  suggested_time: string;
}
```

---

## Platform Limits & Constants

**File**: `lib/plans/limits.ts`

### Character Limits (Hard)

| Platform | Char Limit |
|----------|-----------|
| Twitter/X | 280 |
| LinkedIn | 3,000 |
| Instagram | 2,200 |
| TikTok | 2,200 |
| Facebook | 63,206 |
| Threads | 500 |
| Bluesky | 300 |
| YouTube | 5,000 |
| Pinterest | 500 |
| Google Business | 1,500 |

These are enforced in:
- Caption generation prompts (AI respects char limit)
- Post-generation truncation (safety fallback)
- Content editor UI (visual progress bars + warnings)
- Rewrite/repurpose functions

### Hashtag Counts

| Platform | Min | Sweet Spot | Max |
|----------|-----|-----------|-----|
| Twitter/X | 1 | 1 | 2 |
| LinkedIn | 3 | 3 | 5 |
| Instagram | 10 | 15 | 30 |
| TikTok | 3 | 4 | 6 |
| Facebook | 0 | 2 | 3 |
| Threads | 1 | 3 | 5 |
| Bluesky | 0 | 2 | 4 |
| YouTube | 3 | 5 | 8 |
| Pinterest | 5 | 8 | 15 |
| Google Business | 0 | 0 | 0 |

---

## Usage Tracking & Plan Limits

Every AI call increments the workspace's monthly AI usage counter via Supabase RPC:

```sql
-- Called by trackAIUsage()
SELECT increment_ai_usage(p_workspace_id, p_month);
-- p_month format: "2026-03" (YYYY-MM)
```

### Plan Limits

| Plan | AI Generations/Month | Posts/Month | Channels |
|------|---------------------|-------------|----------|
| Free | 3 | 20 | 3 |
| Creator | 200 | 500 | Unlimited |
| Agency | Unlimited | 2,000 | Unlimited |
| Enterprise | Unlimited | Unlimited | Unlimited |

### Usage Thresholds

| Level | Threshold | UI Behavior |
|-------|-----------|-------------|
| Safe | < 75% | Normal |
| Warning | 75-89% | Yellow warning badge |
| Critical | 90-99% | Red warning + notification |
| Blocked | 100% | AI features disabled |

---

## Environment Variables

```env
# ── Required for AI ──
OPENAI_API_KEY=sk-proj-...           # Current provider (OpenAI)

# ── Available but unused ──
ANTHROPIC_API_KEY=sk-ant-...         # If switching to Claude

# ── Add these for other providers ──
# GOOGLE_AI_API_KEY=AIza...          # Google Gemini
# GROQ_API_KEY=gsk_...              # Groq
# MISTRAL_API_KEY=...               # Mistral
# TOGETHER_API_KEY=...              # Together AI
# FIREWORKS_API_KEY=...             # Fireworks AI
```

---

## Adding a New AI Provider

### Example: Switching to Anthropic Claude

Edit `lib/claude/client.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";

export const AI_MODEL = "claude-sonnet-4-20250514";
export const AI_MAX_TOKENS = 2048;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  client = new Anthropic({ apiKey });
  return client;
}

export async function runCompletion(
  options: ClaudeCompletionOptions
): Promise<ClaudeCompletionResult> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: options.maxTokens ?? AI_MAX_TOKENS,
    system: options.systemPrompt,
    messages: [{ role: "user", content: options.userMessage }],
  });
  const content = message.content[0]?.type === "text" ? message.content[0].text : "";
  return {
    content,
    input_tokens: message.usage.input_tokens,
    output_tokens: message.usage.output_tokens,
    total_tokens: message.usage.input_tokens + message.usage.output_tokens,
  };
}
```

### Example: Switching to Google Gemini

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

export const AI_MODEL = "gemini-1.5-flash";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (client) return client;
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
  client = new GoogleGenerativeAI(apiKey);
  return client;
}

export async function runCompletion(
  options: ClaudeCompletionOptions
): Promise<ClaudeCompletionResult> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: AI_MODEL,
    systemInstruction: options.systemPrompt,
  });
  const result = await model.generateContent(options.userMessage);
  const response = result.response;
  const content = response.text();
  const usage = response.usageMetadata;
  return {
    content,
    input_tokens: usage?.promptTokenCount ?? 0,
    output_tokens: usage?.candidatesTokenCount ?? 0,
    total_tokens: usage?.totalTokenCount ?? 0,
  };
}
```

### Example: Switching to Groq (Llama / Mixtral)

```typescript
import Groq from "groq-sdk";

export const AI_MODEL = "llama-3.1-70b-versatile";

let client: Groq | null = null;

function getClient(): Groq {
  if (client) return client;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  client = new Groq({ apiKey });
  return client;
}

export async function runCompletion(
  options: ClaudeCompletionOptions
): Promise<ClaudeCompletionResult> {
  const groq = getClient();
  const response = await groq.chat.completions.create({
    model: AI_MODEL,
    max_tokens: options.maxTokens ?? 2048,
    temperature: options.temperature ?? 0.7,
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userMessage },
    ],
  });
  const content = response.choices[0]?.message?.content ?? "";
  return {
    content,
    input_tokens: response.usage?.prompt_tokens ?? 0,
    output_tokens: response.usage?.completion_tokens ?? 0,
    total_tokens: response.usage?.total_tokens ?? 0,
  };
}
```

---

## Adding a New AI Feature

Follow this pattern to add any new AI capability:

### Step 1: Create the function in `lib/claude/`

```typescript
// lib/claude/my-feature.ts
import { runCompletion, trackAIUsage } from "./client";

export async function generateMyFeature(
  request: { input: string; option: string },
  workspaceId: string
): Promise<{ output: string; tokens_used: number }> {
  const systemPrompt = `You are an expert at...`;
  const userMessage = `Input: ${request.input}\nOption: ${request.option}`;

  const result = await runCompletion({ systemPrompt, userMessage, maxTokens: 500 });
  await trackAIUsage(workspaceId);  // Always track usage

  return {
    output: result.content.trim(),
    tokens_used: result.total_tokens,
  };
}
```

### Step 2: Create the API route

```typescript
// app/api/ai/my-feature/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMyFeature } from "@/lib/claude/my-feature";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    // Validate required fields...

    const result = await generateMyFeature(body, body.workspaceId);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### Step 3: Add to middleware (if needed)

```typescript
// middleware.ts — PROTECTED_API_PREFIXES
"/api/ai/my-feature",
```

### Step 4: Call from frontend

```typescript
const res = await fetch("/api/ai/my-feature", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ input: "...", option: "...", workspaceId }),
});
const json = await res.json();
if (res.ok) {
  // Use json.data.output
}
```

---

## File Reference Map

```
lib/claude/
├── client.ts          ← AI provider connection (EDIT THIS to switch providers)
│   ├── getOpenAIClient()
│   ├── runCompletion()         ← All modules call this
│   ├── runStreamingCompletion()
│   ├── trackAIUsage()
│   ├── parseNumberedList()
│   ├── parseJsonOutput()
│   └── createSSEStream()
│
├── caption.ts         ← Caption generation, rewrite, YouTube titles, best times, insights
│   ├── generateCaptions()
│   ├── rewriteCaption()
│   ├── generateYoutubeTitle()
│   ├── getBestPostingTimes()
│   └── generateInsights()
│
├── hashtags.ts        ← Hashtag generation and strategy
│   ├── generateHashtags()
│   └── generateHashtagStrategy()
│
├── ideas.ts           ← Content ideas and calendar
│   ├── generateContentCalendar()
│   ├── generateStandaloneIdeas()
│   └── generateTrendingIdeas()
│
└── repurpose.ts       ← Cross-platform content adaptation
    ├── repurposeContent()
    ├── repurposeToMultiplePlatforms()
    └── longFormToSocial()

app/api/ai/
├── captions/route.ts       POST → generateCaptions()
├── hashtags/route.ts       POST → generateHashtags()
├── rewrite/route.ts        POST → rewriteCaption()
└── youtube-title/route.ts  POST → generateYoutubeTitle()

types/index.ts              ← AiTone, Platform, all request/response interfaces
lib/plans/limits.ts         ← PLATFORM_CHAR_LIMITS, AI usage limits, plan gates
```

### Files That Consume AI

| File | Functions Used |
|------|---------------|
| `app/(dashboard)/create/page.tsx` | Calls `/api/ai/*` routes from UI |
| `components/onboarding/StepFirstPost.tsx` | `generateCaptions()` directly (server action) |
| `app/api/ai/captions/route.ts` | `generateCaptions()` |
| `app/api/ai/hashtags/route.ts` | `generateHashtags()` |
| `app/api/ai/rewrite/route.ts` | `rewriteCaption()` |
| `app/api/ai/youtube-title/route.ts` | `generateYoutubeTitle()` |

### Unused but Available (Not Yet Wired to UI)

These functions exist and work but have no API route or UI yet:

| Function | File | Purpose |
|----------|------|---------|
| `getBestPostingTimes()` | caption.ts | Suggest optimal posting times |
| `generateInsights()` | caption.ts | Analyze analytics data |
| `generateHashtagStrategy()` | hashtags.ts | Campaign hashtag strategy |
| `generateContentCalendar()` | ideas.ts | 7-day content calendar |
| `generateStandaloneIdeas()` | ideas.ts | Individual post ideas |
| `generateTrendingIdeas()` | ideas.ts | Trending content ideas |
| `repurposeContent()` | repurpose.ts | Cross-platform adaptation |
| `repurposeToMultiplePlatforms()` | repurpose.ts | Batch repurpose |
| `longFormToSocial()` | repurpose.ts | Blog→social snippets |
| `runStreamingCompletion()` | client.ts | Real-time streaming |

---

*Last updated: March 2026*
*Current provider: OpenAI (gpt-4o-mini)*
