import React from "react";
import { useCurrentFrame, interpolate, OffthreadVideo, Img, staticFile } from "remotion";
import type { VisualSegment, TransitionType } from "../types";

const resolveAsset = (path: string): string =>
  path.startsWith('http://') || path.startsWith('https://') ? path : staticFile(path);
import { AnimatedList } from "./AnimatedList";
import { StatCounter } from "./StatCounter";
import { Diagram } from "./Diagram";
import { Comparison } from "./Comparison";
import { QuoteHighlight } from "./QuoteHighlight";
import { TitleCard } from "./TitleCard";
import { IconGrid } from "./IconGrid";
import { BarChart } from "./BarChart";
import { BeforeAfter } from "./BeforeAfter";
import { FactCard } from "./FactCard";
import { DonutChart } from "./DonutChart";
import { CountdownReveal } from "./CountdownReveal";

const TRANSITION_FRAMES = 10;

/* ── Segment Renderer ─────────────────────────────────────── */

const SegmentRenderer: React.FC<{
  segment: VisualSegment;
  startFrame: number;
  endFrame: number;
  fps: number;
}> = ({ segment, startFrame, endFrame, fps }) => {
  const frame = useCurrentFrame();

  switch (segment.visual_type) {
    case "pexels_clip": {
      if (!segment.data?.asset_url) return null;
      const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      });
      const scale = 1.0 + 0.05 * progress;
      return (
        <OffthreadVideo
          src={resolveAsset(segment.data.asset_url as string)}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: `scale(${scale})`,
          }}
          muted
        />
      );
    }
    case "ai_image": {
      if (!segment.data?.asset_url) return null;
      const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      });
      const scale = 1.0 + 0.05 * progress;
      return (
        <Img
          src={resolveAsset(segment.data.asset_url as string)}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: `scale(${scale})`, transformOrigin: "center center",
          }}
        />
      );
    }
    case "animated_list":
      return <AnimatedList data={segment.data as any} startFrame={startFrame} endFrame={endFrame} fps={fps} />;
    case "stat_counter":
      return <StatCounter data={segment.data as any} startFrame={startFrame} endFrame={endFrame} fps={fps} />;
    case "diagram":
      return <Diagram data={segment.data as any} startFrame={startFrame} endFrame={endFrame} fps={fps} />;
    case "comparison":
      return <Comparison data={segment.data as any} startFrame={startFrame} endFrame={endFrame} fps={fps} />;
    case "quote_highlight":
      return <QuoteHighlight data={segment.data as any} startFrame={startFrame} endFrame={endFrame} fps={fps} />;
    case "title_card":
      return <TitleCard data={segment.data as any} startFrame={startFrame} endFrame={endFrame} fps={fps} />;
    case "icon_grid":
      return <IconGrid data={segment.data as any} startFrame={startFrame} endFrame={endFrame} fps={fps} />;
    case "bar_chart":
      return <BarChart data={segment.data as any} startFrame={startFrame} endFrame={endFrame} fps={fps} />;
    case "before_after":
      return <BeforeAfter data={segment.data as any} startFrame={startFrame} endFrame={endFrame} fps={fps} />;
    case "fact_card":
      return <FactCard data={segment.data as any} startFrame={startFrame} endFrame={endFrame} fps={fps} />;
    case "donut_chart":
      return <DonutChart data={segment.data as any} startFrame={startFrame} endFrame={endFrame} fps={fps} />;
    case "countdown_reveal":
      return <CountdownReveal data={segment.data as any} startFrame={startFrame} endFrame={endFrame} fps={fps} />;
    default:
      return null;
  }
};

/* ── Transition overlays ──────────────────────────────────── */

/** Light leak: warm golden radial glow that sweeps across during transition */
const LightLeakOverlay: React.FC<{ progress: number }> = ({ progress }) => {
  if (progress <= 0 || progress >= 1) return null;

  // Sweep from left to right
  const xPos = interpolate(progress, [0, 1], [-30, 130]);
  const glowOpacity = interpolate(
    progress,
    [0, 0.3, 0.7, 1],
    [0, 0.7, 0.7, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 15,
        background: `radial-gradient(ellipse 60% 80% at ${xPos}% 50%, rgba(255, 200, 80, ${glowOpacity * 0.6}), rgba(255, 160, 40, ${glowOpacity * 0.3}) 40%, transparent 70%)`,
      }}
    />
  );
};

/** Zoom blur: radial scale + brightness flash for high-energy transitions */
const ZoomBlurOverlay: React.FC<{ progress: number }> = ({ progress }) => {
  if (progress <= 0 || progress >= 1) return null;

  // Scale peaks in the middle of transition
  const scale = interpolate(
    progress,
    [0, 0.5, 1],
    [1, 1.15, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Bright flash in center
  const flashOpacity = interpolate(
    progress,
    [0, 0.35, 0.65, 1],
    [0, 0.5, 0.5, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 15,
        transform: `scale(${scale})`,
        background: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, ${flashOpacity}) 0%, rgba(99, 102, 241, ${flashOpacity * 0.4}) 30%, transparent 60%)`,
      }}
    />
  );
};

/* ── Transition logic ─────────────────────────────────────── */

interface TransitionState {
  contentOpacity: number;
  /** 0 = not transitioning, 0→1 = entering, 1→0 = exiting */
  transitionProgress: number;
  isEntering: boolean;
}

function getTransitionState(
  frame: number,
  startFrame: number,
  endFrame: number,
): TransitionState {
  let contentOpacity = 1;
  let transitionProgress = 0;
  let isEntering = false;

  if (frame < startFrame + TRANSITION_FRAMES) {
    // Entering — fade in from 0 to 1
    contentOpacity = interpolate(
      frame,
      [startFrame, startFrame + TRANSITION_FRAMES],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    transitionProgress = interpolate(
      frame,
      [startFrame, startFrame + TRANSITION_FRAMES],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    isEntering = true;
  }

  if (frame > endFrame - TRANSITION_FRAMES) {
    // Exiting — stay at full opacity (the next segment fades in on top)
    contentOpacity = 1;
    transitionProgress = interpolate(
      frame,
      [endFrame - TRANSITION_FRAMES, endFrame],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    isEntering = false;
  }

  return { contentOpacity, transitionProgress, isEntering };
}

/* ── Main layer ───────────────────────────────────────────── */

export const MotionGraphicsLayer: React.FC<{
  segments: VisualSegment[];
  fps: number;
}> = ({ segments, fps }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {segments.map((seg, i) => {
        const startFrame = Math.round(seg.startSec * fps);
        const endFrame = Math.round(seg.endSec * fps);

        if (frame < startFrame - TRANSITION_FRAMES || frame > endFrame + TRANSITION_FRAMES) {
          return null;
        }

        const isMediaSegment = seg.visual_type === "pexels_clip" || seg.visual_type === "ai_image";
        const transition: TransitionType = isMediaSegment ? "fade" : (seg.transition || "fade");
        const { contentOpacity: rawOpacity, transitionProgress, isEntering } =
          getTransitionState(frame, startFrame, endFrame);
        // First segment starts at full opacity — no fade-in from black
        const contentOpacity = (i === 0 && isEntering) ? 1 : rawOpacity;

        // For zoom_blur, apply scale to content during transition
        const contentScale =
          transition === "zoom_blur" && transitionProgress > 0
            ? interpolate(
                transitionProgress,
                isEntering ? [0, 1] : [0, 1],
                isEntering ? [0.85, 1] : [1, 0.85],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              )
            : 1;

        return (
          <React.Fragment key={i}>
            {/* Content layer */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: contentOpacity,
                transform: contentScale !== 1 ? `scale(${contentScale})` : undefined,
                zIndex: 10,
                backgroundColor: isMediaSegment ? "#000" : undefined,
              }}
            >
              <SegmentRenderer
                segment={seg}
                startFrame={startFrame}
                endFrame={endFrame}
                fps={fps}
              />
            </div>

            {/* Transition overlay */}
            {transition === "light_leak" && transitionProgress > 0 && (
              <LightLeakOverlay progress={transitionProgress} />
            )}
            {transition === "zoom_blur" && transitionProgress > 0 && (
              <ZoomBlurOverlay progress={transitionProgress} />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};
