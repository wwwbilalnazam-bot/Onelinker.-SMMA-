"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Scissors, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoTrimmerProps {
  src: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  maxDuration?: number;
  onTrimChange: (start: number, end: number) => void;
  className?: string;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const THUMB_COUNT = 12;

export function VideoTrimmer({
  src,
  duration,
  trimStart,
  trimEnd,
  maxDuration,
  onTrimChange,
  className,
}: VideoTrimmerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [dragging, setDragging] = useState<"start" | "end" | "range" | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartValues, setDragStartValues] = useState({ start: 0, end: 0 });
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const selectedDuration = trimEnd - trimStart;
  const exceeds = maxDuration ? selectedDuration > maxDuration : false;

  // Generate thumbnails from video
  useEffect(() => {
    if (!src || duration <= 0) return;

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    video.src = src;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 80;
    canvas.height = 60;

    const thumbs: string[] = [];
    let idx = 0;

    const capture = () => {
      if (idx >= THUMB_COUNT) {
        setThumbnails(thumbs);
        video.remove();
        return;
      }
      const time = (idx / THUMB_COUNT) * duration;
      video.currentTime = Math.min(time, duration - 0.1);
    };

    video.addEventListener("loadeddata", () => capture());
    video.addEventListener("seeked", () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      thumbs.push(canvas.toDataURL("image/jpeg", 0.5));
      idx++;
      capture();
    });
  }, [src, duration]);

  const pctFromTime = (t: number) => (duration > 0 ? (t / duration) * 100 : 0);
  const timeFromPct = (pct: number) => (pct / 100) * duration;

  const getPctFromEvent = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    },
    []
  );

  const handleMouseDown = (
    e: React.MouseEvent,
    type: "start" | "end" | "range"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
    setDragStartX(e.clientX);
    setDragStartValues({ start: trimStart, end: trimEnd });
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const pct = getPctFromEvent(e.clientX);
      const time = Math.round(timeFromPct(pct));

      if (dragging === "start") {
        const newStart = Math.max(0, Math.min(time, trimEnd - 1));
        onTrimChange(newStart, trimEnd);
      } else if (dragging === "end") {
        const newEnd = Math.min(duration, Math.max(time, trimStart + 1));
        onTrimChange(trimStart, newEnd);
      } else if (dragging === "range") {
        const deltaPx = e.clientX - dragStartX;
        const track = trackRef.current;
        if (!track) return;
        const pxPerSec = track.getBoundingClientRect().width / duration;
        const deltaSec = Math.round(deltaPx / pxPerSec);
        let newStart = dragStartValues.start + deltaSec;
        let newEnd = dragStartValues.end + deltaSec;
        if (newStart < 0) {
          newEnd -= newStart;
          newStart = 0;
        }
        if (newEnd > duration) {
          newStart -= newEnd - duration;
          newEnd = duration;
        }
        newStart = Math.max(0, newStart);
        newEnd = Math.min(duration, newEnd);
        onTrimChange(newStart, newEnd);
      }
    };

    const onUp = () => setDragging(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, dragStartX, dragStartValues, trimStart, trimEnd, duration, getPctFromEvent, onTrimChange, timeFromPct]);

  const handleTrackHover = (e: React.MouseEvent) => {
    const pct = getPctFromEvent(e.clientX);
    setHoverTime(Math.round(timeFromPct(pct)));
  };

  const setQuickTrim = (secs: number) => {
    const end = Math.min(trimStart + secs, duration);
    onTrimChange(trimStart, end);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Trim video</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[15, 30, 60, 90].filter(s => s <= duration).map(s => (
            <button
              key={s}
              onClick={() => setQuickTrim(s)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-medium transition-all",
                selectedDuration === s
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
              )}
            >
              {s}s
            </button>
          ))}
        </div>
      </div>

      {/* Thumbnail timeline */}
      <div className="relative select-none" ref={trackRef} onMouseMove={handleTrackHover} onMouseLeave={() => setHoverTime(null)}>
        {/* Thumbnail strip */}
        <div className="flex h-14 rounded-lg overflow-hidden border border-border/40">
          {thumbnails.length > 0
            ? thumbnails.map((thumb, i) => (
                <div key={i} className="flex-1 min-w-0 relative">
                  <img src={thumb} alt="" className="w-full h-full object-cover" draggable={false} />
                </div>
              ))
            : Array.from({ length: THUMB_COUNT }).map((_, i) => (
                <div key={i} className="flex-1 min-w-0 bg-muted/40 border-r border-border/20 last:border-0" />
              ))}

          {/* Dimmed regions outside trim */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-black/60 rounded-l-lg pointer-events-none"
            style={{ width: `${pctFromTime(trimStart)}%` }}
          />
          <div
            className="absolute top-0 bottom-0 right-0 bg-black/60 rounded-r-lg pointer-events-none"
            style={{ width: `${100 - pctFromTime(trimEnd)}%` }}
          />

          {/* Selected region border */}
          <div
            className={cn(
              "absolute top-0 bottom-0 border-y-2 cursor-grab active:cursor-grabbing",
              exceeds ? "border-amber-500" : "border-primary"
            )}
            style={{
              left: `${pctFromTime(trimStart)}%`,
              width: `${pctFromTime(trimEnd) - pctFromTime(trimStart)}%`,
            }}
            onMouseDown={(e) => handleMouseDown(e, "range")}
          />

          {/* Left handle */}
          <div
            className={cn(
              "absolute top-0 bottom-0 w-3.5 cursor-col-resize z-10 flex items-center justify-center",
              exceeds ? "bg-amber-500" : "bg-primary",
              "rounded-l-md"
            )}
            style={{ left: `calc(${pctFromTime(trimStart)}% - 2px)` }}
            onMouseDown={(e) => handleMouseDown(e, "start")}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-0.5 h-3 bg-white/80 rounded-full" />
            </div>
          </div>

          {/* Right handle */}
          <div
            className={cn(
              "absolute top-0 bottom-0 w-3.5 cursor-col-resize z-10 flex items-center justify-center",
              exceeds ? "bg-amber-500" : "bg-primary",
              "rounded-r-md"
            )}
            style={{ left: `calc(${pctFromTime(trimEnd)}% - 12px)` }}
            onMouseDown={(e) => handleMouseDown(e, "end")}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-0.5 h-3 bg-white/80 rounded-full" />
            </div>
          </div>

          {/* Hover time indicator */}
          {hoverTime !== null && !dragging && (
            <div
              className="absolute top-0 bottom-0 w-px bg-white/60 pointer-events-none z-20"
              style={{ left: `${pctFromTime(hoverTime)}%` }}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                {formatTime(hoverTime)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Start</span>
            <input
              type="number"
              min={0}
              max={trimEnd - 1}
              value={trimStart}
              onChange={(e) =>
                onTrimChange(
                  Math.max(0, Math.min(Number(e.target.value), trimEnd - 1)),
                  trimEnd
                )
              }
              className="w-14 h-7 rounded-md border border-border/60 bg-background/50 px-2 text-xs text-foreground text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">End</span>
            <input
              type="number"
              min={trimStart + 1}
              max={Math.round(duration)}
              value={trimEnd}
              onChange={(e) =>
                onTrimChange(
                  trimStart,
                  Math.min(Math.round(duration), Math.max(Number(e.target.value), trimStart + 1))
                )
              }
              className="w-14 h-7 rounded-md border border-border/60 bg-background/50 px-2 text-xs text-foreground text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {exceeds && (
            <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
              <AlertTriangle className="h-3 w-3" />
              Exceeds {maxDuration}s limit
            </span>
          )}
          <span
            className={cn(
              "text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md",
              exceeds
                ? "bg-amber-500/15 text-amber-500"
                : "bg-primary/10 text-primary"
            )}
          >
            {selectedDuration}s selected
          </span>
        </div>
      </div>
    </div>
  );
}
