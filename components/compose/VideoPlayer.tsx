"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, Volume1, VolumeX, Maximize2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  className?: string;
  aspectRatio?: string;
  trimStart?: number;
  trimEnd?: number;
  /** Compact mode for thumbnails / preview cards */
  compact?: boolean;
  /** Poster image (first frame) */
  poster?: string;
  onDurationDetected?: (duration: number) => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoPlayer({
  src,
  className,
  aspectRatio,
  trimStart = 0,
  trimEnd,
  compact = false,
  poster,
  onDurationDetected,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [showVolume, setShowVolume] = useState(false);
  const [currentTime, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();
  const volumeTimeout = useRef<ReturnType<typeof setTimeout>>();

  const effectiveEnd = trimEnd ?? duration;

  // Detect duration
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      setDuration(v.duration);
      onDurationDetected?.(v.duration);
      if (trimStart > 0) v.currentTime = trimStart;
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [src, trimStart, onDurationDetected]);

  // Time update
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setCurrent(v.currentTime);
      // Enforce trim bounds
      if (effectiveEnd > 0 && v.currentTime >= effectiveEnd) {
        v.pause();
        setPlaying(false);
        v.currentTime = trimStart;
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [trimStart, effectiveEnd]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    if (playing) {
      hideTimeout.current = setTimeout(() => setShowControls(false), 2500);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) setShowControls(true);
    else resetHideTimer();
    return () => { if (hideTimeout.current) clearTimeout(hideTimeout.current); };
  }, [playing, resetHideTimer]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      if (v.currentTime >= effectiveEnd || v.currentTime < trimStart) {
        v.currentTime = trimStart;
      }
      v.play();
      setPlaying(true);
    }
  }, [playing, trimStart, effectiveEnd]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    const bar = progressRef.current;
    if (!v || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const range = effectiveEnd - trimStart;
    v.currentTime = trimStart + pct * range;
  };

  const handleProgressDrag = useCallback(
    (e: MouseEvent) => {
      const v = videoRef.current;
      const bar = progressRef.current;
      if (!v || !bar) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const range = effectiveEnd - trimStart;
      v.currentTime = trimStart + pct * range;
    },
    [trimStart, effectiveEnd]
  );

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setSeeking(true);
    handleProgressClick(e);
    const onMove = (ev: MouseEvent) => handleProgressDrag(ev);
    const onUp = () => {
      setSeeking(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const restart = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = trimStart;
    v.play();
    setPlaying(true);
  };

  const toggleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else v.requestFullscreen();
  };

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (muted) {
      v.muted = false;
      v.volume = volume;
      setMuted(false);
    } else {
      v.muted = true;
      setMuted(true);
    }
  }, [muted, volume]);

  const handleVolumeChange = useCallback((newVol: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    v.volume = clamped;
    if (clamped === 0) { v.muted = true; setMuted(true); }
    else if (muted) { v.muted = false; setMuted(false); }
  }, [muted]);

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const progressPct =
    effectiveEnd - trimStart > 0
      ? ((currentTime - trimStart) / (effectiveEnd - trimStart)) * 100
      : 0;

  if (compact) {
    return (
      <div
        className={cn("relative group cursor-pointer overflow-hidden", className)}
        style={{ aspectRatio }}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="absolute inset-0 w-full h-full object-cover"
          preload="metadata"
          muted={muted}
          playsInline
        />
        {/* Center play/pause */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity",
          playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        )}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </div>
        </div>
        {/* Sound toggle — bottom right */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleMute(); }}
          className={cn(
            "absolute bottom-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-opacity",
            playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          )}
        >
          <VolumeIcon className="h-3.5 w-3.5" />
        </button>
        {/* Bottom progress */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative group rounded-lg overflow-hidden bg-black", className)}
      style={{ aspectRatio }}
      onMouseMove={resetHideTimer}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="absolute inset-0 w-full h-full object-contain"
        preload="metadata"
        muted={muted}
        playsInline
      />

      {/* Center play icon (shown when paused) */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition-colors cursor-pointer">
            <Play className="h-6 w-6 ml-1" />
          </div>
        </div>
      )}

      {/* Bottom controls bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-2 px-3 transition-opacity duration-200",
          showControls || !playing ? "opacity-100" : "opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative h-1.5 bg-white/20 rounded-full cursor-pointer mb-2 group/prog hover:h-2.5 transition-all"
          onMouseDown={startDrag}
        >
          {/* Played */}
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
          />
          {/* Scrubber dot */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white border-2 border-primary shadow-lg transition-opacity",
              seeking ? "opacity-100 scale-110" : "opacity-0 group-hover/prog:opacity-100"
            )}
            style={{ left: `${Math.max(0, Math.min(100, progressPct))}%` }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white hover:bg-white/10"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>

          <button
            onClick={restart}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          {/* Time */}
          <span className="text-[11px] text-white/80 font-mono tabular-nums select-none">
            {formatTime(Math.max(0, currentTime - trimStart))} / {formatTime(effectiveEnd - trimStart)}
          </span>

          <div className="flex-1" />

          {/* Volume with slider */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => { setShowVolume(true); if (volumeTimeout.current) clearTimeout(volumeTimeout.current); }}
            onMouseLeave={() => { volumeTimeout.current = setTimeout(() => setShowVolume(false), 800); }}
          >
            <button
              onClick={toggleMute}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
            >
              <VolumeIcon className="h-4 w-4" />
            </button>
            {showVolume && (
              <div className="flex items-center ml-1 gap-1.5">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 h-1 accent-white cursor-pointer appearance-none rounded-full bg-white/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
                <span className="text-[10px] text-white/50 font-mono w-6 text-right">
                  {muted ? 0 : Math.round(volume * 100)}
                </span>
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
