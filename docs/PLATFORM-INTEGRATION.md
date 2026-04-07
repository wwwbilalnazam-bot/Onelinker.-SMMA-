# Platform Integration Guide

Complete developer guide for adding, modifying, or integrating social media platforms in Onelinker.

---

## Architecture Overview

```
lib/platforms/                    ← WHAT each platform supports (limits, validation, formats)
├── types.ts                      ← Shared interfaces (PlatformAdapter, PlatformLimits, etc.)
├── base.ts                       ← BasePlatformAdapter with shared validation logic
├── index.ts                      ← Registry — single entry point for all platform access
├── twitter.ts                    ← X (Twitter) adapter
├── instagram.ts                  ← Instagram adapter
├── facebook.ts                   ← Facebook adapter
├── tiktok.ts                     ← TikTok adapter
├── linkedin.ts                   ← LinkedIn adapter
├── youtube.ts                    ← YouTube adapter
├── threads.ts                    ← Threads adapter
├── bluesky.ts                    ← Bluesky adapter
├── pinterest.ts                  ← Pinterest adapter
└── google-business.ts            ← Google Business Profile adapter

lib/providers/                    ← HOW to connect and post (provider-agnostic)
├── types.ts                      ← SocialProvider interface (the contract)
├── index.ts                      ← Provider registry + platform→provider routing
├── outstand.ts                   ← Outstand provider (wraps lib/outstand/*)
└── direct-api.example.ts         ← Template for direct API providers

lib/outstand/                     ← Outstand-specific implementation (raw API calls)
├── client.ts                     ← Outstand API base client (HTTP, auth, mapping)
├── accounts.ts                   ← OAuth flow, account sync, disconnect
├── posts.ts                      ← Create/schedule/delete posts via Outstand
├── media.ts                      ← Upload media to Supabase + register with Outstand
└── analytics.ts                  ← Fetch post/account analytics

app/api/
├── accounts/
│   ├── connect/route.ts       ← Initiates OAuth (returns popup URL)
│   ├── sync/route.ts          ← Syncs accounts from Outstand → Supabase
│   └── [id]/route.ts          ← Disconnect account
├── posts/route.ts             ← Create/schedule posts
└── webhooks/outstand/route.ts ← Receives post.published, post.error, account.disconnected
```

### Key Principle: Separation of Concerns

| Layer | Responsibility | Files |
|-------|---------------|-------|
| **Platform Adapters** | Limits, validation, formatting, feature flags | `lib/platforms/*.ts` |
| **Providers** | OAuth, posting, analytics (provider-agnostic) | `lib/providers/*.ts` |
| **Outstand Client** | Outstand-specific raw API calls | `lib/outstand/*.ts` |
| **API Routes** | Auth, request handling, response formatting | `app/api/**/*.ts` |
| **UI Components** | Rendering, user interaction | `app/(dashboard)/**/*.tsx` |

**Rules:**
- Platform adapters NEVER call APIs — they only define limits and validate
- API routes NEVER import `lib/outstand/*` directly — they go through `lib/providers`
- Providers implement `SocialProvider` interface — swap without touching routes
- Each layer does one thing

### Data Flow

```
UI Component
    ↓ fetch("/api/posts", ...)
API Route (app/api/posts/route.ts)
    ↓ getProviderForPlatform("twitter")
Provider Registry (lib/providers/index.ts)
    ↓ resolves to OutstandProvider (or TwitterDirectProvider, etc.)
Provider (lib/providers/outstand.ts)
    ↓ calls lib/outstand/posts.ts
Raw API Client (lib/outstand/client.ts)
    ↓ HTTP to api.outstand.so
Platform
```

---

## How to Switch a Platform's Provider

The system supports per-platform provider routing. You can have Twitter on Outstand while Instagram uses Meta's official API.

### Example: Move Twitter from Outstand to Official API

**Step 1: Create the provider**

```typescript
// lib/providers/twitter-direct.ts
import type { SocialProvider } from "./types";

export class TwitterDirectProvider implements SocialProvider {
  readonly name = "twitter-direct";
  readonly supportedPlatforms = ["twitter"];

  // Implement all methods using Twitter API v2
  // See lib/providers/direct-api.example.ts for full template
}
```

**Step 2: Register and route**

```typescript
// lib/providers/index.ts

import { TwitterDirectProvider } from "./twitter-direct";

const PROVIDERS: Record<string, SocialProvider> = {
  outstand: new OutstandProvider(),
  "twitter-direct": new TwitterDirectProvider(),  // ← Add
};

const PLATFORM_PROVIDER_MAP: Record<string, string> = {
  twitter: "twitter-direct",    // ← Change from "outstand" to "twitter-direct"
  instagram: "outstand",        // stays on Outstand
  facebook: "outstand",         // stays on Outstand
  // ...
};
```

**Step 3: Done.** No API routes, UI components, or platform adapters need to change.

### Supported Provider Configurations

| Configuration | How |
|--------------|-----|
| All platforms via Outstand | Default — no changes needed |
| One platform via direct API | Change one entry in `PLATFORM_PROVIDER_MAP` |
| Mix of providers | Map each platform to its provider |
| Replace Outstand entirely | Create new provider, map all platforms to it |
| Use Buffer/Hootsuite instead | Implement `SocialProvider`, register, remap |

---

## How to Add a New Platform

### Step 1: Add to Platform Enum

**File: `types/index.ts`**

```typescript
export enum Platform {
  Twitter = "twitter",
  LinkedIn = "linkedin",
  // ... existing platforms ...
  Mastodon = "mastodon",  // ← Add your new platform
}
```

### Step 2: Create the Adapter

**File: `lib/platforms/mastodon.ts`**

```typescript
import { Platform } from "@/types";
import { BasePlatformAdapter, COMMON_IMAGE_TYPES, COMMON_VIDEO_TYPES } from "./base";
import type {
  PlatformLimits, PlatformFeatures, PlatformFormat,
  PlatformDisplay, HashtagGuidance
} from "./types";

export class MastodonAdapter extends BasePlatformAdapter {
  readonly platform = Platform.Mastodon;
  readonly outstandNetwork = "mastodon"; // or null if not supported by Outstand

  readonly display: PlatformDisplay = {
    name: "Mastodon",
    shortName: "Mastodon",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/15",
    dotColor: "bg-purple-500",
    description: "Decentralized social network",
    contentTypes: ["Posts", "Threads"],
  };

  readonly limits: PlatformLimits = {
    maxCharacters: 500,
    maxHashtags: 10,
    optimalHashtags: 5,
    maxImages: 4,
    maxVideoSizeMB: 40,
    maxImageSizeMB: 8,
    supportedImageTypes: COMMON_IMAGE_TYPES,
    supportedVideoTypes: COMMON_VIDEO_TYPES,
    maxVideoDurationSec: 300,
    maxTitleCharacters: 0,
  };

  readonly features: PlatformFeatures = {
    supportsVideo: true,
    supportsStories: false,
    supportsReels: false,
    supportsCarousel: true,
    supportsFirstComment: false,
    supportsScheduling: true,
    supportsHashtags: true,
    supportsMentions: true,
    supportsLinks: true,
    supportsEmoji: true,
    supportsTitle: false,
    supportsLocation: false,
  };

  readonly formats: PlatformFormat[] = [
    { id: "post", label: "Post", aspect: "16 / 9", size: "1600×900",
      description: "Standard toot", isVertical: false, icon: "post" },
  ];

  readonly hashtagGuidance: HashtagGuidance = {
    min: 2,
    max: 10,
    sweetSpot: 5,
    tips: "Mastodon relies heavily on hashtags for discovery. Use descriptive, specific tags.",
  };

  // Override if platform has special validation rules:
  // validateContent(content: string, title?: string) { ... }
  // formatContent(content: string) { ... }
}
```

### Step 3: Register in the Index

**File: `lib/platforms/index.ts`**

```typescript
import { MastodonAdapter } from "./mastodon";

const mastodon = new MastodonAdapter();

export const platforms: PlatformRegistry = {
  // ... existing platforms ...
  [Platform.Mastodon]: mastodon,
};
```

### Step 4: Add to Outstand Network Mapping (if supported)

**File: `lib/outstand/client.ts`**

```typescript
const PLATFORM_TO_OUTSTAND: Record<string, string> = {
  // ... existing mappings ...
  mastodon: "mastodon",
};

const OUTSTAND_TO_PLATFORM: Record<string, string> = {
  // ... existing mappings ...
  mastodon: "mastodon",
};
```

### Step 5: Add to Accounts Page UI

**File: `app/(dashboard)/accounts/page.tsx`**

Add to the `PLATFORM_CONFIG` array:

```typescript
{
  id: "mastodon",
  name: "Mastodon",
  icon: MastodonIcon,       // Create SVG icon component
  color: "bg-purple-500/8 text-purple-500",
  border: "border-purple-500/15",
  dot: "bg-purple-500",
  description: "Decentralized social network",
  contentTypes: ["Posts", "Threads"],
},
```

### Step 6: Add to Compose Page (Optional)

If the platform needs a custom preview in the compose page, add it to `app/(dashboard)/create/page.tsx`. Otherwise, the generic handling works automatically.

That's it. The platform is now:
- Validated by the adapter
- Connectable via OAuth (if Outstand supports it)
- Available in the compose page
- Tracked with proper limits

---

## Using the Platform Registry

### Import

```typescript
import { getPlatform, getAllPlatforms, validateForPlatforms } from "@/lib/platforms";
```

### Get a single platform

```typescript
const twitter = getPlatform("twitter");

twitter.limits.maxCharacters     // 280
twitter.limits.maxHashtags       // 2
twitter.features.supportsVideo   // true
twitter.features.supportsStories // false
twitter.display.name             // "X (Twitter)"
twitter.hashtagGuidance.tips     // "Use 1-2 highly relevant..."
```

### Validate content

```typescript
const result = twitter.validateContent("Hello world! #tech #ai #coding");
// { valid: false, errors: [{ field: "hashtags", message: "Too many hashtags: 3/2" }], warnings: [] }
```

### Validate for multiple platforms at once

```typescript
const results = validateForPlatforms(
  ["twitter", "instagram", "linkedin"],
  "My post content #tech"
);
// {
//   twitter:   { valid: true, errors: [], warnings: [] },
//   instagram: { valid: true, errors: [], warnings: [] },
//   linkedin:  { valid: true, errors: [], warnings: [] },
// }
```

### Format content for a platform

```typescript
const instagram = getPlatform("instagram");
const formatted = instagram.formatContent("Great post #tech #coding #dev");
// Separates hashtags from caption with line breaks
```

### Validate media

```typescript
const result = getPlatform("twitter").validateMedia({
  type: "image/png",
  size: 3 * 1024 * 1024,  // 3MB
});
// { valid: true, errors: [], warnings: [] }
```

### Get shortest character limit

```typescript
import { getShortestCharLimit } from "@/lib/platforms";

const limit = getShortestCharLimit(["twitter", "instagram", "linkedin"]);
// 280 (Twitter is the shortest)
```

---

## Platform Limits Reference

| Platform | Characters | Hashtags | Optimal # | Images | Video Max | Title |
|----------|-----------|----------|-----------|--------|-----------|-------|
| Twitter | 280 | 2 | 1 | 4 | 512MB | — |
| Instagram | 2,200 | 30 | 15 | 10 | 650MB | — |
| Facebook | 2,000 | 3 | 2 | 10 | 4GB | — |
| TikTok | 2,200 | 5 | 4 | 10 | 287MB | — |
| LinkedIn | 3,000 | 5 | 3 | 9 | 5GB | — |
| YouTube | 5,000 | 15 | 5 | 1 | 12GB | 100 chars |
| Threads | 500 | 5 | 3 | 10 | 100MB | — |
| Bluesky | 300 | 4 | 2 | 4 | 50MB | — |
| Pinterest | 500 | 20 | 8 | 1 | 2GB | 100 chars |
| Google Business | 1,500 | 0 | 0 | 1 | 75MB | — |

---

## Feature Support Matrix

| Feature | Twitter | Instagram | Facebook | TikTok | LinkedIn | YouTube | Threads | Bluesky | Pinterest | Google |
|---------|---------|-----------|----------|--------|----------|---------|---------|---------|-----------|--------|
| Video | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stories | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reels | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Carousel | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| First Comment | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Scheduling | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hashtags | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Links | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Title | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Location | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## OAuth Connection Flow

All platform connections go through Outstand as the intermediary:

```
User clicks "Connect"
        ↓
Frontend: POST /api/accounts/connect
  { platform, workspaceId, redirect_uri }
        ↓
Backend: lib/outstand/accounts.ts → initiateAccountConnect()
  POST outstand.so/v1/social-networks/{network}/auth-url
        ↓
Outstand returns OAuth URL → opens in popup
        ↓
User authorizes on platform (Twitter, Instagram, etc.)
        ↓
Platform redirects → /auth/social/callback?session=TOKEN
        ↓
Callback handler:
  1. GET /social-accounts/pending/{token}    → available pages
  2. POST /social-accounts/pending/{token}/finalize → connect
  3. syncAccountsToSupabase() → save to DB
        ↓
Popup closes → frontend refreshes account list
```

### For Platforms NOT Supported by Outstand

If adding a platform that Outstand doesn't support (like Google Business Profile):

1. Set `outstandNetwork = null` in the adapter
2. Create a direct OAuth flow:
   - `lib/direct/{platform}/auth.ts` — OAuth URL generation, token exchange
   - `lib/direct/{platform}/post.ts` — Direct API posting
   - `lib/direct/{platform}/media.ts` — Direct media upload
3. Add API routes: `app/api/direct/{platform}/...`
4. Update the connect handler to detect `outstandNetwork === null` and use the direct flow

---

## Posting Flow

```
User clicks "Publish" / "Schedule"
        ↓
Frontend: POST /api/posts
  { workspaceId, accountIds, content, channelContent?, scheduleMode, ... }
        ↓
API Route validates auth + plan limits
        ↓
For each platform group (per-channel content):
  1. Increment post usage counter (atomic RPC)
  2. Build Outstand payload:
     { containers: [{ content, media }], accounts: [outstandIds], schedule_at? }
  3. POST to Outstand /posts
  4. If fails → rollback counter
  5. Save to Supabase posts table
        ↓
Outstand publishes → sends webhook:
  POST /api/webhooks/outstand
  { type: "post.published", data: { post_id, ... } }
        ↓
Webhook handler updates Supabase post status
```

---

## Webhook Events

| Event | Trigger | Handler Action |
|-------|---------|---------------|
| `post.published` | Post goes live | Update status → "published", set published_at |
| `post.error` | Post fails | Update status → "failed", save error_message, notify owner |
| `account.disconnected` | Token revoked | Mark account inactive, notify owner |

---

## File Structure for Direct Integration (Non-Outstand)

If you bypass Outstand and integrate a platform directly:

```
lib/direct/
├── google-business/
│   ├── auth.ts       ← OAuth 2.0 flow (Google APIs)
│   ├── client.ts     ← Google Business API client
│   ├── post.ts       ← Create/schedule posts
│   ├── media.ts      ← Upload photos
│   └── types.ts      ← Google Business API types
├── mastodon/
│   ├── auth.ts       ← Instance-based OAuth
│   ├── client.ts     ← Mastodon API client
│   ├── post.ts       ← Create toots
│   └── types.ts      ← Mastodon API types
```

Each direct integration follows the same pattern:
1. **auth.ts** — Handles OAuth URL generation, token exchange, token refresh
2. **client.ts** — Base HTTP client with auth headers
3. **post.ts** — Create, schedule, delete posts
4. **media.ts** — Upload and manage media
5. **types.ts** — Platform-specific API response types

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OUTSTAND_API_KEY` | Yes | Shared Outstand API key for all workspaces |
| `OUTSTAND_WEBHOOK_SECRET` | Yes | HMAC secret for webhook signature verification |
| `OPENAI_API_KEY` | Yes | OpenAI key for AI caption/hashtag generation |

Enterprise workspaces can supply their own `outstand_api_key` (stored in `workspaces.outstand_api_key` column), which overrides the shared key.

---

## Testing a Platform Integration

### 1. Unit test the adapter

```typescript
import { getPlatform } from "@/lib/platforms";

const twitter = getPlatform("twitter");

// Test limits
expect(twitter.limits.maxCharacters).toBe(280);

// Test validation
const result = twitter.validateContent("a".repeat(300));
expect(result.valid).toBe(false);
expect(result.errors[0].field).toBe("content");

// Test hashtag extraction
expect(twitter.extractHashtags("Hello #world #test")).toEqual(["#world", "#test"]);

// Test media validation
const mediaResult = twitter.validateMedia({ type: "image/png", size: 1024 });
expect(mediaResult.valid).toBe(true);
```

### 2. Test OAuth flow

1. Go to `/accounts` page
2. Click the platform card
3. Verify popup opens with correct OAuth URL
4. Complete authorization
5. Verify account appears in the list
6. Check `social_accounts` table in Supabase

### 3. Test posting

1. Create a post targeting the new platform
2. Verify content validation (char limit, hashtag limit)
3. Publish and check Outstand dashboard
4. Verify webhook updates status in Supabase

---

## Common Patterns

### Reading limits in UI components

```typescript
import { getPlatform } from "@/lib/platforms";

// In a React component:
const platform = getPlatform(selectedPlatform);
const charLimit = platform.limits.maxCharacters;
const hashtagLimit = platform.limits.maxHashtags;
const supportsFirstComment = platform.features.supportsFirstComment;
```

### AI generation respecting limits

```typescript
import { getShortestCharLimit, getPlatform } from "@/lib/platforms";

// Generate captions that fit all selected platforms
const maxChars = getShortestCharLimit(selectedPlatforms);

// Get hashtag guidance for a specific platform
const guidance = getPlatform("instagram").hashtagGuidance;
// { min: 10, max: 30, sweetSpot: 15, tips: "Use a mix..." }
```

### Checking if a feature is supported

```typescript
const platform = getPlatform("twitter");

if (platform.features.supportsFirstComment) {
  // Show first comment input
}

if (platform.features.supportsTitle) {
  // Show title input (YouTube, Pinterest)
}

if (!platform.features.supportsLinks) {
  // Warn user: "Links are not clickable on Instagram"
}
```
