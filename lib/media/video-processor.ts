/**
 * Video Processing Service
 * Handles video scaling, padding, compression, and thumbnail generation
 * Uses FFmpeg for processing
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { RESOLUTIONS, ResolutionKey } from "./types";
import fs from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

/**
 * Detect video dimensions and duration
 */
export async function detectVideoInfo(
  filePath: string
): Promise<{ width: number; height: number; duration: number; fps: number }> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,r_frame_rate",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      filePath,
    ]);

    const [videoLine, durationLine] = stdout.split("\n");
    const [width, height, fps] = videoLine.split(",");
    const duration = durationLine.trim();

    return {
      width: parseInt(width) || 1080,
      height: parseInt(height) || 1920,
      duration: parseFloat(duration) || 0,
      fps: parseFloat(fps?.split("/")[0] || "30") || 30,
    };
  } catch (error) {
    throw new Error(`Failed to detect video info: ${error}`);
  }
}

/**
 * Calculate padding dimensions to fit video into target aspect ratio
 * Maintains video content without cropping
 */
export function calculatePaddingDimensions(
  videoWidth: number,
  videoHeight: number,
  targetRatio: ResolutionKey
): {
  width: number;
  height: number;
  padTop: number;
  padBottom: number;
  padLeft: number;
  padRight: number;
} {
  const targetResolution = RESOLUTIONS[targetRatio];
  const targetAspectRatio = targetResolution.width / targetResolution.height;
  const videoAspectRatio = videoWidth / videoHeight;

  let scaledWidth = targetResolution.width;
  let scaledHeight = targetResolution.height;
  let padLeft = 0;
  let padRight = 0;
  let padTop = 0;
  let padBottom = 0;

  if (videoAspectRatio > targetAspectRatio) {
    // Video is wider than target, add vertical padding
    scaledHeight = Math.round(scaledWidth / videoAspectRatio);
    const totalPadding = targetResolution.height - scaledHeight;
    padTop = Math.floor(totalPadding / 2);
    padBottom = totalPadding - padTop;
  } else if (videoAspectRatio < targetAspectRatio) {
    // Video is taller than target, add horizontal padding
    scaledWidth = Math.round(scaledHeight * videoAspectRatio);
    const totalPadding = targetResolution.width - scaledWidth;
    padLeft = Math.floor(totalPadding / 2);
    padRight = totalPadding - padLeft;
  }

  return {
    width: targetResolution.width,
    height: targetResolution.height,
    padTop,
    padBottom,
    padLeft,
    padRight,
  };
}

/**
 * Process video: scale and add padding to match target aspect ratio
 */
export async function processVideo(
  inputPath: string,
  outputPath: string,
  targetRatio: ResolutionKey,
  options: { crf: number; preset: string } = { crf: 25, preset: "fast" }
): Promise<{ size: number }> {
  try {
    // Detect video info
    const videoInfo = await detectVideoInfo(inputPath);

    // Calculate padding dimensions
    const paddingDims = calculatePaddingDimensions(
      videoInfo.width,
      videoInfo.height,
      targetRatio
    );

    const resolution = RESOLUTIONS[targetRatio];

    // Build FFmpeg filter
    const scaleFilter = `scale=${paddingDims.width - paddingDims.padLeft - paddingDims.padRight}:${paddingDims.height - paddingDims.padTop - paddingDims.padBottom}:force_original_aspect_ratio=decrease`;

    const padFilter =
      paddingDims.padTop > 0 ||
      paddingDims.padBottom > 0 ||
      paddingDims.padLeft > 0 ||
      paddingDims.padRight > 0
        ? `pad=${paddingDims.width}:${paddingDims.height}:${paddingDims.padLeft}:${paddingDims.padTop}:black`
        : `pad=${resolution.width}:${resolution.height}`;

    const filter = `${scaleFilter},${padFilter}`;

    // FFmpeg command
    const args = [
      "-i",
      inputPath,
      "-vf",
      filter,
      "-c:v",
      "libx264",
      "-crf",
      String(options.crf),
      "-preset",
      options.preset,
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "faststart",
      "-y", // Overwrite output
      outputPath,
    ];

    await execFileAsync("ffmpeg", args);

    // Get output file size
    const stats = await fs.stat(outputPath);

    return { size: stats.size };
  } catch (error) {
    throw new Error(`Failed to process video: ${error}`);
  }
}

/**
 * Process multiple video variants
 */
export async function generateVideoVariants(
  inputPath: string,
  targetRatios: ResolutionKey[],
  outputDir: string,
  options: { crf: number; preset: string } = { crf: 25, preset: "fast" }
): Promise<{ ratio: ResolutionKey; outputPath: string; size: number }[]> {
  const variants = [];
  const fileName = path.basename(inputPath, path.extname(inputPath));

  for (const ratio of targetRatios) {
    try {
      const outputPath = path.join(
        outputDir,
        `${fileName}_${ratio.replace(":", "-")}.mp4`
      );
      const result = await processVideo(inputPath, outputPath, ratio, options);

      variants.push({
        ratio,
        outputPath,
        size: result.size,
      });
    } catch (error) {
      console.error(`Failed to generate variant for ${ratio}:`, error);
      // Continue processing other variants
    }
  }

  return variants;
}

/**
 * Generate video thumbnail
 */
export async function generateVideoThumbnail(
  inputPath: string,
  outputPath: string,
  timeSeconds: number = 0
): Promise<void> {
  try {
    const args = [
      "-i",
      inputPath,
      "-ss",
      String(timeSeconds),
      "-vframes",
      "1",
      "-vf",
      "scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2",
      "-y",
      outputPath,
    ];

    await execFileAsync("ffmpeg", args);
  } catch (error) {
    throw new Error(`Failed to generate video thumbnail: ${error}`);
  }
}

/**
 * Extract video info without processing
 */
export async function getVideoInfo(inputPath: string) {
  const info = await detectVideoInfo(inputPath);
  const stats = await fs.stat(inputPath);

  return {
    width: info.width,
    height: info.height,
    duration: info.duration,
    fps: info.fps,
    fileSize: stats.size,
  };
}

/**
 * Get optimal FFmpeg preset based on file size
 * Trade-off between quality and speed
 */
export function getOptimalPreset(fileSizeMB: number): string {
  if (fileSizeMB > 500) return "ultrafast";
  if (fileSizeMB > 200) return "superfast";
  if (fileSizeMB > 100) return "veryfast";
  if (fileSizeMB > 50) return "faster";
  return "fast";
}

/**
 * Validate video file with FFmpeg
 */
export async function validateVideoFile(filePath: string): Promise<boolean> {
  try {
    const { stderr } = await execFileAsync("ffmpeg", [
      "-v",
      "error",
      "-i",
      filePath,
      "-f",
      "null",
      "-",
    ]);

    return !stderr || stderr.length === 0;
  } catch {
    return false;
  }
}
