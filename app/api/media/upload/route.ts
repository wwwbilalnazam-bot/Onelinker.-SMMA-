/**
 * Media Upload Endpoint
 * Handles media file upload and triggers optimization
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createMediaRecord,
  processMedia,
  uploadMediaToStorage,
  saveMediaMetadata,
} from "@/lib/media/media-optimizer";
import { SocialPlatform, ProcessingOptions } from "@/lib/media/types";

export const maxDuration = 300;

interface UploadRequest {
  fileName: string;
  selectedPlatforms: SocialPlatform[];
  autoOptimize?: boolean;
  processingOptions?: ProcessingOptions;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileName = formData.get("fileName") as string;
    const selectedPlatformsStr = formData.get("selectedPlatforms") as string;
    const autoOptimize = formData.get("autoOptimize") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const selectedPlatforms: SocialPlatform[] = selectedPlatformsStr
      ? JSON.parse(selectedPlatformsStr)
      : [];

    // Get workspace ID (from query or auth)
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID required" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create media record
    const mediaFile = await createMediaRecord(
      workspaceId,
      buffer,
      fileName || file.name,
      selectedPlatforms,
      autoOptimize
    );

    // Process media (generate variants)
    const processedMedia = await processMedia(mediaFile, buffer);

    if (processedMedia.status === "failed") {
      return NextResponse.json(
        { error: processedMedia.error },
        { status: 400 }
      );
    }

    // Upload to storage
    const variantBuffers = new Map();
    // In production, would map variant IDs to their buffers
    const uploadedMedia = await uploadMediaToStorage(
      workspaceId,
      processedMedia,
      buffer,
      variantBuffers
    );

    // Save metadata to database
    await saveMediaMetadata(workspaceId, uploadedMedia);

    return NextResponse.json({
      success: true,
      mediaFile: uploadedMedia,
      variants: uploadedMedia.variants,
    });
  } catch (error) {
    console.error("[Media Upload Error]", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
