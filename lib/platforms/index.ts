// ════════════════════════════════════════════════════════════
// PLATFORM REGISTRY — Single Entry Point
//
// Usage:
//   import { platforms, getPlatform } from "@/lib/platforms";
//
//   const twitter = getPlatform("twitter");
//   twitter.limits.maxCharacters   // 280
//   twitter.limits.maxHashtags     // 2
//   twitter.validateContent(text)  // { valid, errors, warnings }
//
// To add a new platform:
//   1. Create lib/platforms/myplatform.ts (extend BasePlatformAdapter)
//   2. Import and register it below
//   3. Add to Platform enum in types/index.ts
//   4. Done — all UI and validation picks it up automatically
// ════════════════════════════════════════════════════════════

import { Platform } from "@/types";
import type { PlatformAdapter, PlatformRegistry } from "./types";

// ── Import all adapters ─────────────────────────────────────

import { TwitterAdapter } from "./twitter";
import { InstagramAdapter } from "./instagram";
import { FacebookAdapter } from "./facebook";
import { TikTokAdapter } from "./tiktok";
import { LinkedInAdapter } from "./linkedin";
import { YouTubeAdapter } from "./youtube";
import { ThreadsAdapter } from "./threads";
import { BlueskyAdapter } from "./bluesky";
import { PinterestAdapter } from "./pinterest";
import { GoogleBusinessAdapter } from "./google-business";

// ── Instantiate all adapters ────────────────────────────────

const twitter = new TwitterAdapter();
const instagram = new InstagramAdapter();
const facebook = new FacebookAdapter();
const tiktok = new TikTokAdapter();
const linkedin = new LinkedInAdapter();
const youtube = new YouTubeAdapter();
const threads = new ThreadsAdapter();
const bluesky = new BlueskyAdapter();
const pinterest = new PinterestAdapter();
const googleBusiness = new GoogleBusinessAdapter();

// ── Platform Registry ───────────────────────────────────────

export const platforms: PlatformRegistry = {
  [Platform.Twitter]: twitter,
  [Platform.Instagram]: instagram,
  [Platform.Facebook]: facebook,
  [Platform.TikTok]: tiktok,
  [Platform.LinkedIn]: linkedin,
  [Platform.YouTube]: youtube,
  [Platform.Threads]: threads,
  [Platform.Bluesky]: bluesky,
  [Platform.Pinterest]: pinterest,
  [Platform.GoogleBusiness]: googleBusiness,
};

// ── Helper functions ────────────────────────────────────────

/** Get a platform adapter by Platform enum or string ID */
export function getPlatform(id: Platform | string): PlatformAdapter {
  const adapter = platforms[id as Platform];
  if (!adapter) {
    throw new Error(`Unknown platform: ${id}. Available: ${Object.keys(platforms).join(", ")}`);
  }
  return adapter;
}

/** Get all platforms as an array */
export function getAllPlatforms(): PlatformAdapter[] {
  return Object.values(platforms);
}

/** Get only platforms supported by Outstand (have an outstandNetwork) */
export function getOutstandPlatforms(): PlatformAdapter[] {
  return getAllPlatforms().filter(p => p.outstandNetwork !== null);
}

/** Get platform by Outstand network name (e.g. "x" → Twitter) */
export function getPlatformByOutstandNetwork(network: string): PlatformAdapter | undefined {
  return getAllPlatforms().find(p => p.outstandNetwork === network);
}

/** Validate content for multiple platforms at once */
export function validateForPlatforms(
  platformIds: (Platform | string)[],
  content: string,
  title?: string
): Record<string, { valid: boolean; errors: string[]; warnings: string[] }> {
  const results: Record<string, { valid: boolean; errors: string[]; warnings: string[] }> = {};

  for (const id of platformIds) {
    const adapter = getPlatform(id);
    const result = adapter.validateContent(content, title);
    results[id] = {
      valid: result.valid,
      errors: result.errors.map(e => e.message),
      warnings: result.warnings.map(w => w.message),
    };
  }

  return results;
}

/** Get the shortest character limit across given platforms */
export function getShortestCharLimit(platformIds: (Platform | string)[]): number {
  if (platformIds.length === 0) return 280;
  return Math.min(...platformIds.map(id => getPlatform(id).limits.maxCharacters));
}

// ── Re-exports ──────────────────────────────────────────────

export type { PlatformAdapter, PlatformLimits, PlatformFeatures, PlatformFormat, PlatformDisplay, HashtagGuidance, ValidationResult, ValidationError } from "./types";
export { BasePlatformAdapter } from "./base";
