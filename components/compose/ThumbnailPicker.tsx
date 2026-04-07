"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Image as ImageIcon, Upload, Film, Check, Loader2, Info, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlatformThumbnailRule {
  platform: string;
  label: string;
  supportsCustom: boolean;
  supportsFrameSelect: boolean;
  maxSizeMB: number;
  recommendedSize: string;
  aspectRatio: string;
  formats: string[];
  note?: string;
}

export const THUMBNAIL_RULES: Record<string, PlatformThumbnailRule> = {
  youtube: { platform: "youtube", label: "YouTube", supportsCustom: true, supportsFrameSelect: true, maxSizeMB: 2, recommendedSize: "1280×720", aspectRatio: "16:9", formats: ["JPG", "PNG"] },
  instagram: { platform: "instagram", label: "Instagram", supportsCustom: false, supportsFrameSelect: true, maxSizeMB: 0, recommendedSize: "1080×1080", aspectRatio: "1:1", formats: [] },
  facebook: { platform: "facebook", label: "Facebook", supportsCustom: false, supportsFrameSelect: true, maxSizeMB: 0, recommendedSize: "1200×630", aspectRatio: "16:9", formats: [] },
  tiktok: { platform: "tiktok", label: "TikTok", supportsCustom: false, supportsFrameSelect: true, maxSizeMB: 0, recommendedSize: "1080×1920", aspectRatio: "9:16", formats: [] },
  linkedin: { platform: "linkedin", label: "LinkedIn", supportsCustom: false, supportsFrameSelect: false, maxSizeMB: 0, recommendedSize: "", aspectRatio: "", formats: [] },
  twitter: { platform: "twitter", label: "X (Twitter)", supportsCustom: false, supportsFrameSelect: false, maxSizeMB: 0, recommendedSize: "", aspectRatio: "", formats: [] },
};

export interface ThumbnailData {
  type: "frame" | "custom" | "none";
  frameOffset: number;
  previewUrl: string;
  customFile: File | null;
  uploadedUrl: string;
}

export const EMPTY_THUMBNAIL: ThumbnailData = { type: "none", frameOffset: 0, previewUrl: "", customFile: null, uploadedUrl: "" };

interface ThumbnailPickerProps {
  videoSrc: string;
  videoDuration: number;
  platforms: string[];
  value: ThumbnailData;
  onChange: (data: ThumbnailData) => void;
  aspectRatio?: string;
  className?: string;
}

const FRAME_COUNT = 5;

function formatTime(sec: number): string {
  if (isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ThumbnailPicker({
  videoSrc,
  videoDuration,
  platforms,
  value,
  onChange,
  aspectRatio = "16 / 9",
  className,
}: ThumbnailPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [mode, setMode] = useState<"frame" | "custom">(value.type === "custom" ? "custom" : "frame");
  const scrubTimer = useRef<ReturnType<typeof setTimeout>>();

  const activeRules = platforms.map(p => THUMBNAIL_RULES[p]).filter(Boolean) as PlatformThumbnailRule[];
  const anySupportsCustom = activeRules.some(r => r.supportsCustom);
  const anySupportsFrame = activeRules.some(r => r.supportsFrameSelect);
  const allAutoOnly = activeRules.every(r => !r.supportsCustom && !r.supportsFrameSelect);

  // High-performance frame capture with "Anti-Black-Frame" logic
  const captureFrame = useCallback(async (time: number): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = videoSrc;
      video.currentTime = Math.max(0.1, Math.min(time, videoDuration - 0.1));

      const performDraw = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(""); return; }

        const parts = aspectRatio.split(/[\/:]/).map(p => parseFloat(p.trim()));
        const ratio = parts.length === 2 && parts[0]! > 0 && parts[1]! > 0 ? parts[0]! / parts[1]! : 16 / 9;

        canvas.width = 640; 
        canvas.height = Math.round(640 / ratio);

        const vRatio = video.videoWidth / video.videoHeight;
        const cRatio = canvas.width / canvas.height;
        
        let dW, dH, dX, dY;
        if (vRatio > cRatio) { dH = video.videoHeight; dW = dH * cRatio; dX = (video.videoWidth - dW) / 2; dY = 0; }
        else { dW = video.videoWidth; dH = dW / cRatio; dX = 0; dY = (video.videoHeight - dH) / 2; }

        ctx.drawImage(video, dX, dY, dW, dH, 0, 0, canvas.width, canvas.height);
        
        // Final sanity check for black frames (alpha values or average color could be checked, 
        // but usually a small delay before draw is enough)
        resolve(canvas.toDataURL("image/jpeg", 0.85));
        video.remove();
      };

      video.onseeked = () => {
        // Small delay after seeked to ensure frame buffer is updated
        setTimeout(() => {
          if (video.readyState >= 2) performDraw();
          else video.oncanplay = performDraw;
        }, 60);
      };
      
      video.onerror = () => { resolve(""); video.remove(); };
      setTimeout(() => { if (video.parentNode) { video.remove(); resolve(""); } }, 4000);
    });
  }, [videoSrc, aspectRatio, videoDuration]);

  // Initial frames gen
  useEffect(() => {
    if (!videoSrc || videoDuration <= 0 || !anySupportsFrame) return;
    setGenerating(true);
    const gen = async () => {
      const thumbs: string[] = [];
      const intervals = [0.1, 0.25, 0.5, 0.75, 0.95];
      for (const pct of intervals) {
        const url = await captureFrame(videoDuration * pct);
        if (url) thumbs.push(url);
      }
      setFrames(thumbs);
      setGenerating(false);
      
      // Select the first valid thumbnail as default
      if (value.type === "none" && thumbs.length > 0) {
        onChange({ 
          type: "frame", 
          frameOffset: videoDuration * intervals[0]!, 
          previewUrl: thumbs[0]!, 
          customFile: null, 
          uploadedUrl: "" 
        });
      }
    };
    gen();
  }, [videoSrc, videoDuration, aspectRatio, anySupportsFrame]);

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    // UI update immediate for smoothness
    onChange({ ...value, frameOffset: time });
    
    if (scrubTimer.current) clearTimeout(scrubTimer.current);
    scrubTimer.current = setTimeout(async () => {
      setScrubbing(true);
      const preview = await captureFrame(time);
      if (preview) {
        onChange({ 
          type: "frame", 
          frameOffset: time, 
          previewUrl: preview, 
          customFile: null, 
          uploadedUrl: value.uploadedUrl 
        });
      }
      setScrubbing(false);
    }, 150);
  };

  const handleSelectPreset = async (index: number) => {
    const intervals = [0.1, 0.25, 0.5, 0.75, 0.95];
    const time = videoDuration * (intervals[index] || 0);
    const preview = frames[index];
    if (preview) {
      onChange({ type: "frame", frameOffset: time, previewUrl: preview, customFile: null, uploadedUrl: "" });
    }
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxMB = Math.max(...activeRules.filter(r => r.supportsCustom).map(r => r.maxSizeMB));
    if (file.size > maxMB * 1024 * 1024) return;
    const previewUrl = URL.createObjectURL(file);
    onChange({ type: "custom", frameOffset: 0, previewUrl, customFile: file, uploadedUrl: "" });
    setMode("custom");
    e.target.value = "";
  };

  if (allAutoOnly) return null;

  const isVertical = aspectRatio === "9 / 16" || aspectRatio === "4 / 5";

  return (
    <div className={cn("rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md p-4 space-y-4 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Film className="h-3 w-3" /> Video Thumbnail
        </label>
        <div className="flex items-center gap-0.5 rounded-lg bg-muted/20 p-0.5 border border-border/10">
          <button onClick={() => setMode("frame")} className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold transition-all", mode === "frame" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>Frames</button>
          {anySupportsCustom && <button onClick={() => setMode("custom")} className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold transition-all", mode === "custom" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>Custom</button>}
        </div>
      </div>

      <div className={cn("grid grid-cols-1 gap-5", isVertical ? "md:grid-cols-[140px_1fr]" : "md:grid-cols-[200px_1fr]")}>
        {/* COMPACT PREVIEW SECTION */}
        <div className="space-y-3">
          <div 
            className="group relative rounded-xl overflow-hidden border border-border/50 bg-black shadow-lg mx-auto md:mx-0 transition-transform active:scale-95 duration-200"
            style={{ aspectRatio, maxHeight: "200px" }}
          >
            {value.previewUrl ? (
              <img src={value.previewUrl} className="w-full h-full object-cover animate-in fade-in duration-300" key={value.previewUrl} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
              </div>
            )}
            {scrubbing && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
            )}
            <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary/90 flex items-center justify-center shadow-lg border border-white/20">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
          <div className="text-[9px] font-black text-primary bg-primary/10 py-1.5 rounded-lg text-center border border-primary/20 tracking-widest uppercase">
            ACTIVE COVER
          </div>
        </div>

        {/* CONTROLS SECTION */}
        <div className="flex flex-col justify-center space-y-5">
          {mode === "frame" ? (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  <span>SCRUBBER</span>
                  <div className="bg-primary/90 text-white px-2 py-0.5 rounded-md font-mono text-[11px] shadow-sm">
                    {formatTime(value.frameOffset)}
                  </div>
                </div>
                <div className="px-1">
                  <input type="range" min={0} max={videoDuration} step={0.1} value={value.frameOffset} onChange={handleScrubChange} className="w-full h-1.5 accent-primary rounded-lg cursor-pointer bg-muted/50 appearance-none hover:bg-muted/70" />
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-[9px] font-black text-muted-foreground opacity-50 uppercase tracking-widest">Key Frames</p>
                <div className="flex flex-wrap gap-2">
                  {(generating ? [1,2,3,4,5] : frames).map((f, i) => {
                    const presetTime = videoDuration * [0.1, 0.25, 0.5, 0.75, 0.95][i]!;
                    const isSelected = Math.abs(value.frameOffset - presetTime) < 0.2;
                    return (
                      <button key={i} onClick={() => handleSelectPreset(i)} className={cn("h-10 w-16 rounded-xl border-2 transition-all overflow-hidden", typeof f === "string" ? "bg-black/20" : "bg-muted/10 animate-pulse", isSelected ? "border-primary scale-110 shadow-lg ring-2 ring-primary/20" : "border-transparent opacity-60 hover:opacity-100 opacity-70")}>
                        {typeof f === "string" && <img src={f} className="w-full h-full object-cover" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div onClick={() => fileInputRef.current?.click()} className="flex items-center gap-4 p-5 rounded-2xl border-2 border-dashed border-border/40 bg-muted/5 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer group shadow-sm">
              <div className="p-2.5 rounded-xl bg-muted/50 group-hover:bg-primary/20 transition-colors border border-border/10"><Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary" /></div>
              <div className="flex-1"><p className="text-sm font-bold text-foreground">Upload Custom Image</p><p className="text-[10px] text-muted-foreground font-medium">Verified channels can use custom covers</p></div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCustomUpload} />
              <div className="h-8 w-8 rounded-full bg-border/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="h-4 w-4" /></div>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground/60 italic leading-none pt-1">
            <Info className="h-3 w-3 opacity-50" />
            Selection instantly applied to all enabled channels
          </div>
        </div>
      </div>
    </div>
  );
}
