/**
 * Platform Mapping Logic
 * Intelligent aspect ratio selection for each platform
 */

import { SocialPlatform, ResolutionKey, PLATFORM_REQUIREMENTS } from "./types";

/**
 * Get recommended aspect ratio for a platform
 */
export function getRecommendedAspectRatio(
  platform: SocialPlatform
): ResolutionKey {
  return PLATFORM_REQUIREMENTS[platform].recommended;
}

/**
 * Get all supported aspect ratios for a platform
 */
export function getSupportedAspectRatios(
  platform: SocialPlatform
): ResolutionKey[] {
  return PLATFORM_REQUIREMENTS[platform].supportedAspectRatios;
}

/**
 * Find best matching aspect ratio for a platform given available options
 * Returns the best fit from available variants
 */
export function findBestAspectRatio(
  platform: SocialPlatform,
  availableAspectRatios: ResolutionKey[]
): ResolutionKey | null {
  const supported = getSupportedAspectRatios(platform);
  const recommended = getRecommendedAspectRatio(platform);

  // Priority 1: Exact match with recommended
  if (availableAspectRatios.includes(recommended)) {
    return recommended;
  }

  // Priority 2: Any supported ratio
  const match = availableAspectRatios.find((ratio) =>
    supported.includes(ratio)
  );
  if (match) return match;

  // Priority 3: First available
  return availableAspectRatios[0] || null;
}

/**
 * Auto-select best aspect ratio for multiple platforms
 * Returns mapping of platform → best aspect ratio
 */
export function autoSelectAspectRatios(
  platforms: SocialPlatform[],
  availableAspectRatios: ResolutionKey[]
): Record<SocialPlatform, ResolutionKey | null> {
  const mapping: Record<SocialPlatform, ResolutionKey | null> = {};

  for (const platform of platforms) {
    mapping[platform] = findBestAspectRatio(platform, availableAspectRatios);
  }

  return mapping;
}

/**
 * Group platforms by their recommended aspect ratio
 * Helps reduce required variants
 */
export function groupPlatformsByAspectRatio(
  platforms: SocialPlatform[]
): Record<ResolutionKey, SocialPlatform[]> {
  const groups: Record<ResolutionKey, SocialPlatform[]> = {};

  for (const platform of platforms) {
    const recommended = getRecommendedAspectRatio(platform);
    if (!groups[recommended]) {
      groups[recommended] = [];
    }
    groups[recommended].push(platform);
  }

  return groups;
}

/**
 * Get all unique aspect ratios needed for a platform list
 * Returns minimal set of variants to generate
 */
export function getRequiredAspectRatios(
  platforms: SocialPlatform[]
): Set<ResolutionKey> {
  const required = new Set<ResolutionKey>();

  for (const platform of platforms) {
    const recommended = getRecommendedAspectRatio(platform);
    required.add(recommended);
  }

  return required;
}

/**
 * Get platform requirements (for UI display)
 */
export function getPlatformInfo(platform: SocialPlatform) {
  return PLATFORM_REQUIREMENTS[platform];
}

/**
 * Validate if media can be used on a platform
 */
export function canUseOnPlatform(
  mediaType: "image" | "video",
  fileSize: number,
  platform: SocialPlatform
): { valid: boolean; reason?: string } {
  const req = PLATFORM_REQUIREMENTS[platform];

  // Check media type support
  if (!req.supportedFormats.includes(mediaType)) {
    return {
      valid: false,
      reason: `${req.name} does not support ${mediaType}s`,
    };
  }

  // Check file size
  if (fileSize > req.maxFileSize) {
    return {
      valid: false,
      reason: `File exceeds ${req.name} size limit (${(req.maxFileSize / 1024 / 1024).toFixed(0)}MB)`,
    };
  }

  return { valid: true };
}

/**
 * Get optimal variants for selected platforms
 * Minimizes processing by grouping similar aspect ratios
 */
export function getOptimalVariants(
  selectedPlatforms: SocialPlatform[]
): ResolutionKey[] {
  return Array.from(getRequiredAspectRatios(selectedPlatforms));
}

/**
 * Create platform → aspect ratio mapping
 * Used when assigning variants to platforms in the UI
 */
export function createPlatformMapping(
  platforms: SocialPlatform[],
  availableRatios: ResolutionKey[]
): Record<SocialPlatform, ResolutionKey> {
  const mapping: Record<SocialPlatform, ResolutionKey> = {};

  for (const platform of platforms) {
    const best = findBestAspectRatio(platform, availableRatios);
    if (best) {
      mapping[platform] = best;
    }
  }

  return mapping;
}
