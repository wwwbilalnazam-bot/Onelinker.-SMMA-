import { Platform } from "@/types";
import { BasePlatformAdapter, COMMON_IMAGE_TYPES, COMMON_VIDEO_TYPES } from "./base";
import type { PlatformLimits, PlatformFeatures, PlatformFormat, PlatformDisplay, HashtagGuidance } from "./types";

// ════════════════════════════════════════════════════════════
// GOOGLE BUSINESS PROFILE ADAPTER
// ════════════════════════════════════════════════════════════

export class GoogleBusinessAdapter extends BasePlatformAdapter {
  readonly platform = Platform.GoogleBusiness;
  readonly outstandNetwork = null; // Not supported by Outstand — requires direct API

  readonly display: PlatformDisplay = {
    name: "Google Business",
    shortName: "Google",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/15",
    dotColor: "bg-emerald-500",
    description: "Local SEO & business posts",
    contentTypes: ["Posts", "Updates", "Offers", "Events"],
  };

  readonly limits: PlatformLimits = {
    maxCharacters: 1500,
    maxHashtags: 0,            // No hashtag support
    optimalHashtags: 0,
    maxImages: 1,
    maxVideoSizeMB: 75,
    maxImageSizeMB: 5,
    supportedImageTypes: COMMON_IMAGE_TYPES,
    supportedVideoTypes: COMMON_VIDEO_TYPES,
    maxVideoDurationSec: 30,
    maxTitleCharacters: 0,
  };

  readonly features: PlatformFeatures = {
    supportsVideo: true,
    supportsStories: false,
    supportsReels: false,
    supportsCarousel: false,
    supportsFirstComment: false,
    supportsScheduling: true,
    supportsHashtags: false,
    supportsMentions: false,
    supportsLinks: true,
    supportsEmoji: true,
    supportsTitle: false,
    supportsLocation: true,    // Location is the core feature
  };

  readonly formats: PlatformFormat[] = [
    { id: "post",  label: "Post",  aspect: "4 / 3",  size: "1200×900",  description: "Standard business post", isVertical: false, icon: "post" },
    { id: "event", label: "Event", aspect: "16 / 9", size: "1200×675",  description: "Event announcement",     isVertical: false, icon: "post" },
  ];

  readonly hashtagGuidance: HashtagGuidance = {
    min: 0,
    max: 0,
    sweetSpot: 0,
    tips: "Google Business posts don't use hashtags. Focus on local keywords in the post content.",
  };
}
