import { Platform } from "@/types";
import { BasePlatformAdapter, COMMON_IMAGE_TYPES, COMMON_VIDEO_TYPES } from "./base";
import type { PlatformLimits, PlatformFeatures, PlatformFormat, PlatformDisplay, HashtagGuidance, ValidationResult } from "./types";

// ════════════════════════════════════════════════════════════
// YOUTUBE ADAPTER
// ════════════════════════════════════════════════════════════

export class YouTubeAdapter extends BasePlatformAdapter {
  readonly platform = Platform.YouTube;
  readonly outstandNetwork = "youtube";

  readonly display: PlatformDisplay = {
    name: "YouTube",
    shortName: "YouTube",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/15",
    dotColor: "bg-red-500",
    description: "Videos & Shorts",
    contentTypes: ["Videos", "Shorts", "Community"],
  };

  readonly limits: PlatformLimits = {
    maxCharacters: 5000,
    maxHashtags: 15,
    optimalHashtags: 5,
    maxImages: 1,
    maxVideoSizeMB: 12288,      // 12GB
    maxImageSizeMB: 2,
    supportedImageTypes: COMMON_IMAGE_TYPES,
    supportedVideoTypes: COMMON_VIDEO_TYPES,
    maxVideoDurationSec: 43200,  // 12 hours
    maxTitleCharacters: 100,
  };

  readonly features: PlatformFeatures = {
    supportsVideo: true,
    supportsStories: false,
    supportsReels: false,
    supportsCarousel: false,
    supportsFirstComment: false,
    supportsScheduling: true,
    supportsHashtags: true,
    supportsMentions: false,
    supportsLinks: true,
    supportsEmoji: true,
    supportsTitle: true,
    supportsLocation: false,
  };

  readonly formats: PlatformFormat[] = [
    { id: "video", label: "Video", aspect: "16 / 9", size: "1920×1080", description: "Standard horizontal video", isVertical: false, icon: "video" },
    { id: "short", label: "Short", aspect: "9 / 16", size: "1080×1920", description: "Vertical short ≤60s",       isVertical: true,  icon: "short", maxDurationSec: 60 },
  ];

  readonly hashtagGuidance: HashtagGuidance = {
    min: 3,
    max: 15,
    sweetSpot: 5,
    tips: "Use in description for discoverability. Mix broad + specific topic tags.",
  };

  validateContent(content: string, title?: string): ValidationResult {
    const result = super.validateContent(content, title);

    // YouTube requires a title
    if (this.features.supportsTitle && (!title || title.trim().length === 0)) {
      result.warnings.push({
        field: "title",
        message: "YouTube videos should have a title for best reach",
        severity: "warning",
      });
    }

    return result;
  }
}
