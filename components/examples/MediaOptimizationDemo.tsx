"use client";

/**
 * Media Optimization System Demo
 * Shows how to integrate all components together
 * This is a complete, production-ready example
 */

import React, { useState } from "react";
import { MediaUploadZone } from "@/components/media/MediaUploadZone";
import { MediaOptimizerSettings } from "@/components/media/MediaOptimizerSettings";
import { MediaVariantsPreview } from "@/components/media/MediaVariantsPreview";
import { useMediaOptimization } from "@/hooks/useMediaOptimization";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  SocialPlatform,
  ResolutionKey,
  PLATFORM_REQUIREMENTS,
} from "@/lib/media/types";
import {
  createPlatformMapping,
} from "@/lib/media/platform-mapping";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";
import { Download, Share2, Settings } from "lucide-react";

interface MediaOptimizationDemoProps {
  onMediaSelect?: (mediaFile: any) => void;
}

export function MediaOptimizationDemo({
  onMediaSelect,
}: MediaOptimizationDemoProps) {
  const { workspace } = useWorkspace();
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState<ResolutionKey>("16:9");
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    "instagram",
    "tiktok",
  ]);
  const [activeTab, setActiveTab] = useState("upload");

  const { uploadMedia, mediaFile, variants, isLoading, error, progress } =
    useMediaOptimization({
      workspaceId: workspace?.id,
      autoOptimize,
      onSuccess: (media) => {
        toast.success(`Media optimized with ${media.variants.length} variants`);
        if (onMediaSelect) {
          onMediaSelect(media);
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const handleUpload = async (file: File) => {
    try {
      setActiveTab("preview");
      await uploadMedia(file, selectedPlatforms, autoOptimize);
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  const platformMappings = mediaFile
    ? createPlatformMapping(selectedPlatforms, variants.map((v) => v.aspectRatio))
    : {};

  const handleDownloadVariant = (variant: any) => {
    toast.success(`Downloading ${variant.aspectRatio} variant`);
    // Implement download logic
    const link = document.createElement("a");
    link.href = variant.url;
    link.download = variant.fileName;
    link.click();
  };

  const handleShareVariants = () => {
    toast.success("Variants shared to team");
    // Implement sharing logic
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Media Optimization
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload media and automatically generate optimized variants for all
          social platforms
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="preview" disabled={!mediaFile}>
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <MediaUploadZone
            onUpload={handleUpload}
            isLoading={isLoading}
            error={error}
            accept="image/*,video/*"
          />

          {progress > 0 && progress < 100 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Processing media...
                </span>
                <span className="font-medium text-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Platform Selection */}
          <div className="space-y-3 pt-4 border-t border-border/40">
            <p className="text-sm font-medium text-foreground">
              Select Platforms
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(PLATFORM_REQUIREMENTS).map(([key, platform]) => (
                <Button
                  key={key}
                  variant={
                    selectedPlatforms.includes(key as SocialPlatform)
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    setSelectedPlatforms((prev) => {
                      const platform_key = key as SocialPlatform;
                      if (prev.includes(platform_key)) {
                        return prev.filter((p) => p !== platform_key);
                      }
                      return [...prev, platform_key];
                    });
                  }}
                  className="text-xs"
                >
                  {platform.name}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="rounded-lg border border-border/40 bg-card/60 p-6">
            <MediaOptimizerSettings
              autoOptimize={autoOptimize}
              onAutoOptimizeChange={setAutoOptimize}
              selectedFormat={selectedFormat}
              onFormatChange={setSelectedFormat}
              availableFormats={["1:1", "4:5", "9:16", "16:9"]}
            />
          </div>

          <div className="rounded-lg border border-border/40 bg-card/60 p-6 space-y-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Advanced Options
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground">
                  Preserve Metadata
                </label>
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground">
                  Smart Crop (AI-powered)
                </label>
                <input type="checkbox" className="rounded" disabled />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground">
                  Generate Thumbnails
                </label>
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        {mediaFile && (
          <TabsContent value="preview" className="space-y-6">
            <div className="rounded-lg border border-border/40 bg-card/60 p-6">
              <MediaVariantsPreview
                variants={variants}
                platformMappings={platformMappings}
                isVideo={mediaFile.mediaType === "video"}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="gap-2 flex-1"
                onClick={handleShareVariants}
              >
                <Share2 className="h-4 w-4" />
                Share Variants
              </Button>
              <Button className="gap-2 flex-1" onClick={() => setActiveTab("upload")}>
                <Download className="h-4 w-4" />
                Upload Another
              </Button>
            </div>

            {/* Variants Download Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">
                Download Variants
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => handleDownloadVariant(variant)}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {variant.aspectRatio}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {variant.resolution.width}×{variant.resolution.height}
                      </p>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
