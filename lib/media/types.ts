/**
 * Media Optimization System Types
 * Enterprise-grade media processing for social platforms
 */

// ─── Aspect Ratios ───────────────────────────────────────────
export const ASPECT_RATIOS = {
  square: { width: 1, height: 1, label: "Square (1:1)", key: "1:1" as const },
  portrait: { width: 4, height: 5, label: "Portrait (4:5)", key: "4:5" as const },
  vertical: { width: 9, height: 16, label: "Vertical (9:16)", key: "9:16" as const },
  landscape: { width: 16, height: 9, label: "Landscape (16:9)", key: "16:9" as const },
  widescreen: { width: 1.91, height: 1, label: "Widescreen (1.91:1)", key: "1.91:1" as const },
} as const;

export type AspectRatioKey = keyof typeof ASPECT_RATIOS;

// ─── Resolutions ────────────────────────────────────────────
export const RESOLUTIONS = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1280, height: 720 },
  "16:9-hd": { width: 1920, height: 1080 },
  "1.91:1": { width: 1200, height: 628 },
} as const;

export type ResolutionKey = keyof typeof RESOLUTIONS;

// ─── Media Types ────────────────────────────────────────────
export type MediaType = "image" | "video";

export type SocialPlatform =
  | "instagram"
  | "instagram-reels"
  | "instagram-stories"
  | "tiktok"
  | "youtube-shorts"
  | "youtube-standard"
  | "facebook"
  | "linkedin"
  | "twitter";

// ─── Platform Requirements ──────────────────────────────────
export interface PlatformRequirements {
  name: string;
  supportedAspectRatios: ResolutionKey[];
  recommended: ResolutionKey;
  maxFileSize: number; // in bytes
  supportedFormats: MediaType[];
  maxDuration?: number; // for videos, in seconds
}

export const PLATFORM_REQUIREMENTS: Record<
  SocialPlatform,
  PlatformRequirements
> = {
  instagram: {
    name: "Instagram Feed",
    supportedAspectRatios: ["1:1", "4:5"],
    recommended: "1:1",
    maxFileSize: 8 * 1024 * 1024, // 8MB
    supportedFormats: ["image", "video"],
  },
  "instagram-reels": {
    name: "Instagram Reels",
    supportedAspectRatios: ["9:16"],
    recommended: "9:16",
    maxFileSize: 100 * 1024 * 1024, // 100MB
    supportedFormats: ["video"],
    maxDuration: 90,
  },
  "instagram-stories": {
    name: "Instagram Stories",
    supportedAspectRatios: ["9:16"],
    recommended: "9:16",
    maxFileSize: 8 * 1024 * 1024,
    supportedFormats: ["image", "video"],
    maxDuration: 15,
  },
  tiktok: {
    name: "TikTok",
    supportedAspectRatios: ["9:16"],
    recommended: "9:16",
    maxFileSize: 287 * 1024 * 1024, // 287MB
    supportedFormats: ["video"],
    maxDuration: 600,
  },
  "youtube-shorts": {
    name: "YouTube Shorts",
    supportedAspectRatios: ["9:16"],
    recommended: "9:16",
    maxFileSize: 500 * 1024 * 1024,
    supportedFormats: ["video"],
    maxDuration: 60,
  },
  "youtube-standard": {
    name: "YouTube",
    supportedAspectRatios: ["16:9", "16:9-hd"],
    recommended: "16:9-hd",
    maxFileSize: 12 * 1024 * 1024 * 1024, // 12GB
    supportedFormats: ["video"],
  },
  facebook: {
    name: "Facebook",
    supportedAspectRatios: ["16:9", "1.91:1", "1:1"],
    recommended: "1.91:1",
    maxFileSize: 1 * 1024 * 1024 * 1024, // 1GB
    supportedFormats: ["image", "video"],
  },
  linkedin: {
    name: "LinkedIn",
    supportedAspectRatios: ["16:9", "1:1"],
    recommended: "16:9",
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ["image", "video"],
  },
  twitter: {
    name: "Twitter (X)",
    supportedAspectRatios: ["16:9", "1:1"],
    recommended: "16:9",
    maxFileSize: 512 * 1024 * 1024, // 512MB
    supportedFormats: ["image", "video"],
  },
};

// ─── Media Variant ──────────────────────────────────────────
export interface MediaVariant {
  id: string;
  fileName: string;
  aspectRatio: ResolutionKey;
  resolution: { width: number; height: number };
  fileSize: number;
  url: string;
  generatedAt: Date;
  format: "webp" | "jpg" | "mp4" | "mov";
}

// ─── Media File ─────────────────────────────────────────────
export interface MediaFile {
  id: string;
  originalFileName: string;
  mediaType: MediaType;
  originalResolution: { width: number; height: number };
  originalAspectRatio: number;
  fileSize: number;
  originalUrl: string;
  variants: MediaVariant[];
  autoOptimize: boolean;
  selectedPlatforms: SocialPlatform[];
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  uploadedAt: Date;
  processedAt?: Date;
  metadata: {
    duration?: number; // for videos
    frameRate?: number;
    codec?: string;
  };
}

// ─── Processing Options ─────────────────────────────────────
export interface ProcessingOptions {
  quality: number; // 1-100
  format: "webp" | "jpg" | "mp4";
  preserveMetadata: boolean;
  smartCrop: boolean;
}

export const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  quality: 80,
  format: "webp",
  preserveMetadata: true,
  smartCrop: false,
};

// ─── Batch Processing ───────────────────────────────────────
export interface ProcessingJob {
  id: string;
  mediaFileId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
