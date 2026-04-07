import { Platform } from "@/types";
import { BasePlatformAdapter, COMMON_IMAGE_TYPES, COMMON_VIDEO_TYPES } from "./base";
import type { PlatformLimits, PlatformFeatures, PlatformFormat, PlatformDisplay, HashtagGuidance } from "./types";

// ════════════════════════════════════════════════════════════
// THREADS ADAPTER
// ════════════════════════════════════════════════════════════

export class ThreadsAdapter extends BasePlatformAdapter {
  readonly platform = Platform.Threads;
  readonly outstandNetwork = "threads";

  readonly display: PlatformDisplay = {
    name: "Threads",
    shortName: "Threads",
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/10",
    borderColor: "border-zinc-500/15",
    dotColor: "bg-zinc-400",
    description: "Text conversations & replies",
    contentTypes: ["Posts", "Replies"],
  };

  readonly limits: PlatformLimits = {
    maxCharacters: 500,
    maxHashtags: 5,
    optimalHashtags: 3,
    maxImages: 10,
    maxVideoSizeMB: 100,
    maxImageSizeMB: 8,
    supportedImageTypes: COMMON_IMAGE_TYPES,
    supportedVideoTypes: COMMON_VIDEO_TYPES,
    maxVideoDurationSec: 300,
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
    { id: "post",   label: "Post",   aspect: "1 / 1",  size: "1080×1080", description: "Standard thread post", isVertical: false, icon: "post" },
    { id: "square", label: "Square", aspect: "1 / 1",  size: "1080×1080", description: "Square media",         isVertical: false, icon: "post" },
  ];

  readonly hashtagGuidance: HashtagGuidance = {
    min: 1,
    max: 5,
    sweetSpot: 3,
    tips: "Hashtags are emerging on Threads. Keep it to 2-4 relevant ones.",
  };
}
