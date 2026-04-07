import { Platform } from "@/types";
import { BasePlatformAdapter, COMMON_IMAGE_TYPES, COMMON_VIDEO_TYPES } from "./base";
import type { PlatformLimits, PlatformFeatures, PlatformFormat, PlatformDisplay, HashtagGuidance } from "./types";

// ════════════════════════════════════════════════════════════
// FACEBOOK ADAPTER
// ════════════════════════════════════════════════════════════

export class FacebookAdapter extends BasePlatformAdapter {
  readonly platform = Platform.Facebook;
  readonly outstandNetwork = "facebook";

  readonly display: PlatformDisplay = {
    name: "Facebook",
    shortName: "Facebook",
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    borderColor: "border-blue-600/15",
    dotColor: "bg-blue-500",
    description: "Pages, Groups & Stories",
    contentTypes: ["Posts", "Reels", "Stories"],
  };

  readonly limits: PlatformLimits = {
    maxCharacters: 2000,
    maxHashtags: 3,
    optimalHashtags: 2,
    maxImages: 10,
    maxVideoSizeMB: 4096,
    maxImageSizeMB: 10,
    supportedImageTypes: COMMON_IMAGE_TYPES,
    supportedVideoTypes: COMMON_VIDEO_TYPES,
    maxVideoDurationSec: 240 * 60, // 240 minutes
    maxTitleCharacters: 0,
  };

  readonly features: PlatformFeatures = {
    supportsVideo: true,
    supportsStories: true,
    supportsReels: true,
    supportsCarousel: true,
    supportsFirstComment: true,
    supportsScheduling: true,
    supportsHashtags: true,
    supportsMentions: true,
    supportsLinks: true,
    supportsEmoji: true,
    supportsTitle: false,
    supportsLocation: true,
  };

  readonly formats: PlatformFormat[] = [
    { id: "post",  label: "Post",  aspect: "16 / 9", size: "1200×630",  description: "Standard post",         isVertical: false, icon: "post" },
    { id: "story", label: "Story", aspect: "9 / 16", size: "1080×1920", description: "24-hour story",         isVertical: true,  icon: "story", maxDurationSec: 20 },
    { id: "reel",  label: "Reel",  aspect: "9 / 16", size: "1080×1920", description: "Short video up to 60s", isVertical: true,  icon: "reel",  maxDurationSec: 60 },
  ];

  readonly hashtagGuidance: HashtagGuidance = {
    min: 0,
    max: 3,
    sweetSpot: 2,
    tips: "Hashtags have limited impact on Facebook. Use 1-3 only if clearly relevant.",
  };
}
