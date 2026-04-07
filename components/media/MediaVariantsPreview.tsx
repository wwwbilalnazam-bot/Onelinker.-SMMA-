"use client";

import React from "react";
import Image from "next/image";
import {
  Instagram,
  Music,
  Youtube,
  Facebook,
  Linkedin,
  Twitter,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaVariant, SocialPlatform, ResolutionKey } from "@/lib/media/types";

interface MediaVariantsPreviewProps {
  variants: MediaVariant[];
  platformMappings: Record<SocialPlatform, ResolutionKey | undefined>;
  isVideo?: boolean;
}

const PLATFORM_ICONS: Record<SocialPlatform, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  "instagram-reels": <Play className="h-4 w-4" />,
  "instagram-stories": <Play className="h-4 w-4" />,
  tiktok: <Music className="h-4 w-4" />,
  "youtube-shorts": <Youtube className="h-4 w-4" />,
  "youtube-standard": <Youtube className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
};

const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  "instagram-reels": "Instagram Reels",
  "instagram-stories": "Stories",
  tiktok: "TikTok",
  "youtube-shorts": "YouTube Shorts",
  "youtube-standard": "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "Twitter",
};

export function MediaVariantsPreview({
  variants,
  platformMappings,
  isVideo = false,
}: MediaVariantsPreviewProps) {
  const variantsByRatio = new Map(variants.map((v) => [v.aspectRatio, v]));

  return (
    <div className="space-y-6">
      {/* Variants Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Generated Variants</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {variants.map((variant) => (
            <div
              key={variant.id}
              className="rounded-lg overflow-hidden border border-border/40 bg-muted/20 space-y-2"
            >
              {/* Aspect ratio indicator */}
              <div className="relative bg-muted/40 aspect-square flex items-center justify-center">
                {isVideo ? (
                  <Play className="h-6 w-6 text-muted-foreground/40 fill-muted-foreground/40" />
                ) : (
                  <Image
                    src={variant.url || "/placeholder.png"}
                    alt={variant.aspectRatio}
                    fill
                    className="object-cover"
                  />
                )}
              </div>

              {/* Info */}
              <div className="px-2 pb-2 space-y-1">
                <p className="text-xs font-medium text-foreground">
                  {variant.aspectRatio}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {variant.resolution.width}×{variant.resolution.height}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {(variant.fileSize / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Assignment */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <h3 className="text-sm font-medium text-foreground">
          Platform Assignment
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(platformMappings).map(([platform, ratio]) => (
            <div
              key={platform}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/20"
            >
              <span className="text-muted-foreground">
                {PLATFORM_ICONS[platform as SocialPlatform]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {PLATFORM_NAMES[platform as SocialPlatform]}
                </p>
                {ratio && (
                  <p className="text-[10px] text-muted-foreground">
                    {ratio} format
                  </p>
                )}
              </div>
              {ratio && variantsByRatio.has(ratio) && (
                <div className="text-primary">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Processing Summary */}
      <div className="space-y-2 pt-4 border-t border-border/40">
        <p className="text-xs text-muted-foreground">
          <strong>{variants.length}</strong> optimized variants generated
        </p>
        <p className="text-xs text-muted-foreground">
          Total size:{" "}
          <strong>
            {(
              variants.reduce((sum, v) => sum + v.fileSize, 0) /
              1024 /
              1024
            ).toFixed(1)}
            MB
          </strong>
        </p>
      </div>
    </div>
  );
}
