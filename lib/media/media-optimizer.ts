/**
 * Media Optimizer Service
 * Main orchestration layer for media processing
 * Handles file detection, variant generation, and platform mapping
 */

import { createClient } from "@/lib/supabase/client";
import {
  MediaFile,
  MediaVariant,
  MediaType,
  SocialPlatform,
  ResolutionKey,
  ProcessingOptions,
  DEFAULT_PROCESSING_OPTIONS,
} from "./types";
import { generateImageVariants, detectImageDimensions } from "./image-processor";
import {
  generateVideoVariants,
  detectVideoInfo,
  getOptimalPreset,
} from "./video-processor";
import {
  getOptimalVariants,
  createPlatformMapping,
} from "./platform-mapping";

/**
 * Detect media type from buffer
 */
export function detectMediaType(buffer: Buffer): MediaType {
  // Check file signatures (magic bytes)
  if (buffer.length < 4) return "image";

  // JPEG: FF D8 FF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image";
  }

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image";
  }

  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    return "image";
  }

  // MP4: ... ftyp
  if (buffer.length > 8) {
    const ft = buffer.toString("utf8", 4, 8);
    if (ft === "ftyp") return "video";
  }

  // MOV: ... mdat or moov
  if (buffer.length > 8) {
    const ft = buffer.toString("utf8", 4, 8);
    if (ft === "mdat" || ft === "moov") return "video";
  }

  // Default based on extension
  return "image";
}

/**
 * Create media record with auto-optimization
 */
export async function createMediaRecord(
  workspaceId: string,
  buffer: Buffer,
  fileName: string,
  selectedPlatforms: SocialPlatform[],
  autoOptimize: boolean = true
): Promise<MediaFile> {
  const supabase = createClient();
  const mediaType = detectMediaType(buffer);

  let originalResolution = { width: 1080, height: 1080 };
  let duration = 0;

  if (mediaType === "image") {
    originalResolution = await detectImageDimensions(buffer);
  } else {
    // Save to temp file for FFmpeg
    const tmpPath = `/tmp/${Date.now()}_${fileName}`;
    await require("fs/promises").writeFile(tmpPath, buffer);
    const videoInfo = await detectVideoInfo(tmpPath);
    originalResolution = {
      width: videoInfo.width,
      height: videoInfo.height,
    };
    duration = videoInfo.duration;
    // Clean up
    await require("fs/promises").unlink(tmpPath);
  }

  const aspectRatio = originalResolution.width / originalResolution.height;

  const mediaFile: MediaFile = {
    id: `media_${Date.now()}`,
    originalFileName: fileName,
    mediaType,
    originalResolution,
    originalAspectRatio: aspectRatio,
    fileSize: buffer.length,
    originalUrl: "", // Will be set after upload
    variants: [],
    autoOptimize,
    selectedPlatforms,
    status: "pending",
    uploadedAt: new Date(),
    metadata: {
      duration: mediaType === "video" ? duration : undefined,
    },
  };

  return mediaFile;
}

/**
 * Process media and generate variants
 */
export async function processMedia(
  mediaFile: MediaFile,
  buffer: Buffer,
  options: ProcessingOptions = DEFAULT_PROCESSING_OPTIONS
): Promise<MediaFile> {
  try {
    mediaFile.status = "processing";

    // Determine which aspect ratios to generate
    const targetRatios = mediaFile.autoOptimize
      ? getOptimalVariants(mediaFile.selectedPlatforms)
      : ["1:1", "4:5", "9:16", "16:9"];

    const variants: MediaVariant[] = [];

    if (mediaFile.mediaType === "image") {
      // Process image variants
      const imageVariants = await generateImageVariants(
        buffer,
        targetRatios as ResolutionKey[],
        options
      );

      for (const variant of imageVariants) {
        variants.push({
          id: `variant_${Date.now()}_${variant.ratio}`,
          fileName: `${mediaFile.id}_${variant.ratio.replace(":", "-")}.webp`,
          aspectRatio: variant.ratio,
          resolution: {
            width: 1080,
            height: Math.round(1080 / (variant.ratio === "1:1" ? 1 : variant.ratio === "4:5" ? 0.8 : variant.ratio === "9:16" ? 0.5625 : 1.7777)),
          },
          fileSize: variant.size,
          url: "", // Will be set after upload
          generatedAt: new Date(),
          format: "webp",
        });
      }
    } else {
      // Process video variants
      // Create temp directory
      const tempDir = `/tmp/video_variants_${Date.now()}`;
      await require("fs/promises").mkdir(tempDir, { recursive: true });

      const preset = getOptimalPreset(mediaFile.fileSize / 1024 / 1024);
      const videoVariants = await generateVideoVariants(
        buffer.toString(), // Placeholder - in real implementation would be file path
        targetRatios as ResolutionKey[],
        tempDir,
        { crf: 25, preset }
      );

      for (const variant of videoVariants) {
        const variantBuffer = await require("fs/promises").readFile(
          variant.outputPath
        );
        variants.push({
          id: `variant_${Date.now()}_${variant.ratio}`,
          fileName: `${mediaFile.id}_${variant.ratio.replace(":", "-")}.mp4`,
          aspectRatio: variant.ratio,
          resolution: {
            width: 1080,
            height: 1920,
          },
          fileSize: variant.size,
          url: "", // Will be set after upload
          generatedAt: new Date(),
          format: "mp4",
        });
      }

      // Cleanup
      await require("fs/promises").rm(tempDir, { recursive: true });
    }

    mediaFile.variants = variants;
    mediaFile.status = "completed";
    mediaFile.processedAt = new Date();

    return mediaFile;
  } catch (error) {
    mediaFile.status = "failed";
    mediaFile.error = String(error);
    return mediaFile;
  }
}

/**
 * Get recommended format for platform
 */
export function getRecommendedFormatForPlatform(
  platform: SocialPlatform,
  mediaFile: MediaFile
): ResolutionKey | null {
  const platformMapping = createPlatformMapping(
    [platform],
    mediaFile.variants.map((v) => v.aspectRatio)
  );

  return platformMapping[platform] || null;
}

/**
 * Get all platform → variant mappings
 */
export function getPlatformVariantMappings(mediaFile: MediaFile) {
  const availableRatios = mediaFile.variants.map(
    (v) => v.aspectRatio
  );
  const platformMapping = createPlatformMapping(
    mediaFile.selectedPlatforms,
    availableRatios as ResolutionKey[]
  );

  return platformMapping;
}

/**
 * Upload media and variants to storage
 */
export async function uploadMediaToStorage(
  workspaceId: string,
  mediaFile: MediaFile,
  buffer: Buffer,
  variantBuffers: Map<string, Buffer>
): Promise<MediaFile> {
  const supabase = createClient();

  try {
    // Upload original
    const originalPath = `${workspaceId}/media/originals/${mediaFile.id}_${mediaFile.originalFileName}`;
    const { data: originalData } = await supabase.storage
      .from("workspace-media")
      .upload(originalPath, buffer, { upsert: true });

    if (originalData) {
      const { data } = supabase.storage
        .from("workspace-media")
        .getPublicUrl(originalPath);
      mediaFile.originalUrl = data.publicUrl;
    }

    // Upload variants
    for (const variant of mediaFile.variants) {
      const variantPath = `${workspaceId}/media/variants/${variant.fileName}`;
      const variantBuffer = variantBuffers.get(variant.id);

      if (variantBuffer) {
        const { data: variantData } = await supabase.storage
          .from("workspace-media")
          .upload(variantPath, variantBuffer, { upsert: true });

        if (variantData) {
          const { data } = supabase.storage
            .from("workspace-media")
            .getPublicUrl(variantPath);
          variant.url = data.publicUrl;
        }
      }
    }

    return mediaFile;
  } catch (error) {
    throw new Error(`Failed to upload media: ${error}`);
  }
}

/**
 * Save media file metadata to database
 */
export async function saveMediaMetadata(
  workspaceId: string,
  mediaFile: MediaFile
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("media_files").insert({
    id: mediaFile.id,
    workspace_id: workspaceId,
    original_file_name: mediaFile.originalFileName,
    media_type: mediaFile.mediaType,
    original_resolution: mediaFile.originalResolution,
    original_aspect_ratio: mediaFile.originalAspectRatio,
    file_size: mediaFile.fileSize,
    original_url: mediaFile.originalUrl,
    auto_optimize: mediaFile.autoOptimize,
    selected_platforms: mediaFile.selectedPlatforms,
    status: mediaFile.status,
    uploaded_at: mediaFile.uploadedAt,
    processed_at: mediaFile.processedAt,
    metadata: mediaFile.metadata,
  });

  if (error) throw error;

  // Save variants
  for (const variant of mediaFile.variants) {
    const { error: variantError } = await supabase
      .from("media_variants")
      .insert({
        id: variant.id,
        media_file_id: mediaFile.id,
        aspect_ratio: variant.aspectRatio,
        resolution: variant.resolution,
        file_size: variant.fileSize,
        url: variant.url,
        format: variant.format,
        generated_at: variant.generatedAt,
      });

    if (variantError) throw variantError;
  }
}
