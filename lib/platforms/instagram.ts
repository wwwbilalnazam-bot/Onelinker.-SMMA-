import { Platform } from "@/types";
import { BasePlatformAdapter, COMMON_IMAGE_TYPES, COMMON_VIDEO_TYPES } from "./base";
import type { PlatformLimits, PlatformFeatures, PlatformFormat, PlatformDisplay, HashtagGuidance } from "./types";

// ════════════════════════════════════════════════════════════
// INSTAGRAM ADAPTER
// ════════════════════════════════════════════════════════════

export class InstagramAdapter extends BasePlatformAdapter {
  readonly platform = Platform.Instagram;
  readonly outstandNetwork = "instagram";

  readonly display: PlatformDisplay = {
    name: "Instagram",
    shortName: "Instagram",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/15",
    dotColor: "bg-pink-500",
    description: "Photos, Reels & Stories",
    contentTypes: ["Posts", "Reels", "Stories", "Carousels"],
  };

  readonly limits: PlatformLimits = {
    maxCharacters: 2200,
    maxHashtags: 30,
    optimalHashtags: 15,
    maxImages: 10,
    maxVideoSizeMB: 650,
    maxImageSizeMB: 8,
    supportedImageTypes: COMMON_IMAGE_TYPES,
    supportedVideoTypes: COMMON_VIDEO_TYPES,
    maxVideoDurationSec: 90,    // Reels up to 90s
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
    supportsLinks: false,        // Links not clickable in captions
    supportsEmoji: true,
    supportsTitle: false,
    supportsLocation: true,
  };

  readonly formats: PlatformFormat[] = [
    { id: "post",          label: "Post",     aspect: "1 / 1",  size: "1080×1080", description: "Square feed post",        isVertical: false, icon: "post" },
    { id: "post_portrait", label: "Portrait", aspect: "4 / 5",  size: "1080×1350", description: "Portrait feed post",      isVertical: false, icon: "post" },
    { id: "story",         label: "Story",    aspect: "9 / 16", size: "1080×1920", description: "24-hour story",           isVertical: true,  icon: "story", maxDurationSec: 15 },
    { id: "reel",          label: "Reel",     aspect: "9 / 16", size: "1080×1920", description: "Short video up to 90s",   isVertical: true,  icon: "reel",  maxDurationSec: 90 },
  ];

  readonly hashtagGuidance: HashtagGuidance = {
    min: 10,
    max: 30,
    sweetSpot: 15,
    tips: "Use a mix: 3-5 very popular (1M+), 5-7 medium (100K-1M), 5-8 niche (<100K). Total 15-20 for best reach.",
  };

  formatContent(content: string): string {
    let formatted = super.formatContent(content);
    // Instagram best practice: separate hashtags from caption with line breaks
    const hashtagSection = formatted.match(/((?:\s*#[a-zA-Z0-9_]+)+)\s*$/);
    if (hashtagSection && hashtagSection[1]) {
      const before = formatted.slice(0, formatted.length - hashtagSection[0].length).trimEnd();
      formatted = `${before}\n\n${hashtagSection[1].trim()}`;
    }
    return formatted;
  }
}
