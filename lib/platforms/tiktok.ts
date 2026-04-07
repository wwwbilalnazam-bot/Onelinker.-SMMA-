import { Platform } from "@/types";
import { BasePlatformAdapter, COMMON_IMAGE_TYPES, COMMON_VIDEO_TYPES } from "./base";
import type { PlatformLimits, PlatformFeatures, PlatformFormat, PlatformDisplay, HashtagGuidance } from "./types";

// ════════════════════════════════════════════════════════════
// TIKTOK ADAPTER
// ════════════════════════════════════════════════════════════

export class TikTokAdapter extends BasePlatformAdapter {
  readonly platform = Platform.TikTok;
  readonly outstandNetwork = "tiktok";

  readonly display: PlatformDisplay = {
    name: "TikTok",
    shortName: "TikTok",
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/10",
    borderColor: "border-zinc-500/15",
    dotColor: "bg-zinc-400",
    description: "Short-form vertical videos",
    contentTypes: ["Videos", "Carousels", "Photos"],
  };

  readonly limits: PlatformLimits = {
    maxCharacters: 2200,
    maxHashtags: 5,
    optimalHashtags: 4,
    maxImages: 10,
    maxVideoSizeMB: 287,
    maxImageSizeMB: 10,
    supportedImageTypes: COMMON_IMAGE_TYPES,
    supportedVideoTypes: COMMON_VIDEO_TYPES,
    maxVideoDurationSec: 600,   // 10 minutes
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
    supportsLinks: false,
    supportsEmoji: true,
    supportsTitle: false,
    supportsLocation: true,
  };

  readonly formats: PlatformFormat[] = [
    { id: "video", label: "Video", aspect: "9 / 16", size: "1080×1920", description: "Vertical video up to 10min", isVertical: true,  icon: "reel", maxDurationSec: 600 },
    { id: "post",  label: "Photo", aspect: "1 / 1",  size: "1080×1080", description: "Photo post / carousel",      isVertical: false, icon: "post" },
  ];

  readonly hashtagGuidance: HashtagGuidance = {
    min: 3,
    max: 5,
    sweetSpot: 4,
    tips: "Include trending hashtags + niche ones. FYP tag if relevant. Keep it to 3-5.",
  };
}
