// ════════════════════════════════════════════════════════════
// PLATFORM INTEGRATION — SHARED TYPES
//
// Every platform adapter implements these interfaces.
// This is the contract — change it here, all adapters update.
// ════════════════════════════════════════════════════════════

import { Platform } from "@/types";

// ── Content Limits ───────────────────────────────────────────

export interface PlatformLimits {
  /** Maximum caption/body characters */
  maxCharacters: number;
  /** Maximum number of hashtags (0 = hashtags not supported) */
  maxHashtags: number;
  /** Optimal hashtag count for best engagement */
  optimalHashtags: number;
  /** Maximum images per post */
  maxImages: number;
  /** Maximum video file size in MB */
  maxVideoSizeMB: number;
  /** Maximum image file size in MB */
  maxImageSizeMB: number;
  /** Supported image MIME types */
  supportedImageTypes: string[];
  /** Supported video MIME types */
  supportedVideoTypes: string[];
  /** Maximum video duration in seconds (0 = no video) */
  maxVideoDurationSec: number;
  /** Maximum title characters (YouTube, Pinterest, etc.) — 0 = no title field */
  maxTitleCharacters: number;
}

// ── Post Formats ─────────────────────────────────────────────

export interface PlatformFormat {
  id: string;
  label: string;
  aspect: string;           // CSS aspect-ratio, e.g. "16 / 9"
  size: string;              // Display size, e.g. "1080×1080"
  description: string;
  isVertical: boolean;
  icon: "post" | "story" | "reel" | "video" | "short" | "pin";
  maxDurationSec?: number;   // For video formats only
}

// ── Feature Flags ────────────────────────────────────────────

export interface PlatformFeatures {
  supportsVideo: boolean;
  supportsStories: boolean;
  supportsReels: boolean;
  supportsCarousel: boolean;
  supportsFirstComment: boolean;
  supportsScheduling: boolean;
  supportsHashtags: boolean;
  supportsMentions: boolean;
  supportsLinks: boolean;
  supportsEmoji: boolean;
  /** Platform supports a separate title field (YouTube, Pinterest) */
  supportsTitle: boolean;
  /** Platform supports location tagging */
  supportsLocation: boolean;
}

// ── Content Validation ───────────────────────────────────────

export interface ValidationError {
  field: "content" | "title" | "hashtags" | "media" | "schedule";
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ── Hashtag Guidance ─────────────────────────────────────────

export interface HashtagGuidance {
  min: number;
  max: number;
  sweetSpot: number;
  tips: string;
}

// ── Platform Display ─────────────────────────────────────────

export interface PlatformDisplay {
  name: string;
  /** Short label for tabs/badges */
  shortName: string;
  color: string;              // Tailwind text color class
  bgColor: string;            // Tailwind bg color class
  borderColor: string;        // Tailwind border color class
  dotColor: string;           // Status dot color
  description: string;
  contentTypes: string[];
}

// ── The Platform Adapter Interface ───────────────────────────
// Every platform implements this. One file per platform.

export interface PlatformAdapter {
  /** The platform enum value */
  readonly platform: Platform;

  /** Outstand network identifier (e.g. "x" for Twitter) — null if not supported */
  readonly outstandNetwork: string | null;

  /** Display metadata */
  readonly display: PlatformDisplay;

  /** Content limits */
  readonly limits: PlatformLimits;

  /** Feature flags */
  readonly features: PlatformFeatures;

  /** Available post formats */
  readonly formats: PlatformFormat[];

  /** Hashtag guidance for AI generation */
  readonly hashtagGuidance: HashtagGuidance;

  /** Validate content before posting */
  validateContent(content: string, title?: string): ValidationResult;

  /** Format content for this platform (e.g. add line breaks, trim) */
  formatContent(content: string): string;

  /** Extract hashtags from content string */
  extractHashtags(content: string): string[];

  /** Check if a media file is valid for this platform */
  validateMedia(file: { type: string; size: number; duration?: number }): ValidationResult;
}

// ── Registry type ────────────────────────────────────────────

export type PlatformRegistry = Record<Platform, PlatformAdapter>;
