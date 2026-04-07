/**
 * Image Processing Service
 * Handles image resizing, cropping, compression, and format conversion
 */

import Sharp from "sharp";
import { RESOLUTIONS, ResolutionKey, ProcessingOptions } from "./types";

/**
 * Detect image dimensions
 */
export async function detectImageDimensions(
  buffer: Buffer
): Promise<{ width: number; height: number }> {
  try {
    const metadata = await Sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  } catch (error) {
    throw new Error(`Failed to detect image dimensions: ${error}`);
  }
}

/**
 * Calculate aspect ratio from dimensions
 */
export function calculateAspectRatio(
  width: number,
  height: number
): number {
  return width / height;
}

/**
 * Find closest matching aspect ratio
 */
export function findClosestAspectRatio(
  actualRatio: number,
  targetRatios: ResolutionKey[]
): ResolutionKey {
  const aspectRatioMap: Record<ResolutionKey, number> = {
    "1:1": 1,
    "4:5": 0.8,
    "9:16": 0.5625,
    "16:9": 1.7777,
    "16:9-hd": 1.7777,
    "1.91:1": 1.91,
  };

  let closest = targetRatios[0];
  let minDiff = Math.abs(aspectRatioMap[closest] - actualRatio);

  for (const ratio of targetRatios) {
    const diff = Math.abs(aspectRatioMap[ratio] - actualRatio);
    if (diff < minDiff) {
      minDiff = diff;
      closest = ratio;
    }
  }

  return closest;
}

/**
 * Calculate crop dimensions to match target aspect ratio
 * Centers the crop on the image
 */
export function calculateCropDimensions(
  originalWidth: number,
  originalHeight: number,
  targetAspectRatio: number
): {
  width: number;
  height: number;
  left: number;
  top: number;
} {
  const originalRatio = originalWidth / originalHeight;

  let cropWidth = originalWidth;
  let cropHeight = originalHeight;

  if (originalRatio > targetAspectRatio) {
    // Image is too wide, crop width
    cropWidth = Math.round(originalHeight * targetAspectRatio);
  } else if (originalRatio < targetAspectRatio) {
    // Image is too tall, crop height
    cropHeight = Math.round(originalWidth / targetAspectRatio);
  }

  // Center the crop
  const left = Math.round((originalWidth - cropWidth) / 2);
  const top = Math.round((originalHeight - cropHeight) / 2);

  return {
    width: cropWidth,
    height: cropHeight,
    left,
    top,
  };
}

/**
 * Process image: resize, crop, and compress
 */
export async function processImage(
  buffer: Buffer,
  targetRatio: ResolutionKey,
  options: ProcessingOptions = { quality: 80, format: "webp", preserveMetadata: true, smartCrop: false }
): Promise<Buffer> {
  try {
    const metadata = await Sharp(buffer).metadata();
    const originalWidth = metadata.width || 1080;
    const originalHeight = metadata.height || 1080;

    const targetResolution = RESOLUTIONS[targetRatio];
    const targetAspectRatio = targetResolution.width / targetResolution.height;

    // Calculate crop dimensions
    const cropDims = calculateCropDimensions(
      originalWidth,
      originalHeight,
      targetAspectRatio
    );

    // Build processing pipeline
    let pipeline = Sharp(buffer);

    // Crop to target aspect ratio
    if (cropDims.width > 0 && cropDims.height > 0) {
      pipeline = pipeline.extract({
        left: cropDims.left,
        top: cropDims.top,
        width: cropDims.width,
        height: cropDims.height,
      });
    }

    // Resize to target resolution
    pipeline = pipeline.resize(
      targetResolution.width,
      targetResolution.height,
      {
        fit: "fill",
        withoutEnlargement: false,
      }
    );

    // Convert format
    if (options.format === "webp") {
      pipeline = pipeline.webp({ quality: options.quality });
    } else if (options.format === "jpg") {
      pipeline = pipeline.jpeg({ quality: options.quality, progressive: true });
    }

    // Process
    const processedBuffer = await pipeline.toBuffer();
    return processedBuffer;
  } catch (error) {
    throw new Error(`Failed to process image: ${error}`);
  }
}

/**
 * Generate multiple variants of an image
 */
export async function generateImageVariants(
  buffer: Buffer,
  targetRatios: ResolutionKey[],
  options: ProcessingOptions
): Promise<{ ratio: ResolutionKey; buffer: Buffer; size: number }[]> {
  const variants = [];

  for (const ratio of targetRatios) {
    try {
      const processedBuffer = await processImage(buffer, ratio, options);
      variants.push({
        ratio,
        buffer: processedBuffer,
        size: processedBuffer.length,
      });
    } catch (error) {
      console.error(`Failed to generate variant for ${ratio}:`, error);
      // Continue processing other variants
    }
  }

  return variants;
}

/**
 * Generate thumbnail from image
 */
export async function generateImageThumbnail(
  buffer: Buffer,
  width: number = 200,
  height: number = 200
): Promise<Buffer> {
  return Sharp(buffer)
    .resize(width, height, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Compress image to specific file size target
 */
export async function compressImageToSize(
  buffer: Buffer,
  targetSizeMB: number
): Promise<Buffer> {
  const targetSizeBytes = targetSizeMB * 1024 * 1024;
  let quality = 85;
  let processed = buffer;

  while (processed.length > targetSizeBytes && quality > 20) {
    processed = await Sharp(buffer)
      .webp({ quality: quality })
      .toBuffer();
    quality -= 5;
  }

  return processed;
}

/**
 * Get image info without full processing
 */
export async function getImageInfo(buffer: Buffer) {
  const metadata = await Sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format,
    space: metadata.space,
    channels: metadata.channels,
    depth: metadata.depth,
    density: metadata.density,
    hasAlpha: metadata.hasAlpha,
    orientation: metadata.orientation,
    isProgressive: metadata.isProgressive,
  };
}
