"use client";

import React, { useCallback, useState } from "react";
import { Upload, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaUploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  accept?: string;
}

export function MediaUploadZone({
  onUpload,
  isLoading = false,
  error,
  accept = "image/*,video/*",
}: MediaUploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        try {
          setUploadProgress(0);
          await onUpload(file);
          setUploadProgress(100);
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }
    },
    [onUpload]
  );

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      if (files && files.length > 0) {
        try {
          setUploadProgress(0);
          await onUpload(files[0]);
          setUploadProgress(100);
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }
    },
    [onUpload]
  );

  return (
    <div className="w-full space-y-4">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all duration-200",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border/40 bg-muted/20 hover:border-border/60"
        )}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={isLoading}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center justify-center gap-3 p-8 sm:p-12">
          {isLoading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Optimizing media...
                </p>
                <p className="text-xs text-muted-foreground">
                  Generating variants for all platforms
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Upload media
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag and drop or click to select
                </p>
              </div>
            </>
          )}
        </div>

        {/* Progress bar */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="absolute bottom-0 left-0 h-1 bg-primary/20 rounded-b-xl overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {uploadProgress === 100 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Media uploaded and optimized
          </p>
        </div>
      )}
    </div>
  );
}
