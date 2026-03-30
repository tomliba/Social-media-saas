import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import {
  mgContainerStyle,
  mgSpring,
  labelStyle,
  FONT_FAMILY,
} from "../mg-constants";

interface StatCounterProps {
  number: number;
  suffix?: string;
  label: string;
  color?: string;
  startFrame: number;
  endFrame: number;
}

export const StatCounter: React.FC<StatCounterProps> = ({
  number: targetNumber,
  suffix = "",
  label,
  color = "#6366f1",
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Count-up over 40 frames
  const countEnd = startFrame + 40;
  const currentNumber = Math.round(
    interpolate(frame, [startFrame, countEnd], [0, targetNumber], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const numberProgress = mgSpring(frame, fps, startFrame);
  const labelProgress = mgSpring(frame, fps, startFrame + 10);

  return (
    <div style={mgContainerStyle}>
      {/* Radial glow behind number */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -60%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}26 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Number + suffix */}
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 800,
          fontSize: 120,
          color,
          fontVariantNumeric: "tabular-nums",
          opacity: numberProgress,
          transform: `scale(${0.8 + numberProgress * 0.2})`,
          lineHeight: 1,
        }}
      >
        {currentNumber.toLocaleString()}
        {suffix}
      </div>

      {/* Label */}
      <div
        style={{
          ...labelStyle,
          marginTop: 24,
          textAlign: "center",
          opacity: labelProgress,
          transform: `translateY(${(1 - labelProgress) * 20}px)`,
        }}
      >
        {label}
      </div>
    </div>
  );
};
