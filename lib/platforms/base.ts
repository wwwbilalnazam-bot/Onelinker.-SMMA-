// ════════════════════════════════════════════════════════════
// BASE PLATFORM ADAPTER
//
// Shared logic for all platforms. Each platform extends this
// and overrides only what differs.
// ════════════════════════════════════════════════════════════

import { Platform } from "@/types";
import type {
  PlatformAdapter,
  PlatformLimits,
  PlatformFeatures,
  PlatformFormat,
  PlatformDisplay,
  HashtagGuidance,
  ValidationResult,
  ValidationError,
} from "./types";

export abstract class BasePlatformAdapter implements PlatformAdapter {
  abstract readonly platform: Platform;
  abstract readonly outstandNetwork: string | null;
  abstract readonly display: PlatformDisplay;
  abstract readonly limits: PlatformLimits;
  abstract readonly features: PlatformFeatures;
  abstract readonly formats: PlatformFormat[];
  abstract readonly hashtagGuidance: HashtagGuidance;

  // ── Shared validation logic ──────────────────────────────

  validateContent(content: string, title?: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Character limit
    if (content.length > this.limits.maxCharacters) {
      errors.push({
        field: "content",
        message: `Content exceeds ${this.limits.maxCharacters} character limit (${content.length} chars)`,
        severity: "error",
      });
    } else if (content.length > this.limits.maxCharacters * 0.9) {
      warnings.push({
        field: "content",
        message: `Content is near the ${this.limits.maxCharacters} character limit`,
        severity: "warning",
      });
    }

    // Hashtag limit
    const hashtags = this.extractHashtags(content);
    if (hashtags.length > this.limits.maxHashtags) {
      errors.push({
        field: "hashtags",
        message: `Too many hashtags: ${hashtags.length}/${this.limits.maxHashtags}`,
        severity: "error",
      });
    }

    // Title validation (if platform supports it)
    if (this.features.supportsTitle && title !== undefined) {
      if (this.limits.maxTitleCharacters > 0 && title.length > this.limits.maxTitleCharacters) {
        errors.push({
          field: "title",
          message: `Title exceeds ${this.limits.maxTitleCharacters} character limit`,
          severity: "error",
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ── Shared content formatting ────────────────────────────

  formatContent(content: string): string {
    // Trim whitespace, normalize line breaks
    return content.trim().replace(/\r\n/g, "\n");
  }

  // ── Shared hashtag extraction ────────────────────────────

  extractHashtags(content: string): string[] {
    const matches = content.match(/#[a-zA-Z0-9_]+/g);
    return matches ?? [];
  }

  // ── Shared media validation ──────────────────────────────

  validateMedia(file: { type: string; size: number; duration?: number }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (isImage) {
      if (!this.limits.supportedImageTypes.includes(file.type)) {
        errors.push({
          field: "media",
          message: `Unsupported image type: ${file.type}`,
          severity: "error",
        });
      }
      const maxBytes = this.limits.maxImageSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        errors.push({
          field: "media",
          message: `Image exceeds ${this.limits.maxImageSizeMB}MB limit`,
          severity: "error",
        });
      }
    }

    if (isVideo) {
      if (!this.features.supportsVideo) {
        errors.push({
          field: "media",
          message: `${this.display.name} does not support video`,
          severity: "error",
        });
      } else {
        if (!this.limits.supportedVideoTypes.includes(file.type)) {
          errors.push({
            field: "media",
            message: `Unsupported video type: ${file.type}`,
            severity: "error",
          });
        }
        const maxBytes = this.limits.maxVideoSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
          errors.push({
            field: "media",
            message: `Video exceeds ${this.limits.maxVideoSizeMB}MB limit`,
            severity: "error",
          });
        }
        if (file.duration && file.duration > this.limits.maxVideoDurationSec) {
          errors.push({
            field: "media",
            message: `Video exceeds ${this.limits.maxVideoDurationSec}s duration limit`,
            severity: "error",
          });
        }
      }
    }

    if (!isImage && !isVideo) {
      errors.push({
        field: "media",
        message: `Unsupported file type: ${file.type}`,
        severity: "error",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// ── Common constants shared across adapters ─────────────────

export const COMMON_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const COMMON_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];
