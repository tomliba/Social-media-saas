import React from "react";
import { useCurrentFrame, spring, interpolate } from "remotion";
import type { CountdownRevealData } from "../types";
import { SAFE_ZONE, FONT_FAMILY, COLORS } from "./shared";

export const CountdownReveal: React.FC<{
  data: CountdownRevealData;
  startFrame: number;
  endFrame: number;
  fps: number;
}> = ({ data, startFrame, endFrame, fps }) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;
  const duration = endFrame - startFrame;

  const items = data.items.slice(0, 5);
  const totalItems = items.length;

  // Each countdown item gets equal time, last 30% for reveal
  const countdownDuration = Math.floor(duration * 0.7);
  const itemDuration = Math.floor(countdownDuration / Math.max(totalItems, 1));
  const revealStart = countdownDuration;

  // Determine which countdown item is active
  const activeIndex = Math.min(
    Math.floor(relFrame / itemDuration),
    totalItems - 1
  );
  const itemRelFrame = relFrame - activeIndex * itemDuration;
  const isRevealPhase = relFrame >= revealStart;

  // Countdown number entrance
  const numSpring = spring({
    frame: Math.max(0, itemRelFrame),
    fps,
    config: { damping: 8, stiffness: 150, mass: 0.6 },
  });

  // Shake effect near end of each item
  const shakeIntensity =
    !isRevealPhase && itemRelFrame > itemDuration - 8
      ? interpolate(itemRelFrame, [itemDuration - 8, itemDuration], [0, 6], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
  const shakeX = shakeIntensity * Math.sin(relFrame * 2.5);

  // Reveal phase
  const revealRelFrame = relFrame - revealStart;
  const revealSpring = spring({
    frame: Math.max(0, revealRelFrame),
    fps,
    config: { damping: 8, stiffness: 100, mass: 1 },
  });

  if (isRevealPhase) {
    return (
      <div
        style={{
          ...SAFE_ZONE,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 108,
            fontWeight: 900,
            fontFamily: FONT_FAMILY,
            color: COLORS.accent,
            textAlign: "center",
            lineHeight: 1.2,
            opacity: revealSpring,
            transform: `scale(${0.3 + revealSpring * 0.7})`,
            textShadow: `0 0 60px rgba(99, 102, 241, ${revealSpring * 0.5})`,
          }}
        >
          {data.revealText}
        </div>
      </div>
    );
  }

  // Countdown phase
  const displayNumber = totalItems - activeIndex;

  return (
    <div
      style={{
        ...SAFE_ZONE,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Big countdown number */}
      <div
        style={{
          fontSize: 280,
          fontWeight: 900,
          fontFamily: FONT_FAMILY,
          color: COLORS.accent,
          lineHeight: 1,
          opacity: numSpring,
          transform: `scale(${0.2 + numSpring * 0.8}) translateX(${shakeX}px)`,
          marginBottom: 36,
        }}
      >
        {displayNumber}
      </div>

      {/* Current item text */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          fontFamily: FONT_FAMILY,
          color: COLORS.text,
          textAlign: "center",
          opacity: numSpring,
          transform: `translateY(${(1 - numSpring) * 30}px)`,
          maxWidth: 900,
        }}
      >
        {items[activeIndex]}
      </div>
    </div>
  );
};
