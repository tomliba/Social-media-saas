import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
  OffthreadVideo,
} from "remotion";
import type { VisualSegment, BRollSegment } from "../lib/video-types";
import { AnimatedList } from "./components/AnimatedList";
import { StatCounter } from "./components/StatCounter";
import { Diagram } from "./components/Diagram";
import { Comparison } from "./components/Comparison";
import { QuoteHighlight } from "./components/QuoteHighlight";
import { TitleCard } from "./components/TitleCard";
import { IconGrid } from "./components/IconGrid";

const CROSSFADE_FRAMES = 6;

interface VisualSegmentRendererProps {
  visualSegments?: VisualSegment[];
  brollSegments?: BRollSegment[];
}

function secToFrame(sec: number, fps: number): number {
  return Math.round(sec * fps);
}

function renderSegmentContent(
  seg: VisualSegment,
  startFrame: number,
  endFrame: number,
  scale: number
): React.ReactNode {
  switch (seg.visual_type) {
    case "pexels_clip":
      if (!seg.asset_url) return null;
      return (
        <OffthreadVideo
          src={seg.asset_url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
          muted
        />
      );

    case "ai_image":
      if (!seg.asset_url) return null;
      return (
        <Img
          src={seg.asset_url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: (seg.data.position as string) || "center center",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      );

    case "animated_list":
      return (
        <AnimatedList
          title={seg.data.title ?? ""}
          items={seg.data.items ?? []}
          style={seg.data.style}
          startFrame={startFrame}
          endFrame={endFrame}
        />
      );

    case "stat_counter":
      return (
        <StatCounter
          number={seg.data.number ?? 0}
          suffix={seg.data.suffix}
          label={seg.data.label ?? ""}
          color={seg.data.color}
          startFrame={startFrame}
          endFrame={endFrame}
        />
      );

    case "diagram":
      return (
        <Diagram
          steps={seg.data.steps ?? []}
          style={seg.data.style}
          startFrame={startFrame}
          endFrame={endFrame}
        />
      );

    case "comparison":
      return (
        <Comparison
          left_label={seg.data.left_label ?? ""}
          right_label={seg.data.right_label ?? ""}
          left_items={seg.data.left_items}
          right_items={seg.data.right_items}
          startFrame={startFrame}
          endFrame={endFrame}
        />
      );

    case "quote_highlight":
      return (
        <QuoteHighlight
          text={seg.data.text ?? ""}
          style={seg.data.style}
          startFrame={startFrame}
          endFrame={endFrame}
        />
      );

    case "title_card":
      return (
        <TitleCard
          headline={seg.data.headline ?? ""}
          subtitle={seg.data.subtitle}
          accent_color={seg.data.accent_color}
          startFrame={startFrame}
          endFrame={endFrame}
        />
      );

    case "icon_grid":
      return (
        <IconGrid
          items={seg.data.items ?? []}
          startFrame={startFrame}
          endFrame={endFrame}
        />
      );

    default:
      return null;
  }
}

export const VisualSegmentRenderer: React.FC<VisualSegmentRendererProps> = ({
  visualSegments,
  brollSegments,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const CF = CROSSFADE_FRAMES;

  // ── If visualSegments exists, use the new per-segment renderer ──
  if (visualSegments && visualSegments.length > 0) {
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        {visualSegments.map((seg, i) => {
          const startFrame = secToFrame(seg.startSec, fps);
          const endFrame = secToFrame(seg.endSec, fps);

          // Skip if not in render range (with crossfade buffer)
          if (frame < startFrame - CF || frame > endFrame + CF) return null;

          // Crossfade opacity
          const fadeIn = interpolate(
            frame,
            [startFrame, startFrame + CF],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const fadeOut = interpolate(
            frame,
            [endFrame - CF, endFrame],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const opacity = Math.min(fadeIn, fadeOut);

          // Ken Burns zoom for pexels_clip (motion graphics handle their own animation)
          const progress = interpolate(
            frame,
            [startFrame, endFrame],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const scale = 1.0 + 0.05 * progress;

          return (
            <div
              key={i}
              style={{
                opacity,
                position: "absolute",
                inset: 0,
                overflow: "hidden",
              }}
            >
              {renderSegmentContent(seg, startFrame, endFrame, scale)}
            </div>
          );
        })}

        {/* Vignette overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  // ── Fallback: legacy brollSegments rendering ──
  if (brollSegments && brollSegments.length > 0) {
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        {brollSegments.map((seg, i) => {
          if (frame < seg.startFrame - CF || frame > seg.endFrame + CF)
            return null;

          const fadeIn = interpolate(
            frame,
            [seg.startFrame, seg.startFrame + CF],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const fadeOut = interpolate(
            frame,
            [seg.endFrame - CF, seg.endFrame],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const opacity = Math.min(fadeIn, fadeOut);

          const progress = interpolate(
            frame,
            [seg.startFrame, seg.endFrame],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const scale = 1.0 + 0.05 * progress;

          return (
            <div
              key={i}
              style={{
                opacity,
                position: "absolute",
                inset: 0,
                overflow: "hidden",
              }}
            >
              <OffthreadVideo
                src={seg.src}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `scale(${scale})`,
                }}
                muted
              />
            </div>
          );
        })}

        {/* Vignette overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  return null;
};
