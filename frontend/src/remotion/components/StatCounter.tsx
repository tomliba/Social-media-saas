import React from "react";
import { useCurrentFrame, interpolate, spring } from "remotion";
import type { StatCounterData } from "../types";
import { SAFE_ZONE, FONT_FAMILY, COLORS } from "./shared";

export const StatCounter: React.FC<{
  data: StatCounterData;
  startFrame: number;
  endFrame: number;
  fps: number;
}> = ({ data, startFrame, endFrame, fps }) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;
  const duration = endFrame - startFrame;

  const countDuration = Math.floor(duration * 0.6);
  const countProgress = interpolate(relFrame, [5, 5 + countDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const easedProgress = 1 - Math.pow(1 - countProgress, 3);
  const currentNumber = Math.round(data.number * easedProgress);

  const entrance = spring({
    frame: relFrame,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.8 },
  });

  const labelSpring = spring({
    frame: Math.max(0, relFrame - 8),
    fps,
    config: { damping: 12, stiffness: 80, mass: 0.6 },
  });

  const accentColor = data.color || COLORS.accent;

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
          fontSize: 240,
          fontWeight: 900,
          fontFamily: FONT_FAMILY,
          color: accentColor,
          opacity: entrance,
          transform: `scale(${0.5 + entrance * 0.5})`,
          lineHeight: 1,
        }}
      >
        {currentNumber.toLocaleString()}
        <span style={{ fontSize: 140 }}>{data.suffix}</span>
      </div>

      <div
        style={{
          fontSize: 72,
          fontWeight: 600,
          fontFamily: FONT_FAMILY,
          color: COLORS.textSecondary,
          marginTop: 40,
          opacity: labelSpring,
          transform: `translateY(${(1 - labelSpring) * 20}px)`,
          textAlign: "center",
        }}
      >
        {data.label}
      </div>
    </div>
  );
};
