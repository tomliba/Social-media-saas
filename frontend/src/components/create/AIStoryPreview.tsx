"use client";

import React from "react";
import { Player } from "@remotion/player";
import { Video } from "@/remotion/Video";
import type { VideoProps, CaptionEntry, SceneTransitionStyle } from "@/remotion/types";

/* ── Prop types ──────────────────────────────────────────────── */

export interface PreviewData {
  audioUrl: string;
  backgroundPaths: string[];
  captions: CaptionEntry[];
  volumePerFrame: number[];
  durationInFrames: number;
  fps: number;
  backgroundType: "video" | "image";
  showCaptions: boolean;
}

export interface CreativeSettings {
  captionStyle?: string;
  captionFontSize?: string;
  captionTextTransform?: string;
  captionPosition?: string;
  music?: string;
  musicUrl?: string;
  filmGrain?: boolean;
  shakeEffect?: boolean;
  transitionStyle?: SceneTransitionStyle;
  hookText?: string;
  style?: string;
}

interface AIStoryPreviewProps {
  previewData: PreviewData;
  creativeSettings: CreativeSettings;
  onExport: () => void;
  onBack: () => void;
}

/* ── Component ───────────────────────────────────────────────── */

export default function AIStoryPreview({
  previewData,
  creativeSettings,
  onExport,
  onBack,
}: AIStoryPreviewProps) {
  const inputProps: VideoProps = {
    audioPath: previewData.audioUrl,
    backgroundPaths: previewData.backgroundPaths,
    backgroundType: previewData.backgroundType,
    captions: previewData.captions,
    volumePerFrame: previewData.volumePerFrame,
    durationInFrames: previewData.durationInFrames,
    fps: previewData.fps,
    showCaptions: previewData.showCaptions,
    // Fields not used in ai-story but required by VideoProps
    characterImages: { closed: "", open_slight: "", open_medium: "", open_round: "", open_teeth: "", blink: "" },
    audioTimestamps: [],
    width: 1080,
    height: 1920,
    characterPosition: "bottom-left",
    isFreeTier: false,
    watermarkPath: "",
    // Creative settings
    captionStyle: creativeSettings.captionStyle,
    captionFontSize: creativeSettings.captionFontSize,
    captionTextTransform: creativeSettings.captionTextTransform,
    captionPosition: creativeSettings.captionPosition,
    music: creativeSettings.music,
    musicUrl: creativeSettings.musicUrl,
    filmGrain: creativeSettings.filmGrain,
    shakeEffect: creativeSettings.shakeEffect,
    transitionStyle: creativeSettings.transitionStyle,
    hookText: creativeSettings.hookText,
    style: creativeSettings.style ?? "ai-story",
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 text-center">
        {creativeSettings.hookText && (
          <h1 className="text-xl md:text-2xl font-bold font-headline text-on-surface leading-snug max-w-lg mx-auto">
            {creativeSettings.hookText}
          </h1>
        )}
        <p className="text-xs text-on-surface-variant/70 mt-1">
          Preview your story — hit play to watch
        </p>
      </header>

      {/* Player */}
      <div className="flex-1 flex items-start justify-center px-4 pb-4">
        <div className="w-full max-w-[360px] md:max-w-[400px]" style={{ aspectRatio: "9 / 16" }}>
          <Player
            component={Video as unknown as React.ComponentType<Record<string, unknown>>}
            inputProps={inputProps as unknown as Record<string, unknown>}
            compositionWidth={1080}
            compositionHeight={1920}
            durationInFrames={previewData.durationInFrames}
            fps={previewData.fps}
            controls
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <footer className="sticky bottom-0 w-full z-50 bg-white/80 backdrop-blur-xl px-6 py-5 shadow-[0px_-10px_30px_rgba(0,0,0,0.03)] flex justify-center gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3.5 rounded-xl text-sm font-bold font-headline border-2 border-outline-variant/30 text-on-surface hover:bg-surface-container-high transition-all active:scale-95"
        >
          Back to Edit
        </button>

        <button
          onClick={onExport}
          className="flex-1 max-w-xs py-3.5 rounded-xl text-sm font-bold font-headline bg-primary text-on-primary shadow-xl shadow-primary/30 flex items-center justify-center gap-2 transition-all active:scale-95 hover:shadow-2xl"
        >
          <span className="material-symbols-outlined text-base">download</span>
          Export 1080p HD
        </button>
      </footer>
    </div>
  );
}
