import { Platform } from "@/types";
import { BasePlatformAdapter, COMMON_IMAGE_TYPES, COMMON_VIDEO_TYPES } from "./base";
import type { PlatformLimits, PlatformFeatures, PlatformFormat, PlatformDisplay, HashtagGuidance } from "./types";

// ════════════════════════════════════════════════════════════
// X (TWITTER) ADAPTER
// ════════════════════════════════════════════════════════════

export class TwitterAdapter extends BasePlatformAdapter {
  readonly platform = Platform.Twitter;
  readonly outstandNetwork = "x";

  readonly display: PlatformDisplay = {
    name: "X (Twitter)",
    shortName: "X",
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/15",
    dotColor: "bg-sky-400",
    description: "Short-form posts & threads",
    contentTypes: ["Posts", "Threads", "Replies"],
  };

  readonly limits: PlatformLimits = {
    maxCharacters: 280,
    maxHashtags: 2,
    optimalHashtags: 1,
    maxImages: 4,
    maxVideoSizeMB: 512,
    maxImageSizeMB: 5,
    supportedImageTypes: COMMON_IMAGE_TYPES,
    supportedVideoTypes: COMMON_VIDEO_TYPES,
    maxVideoDurationSec: 140,
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
    { id: "post",   label: "Post",   aspect: "16 / 9", size: "1600×900",  description: "Standard tweet with media", isVertical: false, icon: "post" },
    { id: "square", label: "Square", aspect: "1 / 1",  size: "1200×1200", description: "Square tweet media",       isVertical: false, icon: "post" },
  ];

  readonly hashtagGuidance: HashtagGuidance = {
    min: 0,
    max: 2,
    sweetSpot: 1,
    tips: "Use 1-2 highly relevant hashtags only. Overhashing kills engagement on X.",
  };

  // Twitter counts URLs as 23 characters regardless of length
  validateContent(content: string, title?: string) {
    const result = super.validateContent(content, title);

    // Warn if content has too many hashtags relative to text
    const hashtags = this.extractHashtags(content);
    const nonHashtagText = content.replace(/#[a-zA-Z0-9_]+/g, "").trim();
    if (hashtags.length > 0 && nonHashtagText.length < 50) {
      result.warnings.push({
        field: "content",
        message: "Very short text with hashtags — add more context for better engagement",
        severity: "warning",
      });
    }

    return result;
  }
}
