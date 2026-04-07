/**
 * Media Auto-Format Detection System
 * 
 * This utility detects the most suitable posting format for a given piece of media
 * across different social media platforms by comparing aspect ratios.
 */

export interface FormatConfig {
  id: string;
  label: string;
  category: "post" | "reel" | "story" | "video" | "short"; // Grouping for UI like Buffer
  aspect: string; // CSS aspect-ratio value like "16 / 9"
  [key: string]: any;
}

/**
 * Parses a string aspect ratio (e.g., "16 / 9" or "4 / 5") into a decimal number.
 * Handles edge cases like invalid strings or division by zero.
 */
export function parseAspectRatio(aspectStr: string): number {
  if (!aspectStr) return 1;
  try {
    // Split by '/' or ':' and parse parts
    const parts = aspectStr.split(/[\/:]/).map(p => parseFloat(p.trim()));
    const first = parts[0];
    const second = parts[1];

    if (parts.length === 2 && first !== undefined && second !== undefined && first > 0 && second > 0) {
      return first / second;
    }
    // Fallback if it's a single number
    if (parts.length === 1 && first !== undefined && !isNaN(first)) {
      return first;
    }
    return 1;
  } catch (error) {
    console.error(`[media-utils] Failed to parse aspect ratio: ${aspectStr}`, error);
    return 1;
  }
}

/**
 * Finds the format whose aspect ratio is closest to the media's natural ratio.
 * Can be restricted to a specific category.
 * 
 * @param width - Natural width of the media
 * @param height - Natural height of the media
 * @param formats - List of available formats for a platform
 * @param preferredCategory - If provided, only consider formats in this category
 * @returns The ID of the best matching format
 */
export function findBestFormat(
  width: number,
  height: number,
  formats: FormatConfig[],
  preferredCategory?: string
): string | null {
  if (!width || !height || height === 0 || !formats || formats.length === 0) {
    return formats?.[0]?.id || null;
  }

  const mediaRatio = width / height;
  
  // Filter formats by category if requested
  const filteredFormats = preferredCategory 
    ? formats.filter(f => f.category === preferredCategory)
    : formats;
  
  // If no formats in preferred category, fallback to all formats
  const candidates = filteredFormats.length > 0 ? filteredFormats : formats;

  let bestFormat = candidates[0];
  if (!bestFormat) return null;

  let bestDiff = Math.abs(parseAspectRatio(bestFormat.aspect) - mediaRatio);

  for (let i = 1; i < candidates.length; i++) {
    const fmt = candidates[i];
    if (!fmt) continue;

    const fmtRatio = parseAspectRatio(fmt.aspect);
    const diff = Math.abs(fmtRatio - mediaRatio);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestFormat = fmt;
    }
  }

  return bestFormat.id;
}

/**
 * Automatically detects the best placement (Post, Reel, Story) and format.
 * Mimics Buffer's behavior by switching categories based on media content.
 */
export function detectAllPlatformFormats<T extends string>(
  width: number,
  height: number,
  mediaType: "image" | "video",
  selectedPlatforms: T[],
  platformFormatsMap: Record<T, FormatConfig[]>
): Partial<Record<T, string>> {
  const result: Partial<Record<T, string>> = {};

  if (!width || !height || width <= 0 || height <= 0) return result;

  const ratio = width / height;
  const isVertical = ratio < 0.8; // Roughly 4:5 or narrower

  selectedPlatforms.forEach(platformId => {
    const formats = platformFormatsMap[platformId];
    if (!formats || formats.length === 0) return;

    // Determine target category based on media
    let targetCategory: "post" | "reel" | "story" | "video" | "short" = "post";
    
    if (isVertical) {
      if (mediaType === "video") {
        // Favor Reel/Short for vertical video
        targetCategory = formats.some(f => f.category === "reel") ? "reel" : 
                        formats.some(f => f.category === "short") ? "short" : "post";
      } else {
        // Favor Story for vertical images
        targetCategory = formats.some(f => f.category === "story") ? "story" : "post";
      }
    } else {
      // Horizontal media always goes to Post/Video
      targetCategory = formats.some(f => f.category === "video") ? "video" : "post";
    }

    const bestId = findBestFormat(width, height, formats, targetCategory);
    if (bestId) {
      result[platformId] = bestId;
    }
  });

  return result;
}
