import { Platform } from "@/types";
import { BasePlatformAdapter, COMMON_IMAGE_TYPES, COMMON_VIDEO_TYPES } from "./base";
import type { PlatformLimits, PlatformFeatures, PlatformFormat, PlatformDisplay, HashtagGuidance } from "./types";

// ════════════════════════════════════════════════════════════
// PINTEREST ADAPTER
// ════════════════════════════════════════════════════════════

export class PinterestAdapter extends BasePlatformAdapter {
  readonly platform = Platform.Pinterest;
  readonly outstandNetwork = "pinterest";

  readonly display: PlatformDisplay = {
    name: "Pinterest",
    shortName: "Pinterest",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/15",
    dotColor: "bg-rose-500",
    description: "Visual discovery & pins",
    contentTypes: ["Pins", "Idea Pins"],
  };

  readonly limits: PlatformLimits = {
    maxCharacters: 500,
    maxHashtags: 20,
    optimalHashtags: 8,
    maxImages: 1,
    maxVideoSizeMB: 2048,
    maxImageSizeMB: 20,
    supportedImageTypes: COMMON_IMAGE_TYPES,
    supportedVideoTypes: COMMON_VIDEO_TYPES,
    maxVideoDurationSec: 900,   // 15 minutes
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
    { id: "pin",      label: "Pin",      aspect: "2 / 3",  size: "1000×1500", description: "Standard vertical pin",   isVertical: true,  icon: "pin" },
    { id: "square",   label: "Square",   aspect: "1 / 1",  size: "1000×1000", description: "Square pin",              isVertical: false, icon: "pin" },
    { id: "idea_pin", label: "Idea Pin", aspect: "9 / 16", size: "1080×1920", description: "Multi-page idea pin",     isVertical: true,  icon: "pin" },
  ];

  readonly hashtagGuidance: HashtagGuidance = {
    min: 5,
    max: 20,
    sweetSpot: 8,
    tips: "Keyword-style hashtags work best. Include product/style/niche terms.",
  };
}
