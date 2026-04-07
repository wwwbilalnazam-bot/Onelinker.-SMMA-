"use client";

/**
 * Live Media Preview Component - Buffer/Later Style
 * Shows how media will appear on each platform using native device frames
 * Inspired by industry leaders: Buffer, Later, and Hootsuite
 */

import React, { useMemo, useState } from "react";
import Image from "next/image";
import {
  Instagram,
  Facebook,
  Youtube,
  Music,
  Linkedin,
  Twitter,
  Smartphone,
  Monitor,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SocialPlatform, ResolutionKey, RESOLUTIONS } from "@/lib/media/types";

interface MediaPreviewProps {
  mediaUrl: string;
  mediaType: "image" | "video";
  originalDimensions: { width: number; height: number };
  selectedPlatforms: SocialPlatform[];
  platformMappings: Record<SocialPlatform, ResolutionKey | undefined>;
}

interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  shortName: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  deviceType: "mobile" | "desktop";
  nativeAspectRatio: number; // The aspect ratio as it appears in the actual platform UI
}

const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  instagram: {
    id: "instagram",
    name: "Instagram Feed",
    shortName: "Instagram",
    icon: <Instagram className="h-4 w-4" />,
    color: "text-pink-600",
    bgColor: "bg-gradient-to-b from-pink-500/10 to-purple-500/10",
    deviceType: "mobile",
    nativeAspectRatio: 1, // 1:1 feed
  },
  "instagram-reels": {
    id: "instagram-reels",
    name: "Instagram Reels",
    shortName: "Reels",
    icon: <Music className="h-4 w-4" />,
    color: "text-pink-600",
    bgColor: "bg-gradient-to-b from-pink-500/10 to-purple-500/10",
    deviceType: "mobile",
    nativeAspectRatio: 9 / 16, // Full screen vertical
  },
  "instagram-stories": {
    id: "instagram-stories",
    name: "Instagram Stories",
    shortName: "Stories",
    icon: <Music className="h-4 w-4" />,
    color: "text-pink-600",
    bgColor: "bg-gradient-to-b from-pink-500/10 to-purple-500/10",
    deviceType: "mobile",
    nativeAspectRatio: 9 / 16, // Full screen vertical
  },
  facebook: {
    id: "facebook",
    name: "Facebook Feed",
    shortName: "Facebook",
    icon: <Facebook className="h-4 w-4" />,
    color: "text-blue-600",
    bgColor: "bg-gradient-to-b from-blue-500/10 to-blue-400/10",
    deviceType: "mobile",
    nativeAspectRatio: 4 / 5, // Portrait in feed
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    shortName: "TikTok",
    icon: <Music className="h-4 w-4" />,
    color: "text-foreground",
    bgColor: "bg-gradient-to-b from-slate-800/20 to-slate-900/20",
    deviceType: "mobile",
    nativeAspectRatio: 9 / 16, // Full screen vertical
  },
  "youtube-shorts": {
    id: "youtube-shorts",
    name: "YouTube Shorts",
    shortName: "Shorts",
    icon: <Youtube className="h-4 w-4" />,
    color: "text-red-600",
    bgColor: "bg-gradient-to-b from-red-500/10 to-red-400/10",
    deviceType: "mobile",
    nativeAspectRatio: 9 / 16, // Full screen vertical
  },
  "youtube-standard": {
    id: "youtube-standard",
    name: "YouTube",
    shortName: "YouTube",
    icon: <Youtube className="h-4 w-4" />,
    color: "text-red-600",
    bgColor: "bg-gradient-to-b from-red-500/10 to-red-400/10",
    deviceType: "desktop",
    nativeAspectRatio: 16 / 9, // Landscape
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    shortName: "LinkedIn",
    icon: <Linkedin className="h-4 w-4" />,
    color: "text-blue-600",
    bgColor: "bg-gradient-to-b from-blue-500/10 to-blue-400/10",
    deviceType: "desktop",
    nativeAspectRatio: 16 / 9, // Landscape in feed
  },
  twitter: {
    id: "twitter",
    name: "Twitter/X",
    shortName: "X",
    icon: <Twitter className="h-4 w-4" />,
    color: "text-slate-900 dark:text-slate-100",
    bgColor: "bg-gradient-to-b from-slate-500/10 to-slate-400/10",
    deviceType: "desktop",
    nativeAspectRatio: 16 / 9, // Landscape in feed
  },
};

/**
 * Calculate how media should be displayed (with padding/cropping info)
 */
function calculateMediaDisplay(
  originalWidth: number,
  originalHeight: number,
  platformNativeAspectRatio: number
) {
  const originalRatio = originalWidth / originalHeight;

  let displayScenario: "perfect-fit" | "padded" | "cropped";
  let message: string;
  let paddingPercentages = { top: 0, bottom: 0, left: 0, right: 0 };

  // Compare aspect ratios with small tolerance for floating point
  const tolerance = 0.01;
  const ratioDiff = Math.abs(originalRatio - platformNativeAspectRatio);

  if (ratioDiff < tolerance) {
    // Perfect fit
    displayScenario = "perfect-fit";
    message = "✓ Perfect fit - no adjustments needed";
  } else if (originalRatio > platformNativeAspectRatio) {
    // Media is wider than platform wants - will be cropped from sides
    displayScenario = "cropped";
    const scaledHeight = 1; // normalize to 1
    const scaledWidth = originalRatio * scaledHeight;
    const platformWidth = platformNativeAspectRatio * scaledHeight;
    const croppedAmount = (scaledWidth - platformWidth) / scaledWidth;
    const croppedPerSide = croppedAmount / 2;
    paddingPercentages = {
      left: croppedPerSide * 100,
      right: croppedPerSide * 100,
      top: 0,
      bottom: 0,
    };
    message = `⚠ Image will be cropped ${Math.round(croppedPerSide * 100)}% from each side`;
  } else {
    // Media is taller than platform wants - will have padding/letterboxing
    displayScenario = "padded";
    const scaledWidth = 1; // normalize to 1
    const scaledHeight = 1 / originalRatio;
    const platformHeight = 1 / platformNativeAspectRatio;
    const paddedAmount = (platformHeight - scaledHeight) / platformHeight;
    const paddedPerSide = paddedAmount / 2;
    paddingPercentages = {
      left: 0,
      right: 0,
      top: paddedPerSide * 100,
      bottom: paddedPerSide * 100,
    };
    message = `ℹ Black bars will appear on top and bottom`;
  }

  return {
    displayScenario,
    message,
    paddingPercentages,
  };
}

/**
 * Mobile Device Frame (iPhone style)
 */
function MobileDeviceFrame({
  children,
  config,
}: {
  children: React.ReactNode;
  config: PlatformConfig;
}) {
  return (
    <div className="relative inline-block">
      {/* Device Bezel */}
      <div className="relative rounded-3xl bg-black p-2 shadow-2xl" style={{ width: "280px" }}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-20" />

        {/* Screen Content */}
        <div className="relative bg-white dark:bg-slate-950 rounded-3xl overflow-hidden aspect-[9/19.5]">
          {/* Status Bar Simulation */}
          <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-100 to-transparent dark:from-slate-800 z-10 border-b border-slate-200 dark:border-slate-700" />

          {/* Content Area */}
          <div className="relative w-full h-full pt-6 bg-white dark:bg-slate-950">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop Browser Frame
 */
function DesktopFrame({
  children,
  config,
}: {
  children: React.ReactNode;
  config: PlatformConfig;
}) {
  return (
    <div className="relative inline-block">
      {/* Browser Frame */}
      <div className="border-4 border-slate-800 dark:border-slate-200 rounded-lg shadow-2xl overflow-hidden bg-white dark:bg-slate-950">
        {/* Browser Tab Bar */}
        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-300 dark:border-slate-700 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <div className="flex-1 ml-2 text-xs text-slate-500 truncate">
            {config.name}
          </div>
        </div>

        {/* Content */}
        <div style={{ width: "450px", aspectRatio: "16 / 9" }} className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Platform Preview Card - Shows media in proper device frame
 */
function PlatformPreviewCard({
  platform,
  mediaUrl,
  mediaType,
  originalDimensions,
  platformNativeAspectRatio,
}: {
  platform: SocialPlatform;
  mediaUrl: string;
  mediaType: "image" | "video";
  originalDimensions: { width: number; height: number };
  platformNativeAspectRatio: number;
}) {
  const config = PLATFORM_CONFIGS[platform];
  const display = calculateMediaDisplay(
    originalDimensions.width,
    originalDimensions.height,
    platformNativeAspectRatio
  );

  // Device frame sizing
  const deviceWidth = config.deviceType === "mobile" ? 280 : 450;
  const deviceAspectRatio =
    config.deviceType === "mobile" ? 9 / 19.5 : 16 / 9;

  const contentWidth = config.deviceType === "mobile" ? 260 : 430; // accounting for padding
  const contentHeight = contentWidth / platformNativeAspectRatio;

  return (
    <div className="space-y-4">
      {/* Title and Status */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={cn("text-muted-foreground", config.color)}>
            {config.icon}
          </span>
          <div>
            <p className="font-semibold text-sm text-foreground">
              {config.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {originalDimensions.width} × {originalDimensions.height}px
            </p>
          </div>
        </div>

        {/* Status Message */}
        <div
          className={cn(
            "text-xs px-2 py-1 rounded-md font-medium w-fit",
            display.displayScenario === "perfect-fit"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : display.displayScenario === "cropped"
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
          )}
        >
          {display.message}
        </div>
      </div>

      {/* Device Frame */}
      <div
        className={cn(
          "rounded-xl p-4 flex items-center justify-center transition-all",
          config.bgColor
        )}
      >
        {config.deviceType === "mobile" ? (
          <MobileDeviceFrame config={config}>
            <MediaContent
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              contentWidth={contentWidth}
              contentHeight={contentHeight}
              platformNativeAspectRatio={platformNativeAspectRatio}
              originalDimensions={originalDimensions}
              paddingPercentages={display.paddingPercentages}
            />
          </MobileDeviceFrame>
        ) : (
          <DesktopFrame config={config}>
            <MediaContent
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              contentWidth={contentWidth}
              contentHeight={contentHeight}
              platformNativeAspectRatio={platformNativeAspectRatio}
              originalDimensions={originalDimensions}
              paddingPercentages={display.paddingPercentages}
            />
          </DesktopFrame>
        )}
      </div>
    </div>
  );
}

/**
 * The actual media content displayed in the device frame
 */
function MediaContent({
  mediaUrl,
  mediaType,
  contentWidth,
  contentHeight,
  platformNativeAspectRatio,
  originalDimensions,
  paddingPercentages,
}: {
  mediaUrl: string;
  mediaType: "image" | "video";
  contentWidth: number;
  contentHeight: number;
  platformNativeAspectRatio: number;
  originalDimensions: { width: number; height: number };
  paddingPercentages: { top: number; bottom: number; left: number; right: number };
}) {
  const originalRatio = originalDimensions.width / originalDimensions.height;

  // Calculate display dimensions that fit the platform without cropping content
  let displayWidth: number;
  let displayHeight: number;

  if (originalRatio > platformNativeAspectRatio) {
    // Image is wider - fit to width, add padding on top/bottom
    displayWidth = contentWidth;
    displayHeight = contentWidth / originalRatio;
  } else {
    // Image is taller or same ratio - fit to height, add padding on sides (or no padding)
    displayHeight = contentHeight;
    displayWidth = contentHeight * originalRatio;
  }

  return (
    <div
      className="relative w-full h-full bg-black flex items-center justify-center"
      style={{
        width: `${contentWidth}px`,
        height: `${contentHeight}px`,
      }}
    >
      {mediaType === "image" ? (
        <div
          className="relative"
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
          }}
        >
          <Image
            src={mediaUrl}
            alt="preview"
            fill
            className="object-contain"
            quality={90}
          />
        </div>
      ) : (
        // Video placeholder
        <div
          className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center"
          style={{
            width: `${contentWidth}px`,
            height: `${contentHeight}px`,
          }}
        >
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
            <p className="text-white text-xs">Video Preview</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main Live Media Preview Component
 */
export function LiveMediaPreview({
  mediaUrl,
  mediaType,
  originalDimensions,
  selectedPlatforms,
  platformMappings,
}: MediaPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  const platformsToShow = selectedPlatforms.filter((p) => platformMappings[p]);

  const emptyState = !mediaUrl || platformsToShow.length === 0;

  return (
    <div className="space-y-4 w-full">
      {/* Header with Collapse Toggle - with border separator */}
      <div className="border-t border-gray-200/50 pt-3 space-y-2.5">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between group hover:opacity-80 transition-opacity"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Live Preview
          </p>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-foreground/60 transition-transform flex-shrink-0",
              isOpen ? "rotate-180" : ""
            )}
          />
        </button>
      </div>

      {/* Preview Content - Collapsible */}
      {isOpen && (
        <div className="space-y-6">
          {emptyState ? (
            // Empty State
            <div className="rounded-lg border-2 border-dashed border-border/50 bg-muted/30 p-12 text-center space-y-3">
              <Smartphone className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <div>
                <p className="font-medium text-foreground">No media uploaded</p>
                <p className="text-sm text-muted-foreground">
                  {!mediaUrl
                    ? "Upload an image or video to see the preview"
                    : "Select platforms to see how your media will appear"}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Dimensions Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-500/5 p-4 rounded-lg border border-border/40">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Original Size
                  </p>
                  <p className="text-sm font-mono font-bold text-foreground mt-1">
                    {originalDimensions.width} × {originalDimensions.height}px
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Aspect Ratio
                  </p>
                  <p className="text-sm font-mono font-bold text-foreground mt-1">
                    {(originalDimensions.width / originalDimensions.height).toFixed(
                      2
                    )}:1
                  </p>
                </div>
              </div>

              {/* Platform Previews Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {platformsToShow.map((platform) => {
                  const targetRatio = platformMappings[platform];
                  if (!targetRatio) return null;

                  const targetResolution = RESOLUTIONS[targetRatio];
                  if (!targetResolution) return null;

                  const platformNativeAspectRatio =
                    targetResolution.width / targetResolution.height;

                  return (
                    <PlatformPreviewCard
                      key={platform}
                      platform={platform}
                      mediaUrl={mediaUrl}
                      mediaType={mediaType}
                      originalDimensions={originalDimensions}
                      platformNativeAspectRatio={platformNativeAspectRatio}
                    />
                  );
                })}
              </div>

              {/* Tips Section */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4 space-y-3">
                <p className="font-semibold text-sm text-foreground">💡 Tips</p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                    <span>
                      <strong>Perfect Fit:</strong> Your media matches the platform's
                      aspect ratio perfectly
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">⚠</span>
                    <span>
                      <strong>Cropped:</strong> Edges will be removed to fit the
                      platform (center content is preserved)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">ℹ</span>
                    <span>
                      <strong>Black Bars:</strong> Padding added to maintain aspect
                      ratio (no content loss)
                    </span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Re-export RESOLUTIONS for easy access
export { RESOLUTIONS };
