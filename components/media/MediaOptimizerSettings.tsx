"use client";

import React, { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Square,
  Smartphone,
  Monitor,
  ArrowDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResolutionKey, RESOLUTIONS } from "@/lib/media/types";

interface MediaOptimizerSettingsProps {
  autoOptimize: boolean;
  onAutoOptimizeChange: (enabled: boolean) => void;
  selectedFormat?: ResolutionKey;
  onFormatChange?: (format: ResolutionKey) => void;
  availableFormats?: ResolutionKey[];
}

const FORMAT_OPTIONS: {
  id: ResolutionKey;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "1:1",
    label: "Square",
    icon: <Square className="h-5 w-5" />,
    description: "1080×1080 - Instagram, Facebook",
  },
  {
    id: "4:5",
    label: "Portrait",
    icon: <Smartphone className="h-5 w-5" />,
    description: "1080×1350 - Instagram Feed",
  },
  {
    id: "9:16",
    label: "Vertical",
    icon: <ArrowDown className="h-5 w-5" />,
    description: "1080×1920 - Stories, Reels, TikTok",
  },
  {
    id: "16:9",
    label: "Landscape",
    icon: <Monitor className="h-5 w-5" />,
    description: "1280×720 - YouTube, LinkedIn, Twitter",
  },
];

export function MediaOptimizerSettings({
  autoOptimize,
  onAutoOptimizeChange,
  selectedFormat = "16:9",
  onFormatChange,
  availableFormats = ["1:1", "4:5", "9:16", "16:9"],
}: MediaOptimizerSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Auto Optimize Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Auto Optimize for Platforms
            </p>
            <p className="text-xs text-muted-foreground">
              Automatically generate optimal variants for selected platforms
            </p>
          </div>
          <Toggle
            pressed={autoOptimize}
            onPressedChange={onAutoOptimizeChange}
            className="data-[state=on]:bg-primary data-[state=on]:text-white"
          >
            {autoOptimize ? (
              <Check className="h-4 w-4" />
            ) : (
              <span className="text-xs">OFF</span>
            )}
          </Toggle>
        </div>
      </div>

      {/* Manual Format Selection (shown when auto-optimize is off) */}
      {!autoOptimize && onFormatChange && (
        <div className="space-y-3 pt-4 border-t border-border/40">
          <p className="text-sm font-medium text-foreground">
            Select Format
          </p>

          <div className="grid grid-cols-2 gap-2">
            {FORMAT_OPTIONS.filter((fmt) =>
              availableFormats.includes(fmt.id)
            ).map((format) => (
              <Button
                key={format.id}
                variant={selectedFormat === format.id ? "default" : "outline"}
                className="h-auto flex-col items-start justify-start gap-2 p-3"
                onClick={() => onFormatChange(format.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="text-muted-foreground">
                    {format.icon}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-medium leading-none">
                      {format.label}
                    </p>
                  </div>
                  {selectedFormat === format.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {format.description}
                </p>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Format Preview Grid */}
      {autoOptimize && (
        <div className="space-y-3 pt-4 border-t border-border/40">
          <p className="text-sm font-medium text-foreground">
            Generated Formats
          </p>

          <div className="grid grid-cols-2 gap-2">
            {FORMAT_OPTIONS.map((format) => (
              <div
                key={format.id}
                className={cn(
                  "rounded-lg border p-3 space-y-2 transition-all",
                  availableFormats.includes(format.id)
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/40 bg-muted/20 opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-muted-foreground",
                      availableFormats.includes(format.id) &&
                        "text-primary"
                    )}
                  >
                    {format.icon}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-medium">{format.label}</p>
                  </div>
                  {availableFormats.includes(format.id) && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {RESOLUTIONS[format.id].width}×
                  {RESOLUTIONS[format.id].height}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality Settings */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Quality</p>
          <div className="flex gap-2">
            {[
              { label: "High", value: 95 },
              { label: "Standard", value: 80 },
              { label: "Compact", value: 60 },
            ].map((q) => (
              <Button
                key={q.value}
                variant="outline"
                size="sm"
                className="text-xs flex-1"
              >
                {q.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Balanced quality and file size for optimal platform performance
          </p>
        </div>
      </div>
    </div>
  );
}
