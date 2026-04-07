import { Platform } from "@/types";
import { BasePlatformAdapter, COMMON_IMAGE_TYPES, COMMON_VIDEO_TYPES } from "./base";
import type { PlatformLimits, PlatformFeatures, PlatformFormat, PlatformDisplay, HashtagGuidance } from "./types";

// ════════════════════════════════════════════════════════════
// LINKEDIN ADAPTER
// ════════════════════════════════════════════════════════════

export class LinkedInAdapter extends BasePlatformAdapter {
  readonly platform = Platform.LinkedIn;
  readonly outstandNetwork = "linkedin";

  readonly display: PlatformDisplay = {
    name: "LinkedIn",
    shortName: "LinkedIn",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/15",
    dotColor: "bg-blue-500",
    description: "Professional content & articles",
    contentTypes: ["Posts", "Articles", "Documents"],
  };

  readonly limits: PlatformLimits = {
    maxCharacters: 3000,
    maxHashtags: 5,
    optimalHashtags: 3,
    maxImages: 9,
    maxVideoSizeMB: 5120,
    maxImageSizeMB: 10,
    supportedImageTypes: COMMON_IMAGE_TYPES,
    supportedVideoTypes: COMMON_VIDEO_TYPES,
    maxVideoDurationSec: 600,
    maxTitleCharacters: 0,
  };

  readonly features: PlatformFeatures = {
    supportsVideo: true,
    supportsStories: false,
    supportsReels: false,
    supportsCarousel: true,
    supportsFirstComment: true,
    supportsScheduling: true,
    supportsHashtags: true,
    supportsMentions: true,
    supportsLinks: true,
    supportsEmoji: true,
    supportsTitle: false,
    supportsLocation: false,
  };

  readonly formats: PlatformFormat[] = [
    { id: "post",     label: "Post",     aspect: "1.91 / 1", size: "1200×627",  description: "Standard post",  isVertical: false, icon: "post" },
    { id: "square",   label: "Square",   aspect: "1 / 1",    size: "1200×1200", description: "Square post",    isVertical: false, icon: "post" },
    { id: "portrait", label: "Portrait", aspect: "4 / 5",    size: "1080×1350", description: "Portrait post",  isVertical: false, icon: "post" },
  ];

  readonly hashtagGuidance: HashtagGuidance = {
    min: 3,
    max: 5,
    sweetSpot: 3,
    tips: "Mix professional + industry hashtags. Avoid over-tagging — 3-5 is ideal.",
  };

  formatContent(content: string): string {
    let formatted = super.formatContent(content);
    // LinkedIn best practice: add line breaks for readability
    // If post is long with no line breaks, add breaks every ~2 sentences
    if (formatted.length > 300 && !formatted.includes("\n")) {
      formatted = formatted.replace(/\. (?=[A-Z])/g, ".\n\n");
    }
    return formatted;
  }
}
