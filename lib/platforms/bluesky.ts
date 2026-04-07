import { Platform } from "@/types";
import { BasePlatformAdapter, COMMON_IMAGE_TYPES } from "./base";
import type { PlatformLimits, PlatformFeatures, PlatformFormat, PlatformDisplay, HashtagGuidance } from "./types";

// ════════════════════════════════════════════════════════════
// BLUESKY ADAPTER
// ════════════════════════════════════════════════════════════

export class BlueskyAdapter extends BasePlatformAdapter {
  readonly platform = Platform.Bluesky;
  readonly outstandNetwork = "bluesky";

  readonly display: PlatformDisplay = {
    name: "Bluesky",
    shortName: "Bluesky",
    color: "text-sky-400",
    bgColor: "bg-sky-400/10",
    borderColor: "border-sky-400/15",
    dotColor: "bg-sky-400",
    description: "Decentralized microblogging",
    contentTypes: ["Posts", "Threads"],
  };

  readonly limits: PlatformLimits = {
    maxCharacters: 300,
    maxHashtags: 4,
    optimalHashtags: 2,
    maxImages: 4,
    maxVideoSizeMB: 50,
    maxImageSizeMB: 1,
    supportedImageTypes: COMMON_IMAGE_TYPES,
    supportedVideoTypes: ["video/mp4"],
    maxVideoDurationSec: 60,
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
    { id: "post",   label: "Post",   aspect: "16 / 9", size: "1600×900",  description: "Standard post",  isVertical: false, icon: "post" },
    { id: "square", label: "Square", aspect: "1 / 1",  size: "1080×1080", description: "Square media",   isVertical: false, icon: "post" },
  ];

  readonly hashtagGuidance: HashtagGuidance = {
    min: 0,
    max: 4,
    sweetSpot: 2,
    tips: "Hashtag culture is growing. Use 2-3 niche, relevant tags.",
  };

  // Bluesky uses grapheme clusters for character counting, not JS string length
  // This is a simplification — production should use a grapheme splitter
  validateContent(content: string, title?: string) {
    return super.validateContent(content, title);
  }
}
