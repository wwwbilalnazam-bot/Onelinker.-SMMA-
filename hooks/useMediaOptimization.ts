/**
 * useMediaOptimization Hook
 * Provides media optimization functionality throughout the app
 */

import { useState, useCallback } from "react";
import {
  MediaFile,
  MediaVariant,
  SocialPlatform,
  ResolutionKey,
  ProcessingOptions,
} from "@/lib/media/types";

export interface UseMediaOptimizationOptions {
  workspaceId?: string;
  autoOptimize?: boolean;
  onSuccess?: (mediaFile: MediaFile) => void;
  onError?: (error: Error) => void;
}

export function useMediaOptimization(
  options: UseMediaOptimizationOptions = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [variants, setVariants] = useState<MediaVariant[]>([]);
  const [progress, setProgress] = useState(0);

  /**
   * Upload and optimize media file
   */
  const uploadMedia = useCallback(
    async (
      file: File,
      selectedPlatforms: SocialPlatform[],
      autoOptimize: boolean = options.autoOptimize ?? true
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        setProgress(0);

        if (!options.workspaceId) {
          throw new Error("Workspace ID is required");
        }

        // Create FormData
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileName", file.name);
        formData.append(
          "selectedPlatforms",
          JSON.stringify(selectedPlatforms)
        );
        formData.append("autoOptimize", String(autoOptimize));

        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) clearInterval(progressInterval);
            return prev + Math.random() * 30;
          });
        }, 500);

        // Upload
        const response = await fetch(
          `/api/media/upload?workspaceId=${options.workspaceId}`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        const data = await response.json();
        clearInterval(progressInterval);
        setProgress(100);

        setMediaFile(data.mediaFile);
        setVariants(data.variants || []);

        // Call success callback
        if (options.onSuccess) {
          options.onSuccess(data.mediaFile);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error.message);

        if (options.onError) {
          options.onError(error);
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  /**
   * Get best variant for a platform
   */
  const getBestVariant = useCallback(
    (platform: SocialPlatform): MediaVariant | null => {
      if (!variants.length) return null;

      // Find exact match first
      const exact = variants.find((v) => {
        // Map platform to aspect ratio
        const platformAspectMap: Record<SocialPlatform, ResolutionKey> = {
          instagram: "1:1",
          "instagram-reels": "9:16",
          "instagram-stories": "9:16",
          tiktok: "9:16",
          "youtube-shorts": "9:16",
          "youtube-standard": "16:9",
          facebook: "1.91:1",
          linkedin: "16:9",
          twitter: "16:9",
        };

        return v.aspectRatio === platformAspectMap[platform];
      });

      if (exact) return exact;

      // Return first available
      return variants[0] || null;
    },
    [variants]
  );

  /**
   * Get variant by aspect ratio
   */
  const getVariantByRatio = useCallback(
    (ratio: ResolutionKey): MediaVariant | null => {
      return variants.find((v) => v.aspectRatio === ratio) || null;
    },
    [variants]
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setMediaFile(null);
    setVariants([]);
    setError(null);
    setProgress(0);
  }, []);

  return {
    // State
    isLoading,
    error,
    mediaFile,
    variants,
    progress,

    // Actions
    uploadMedia,
    getBestVariant,
    getVariantByRatio,
    reset,

    // Computed
    hasVariants: variants.length > 0,
    totalSize: variants.reduce((sum, v) => sum + v.fileSize, 0),
  };
}

/**
 * Hook to get platform-specific variant recommendations
 */
export function usePlatformVariants(
  platforms: SocialPlatform[],
  variants: MediaVariant[]
) {
  return useCallback(() => {
    const mapping: Record<SocialPlatform, MediaVariant | null> = {};

    const platformAspectMap: Record<SocialPlatform, ResolutionKey> = {
      instagram: "1:1",
      "instagram-reels": "9:16",
      "instagram-stories": "9:16",
      tiktok: "9:16",
      "youtube-shorts": "9:16",
      "youtube-standard": "16:9",
      facebook: "1.91:1",
      linkedin: "16:9",
      twitter: "16:9",
    };

    for (const platform of platforms) {
      const targetRatio = platformAspectMap[platform];
      const variant = variants.find((v) => v.aspectRatio === targetRatio);
      mapping[platform] = variant || null;
    }

    return mapping;
  }, [platforms, variants]);
}
