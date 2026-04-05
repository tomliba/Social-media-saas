import React from "react";
import { useCurrentFrame, spring, interpolate } from "remotion";
import type { QuoteHighlightData } from "../types";
import { SAFE_ZONE, FONT_FAMILY, COLORS } from "./shared";

export const QuoteHighlight: React.FC<{
  data: QuoteHighlightData;
  startFrame: number;
  endFrame: number;
  fps: number;
}> = ({ data, startFrame, endFrame, fps }) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;

  const entrance = spring({
    frame: relFrame,
    fps,
    config: { damping: 10, stiffness: 80, mass: 1 },
  });

  const barSpring = spring({
    frame: Math.max(0, relFrame - 4),
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.6 },
  });

  const glowOpacity = interpolate(
    Math.sin((relFrame / fps) * Math.PI * 1.5),
    [-1, 1],
    [0.1, 0.3]
  );

  const textStyle: React.CSSProperties = {
    fontSize: 104,
    fontWeight: data.style === "bold" ? 900 : 700,
    fontStyle: data.style === "italic" ? "italic" : "normal",
    textDecoration: data.style === "underline" ? "underline" : "none",
    textDecorationColor: COLORS.accent,
    textUnderlineOffset: 16,
    fontFamily: FONT_FAMILY,
    color: COLORS.text,
    lineHeight: 1.3,
    textAlign: "center" as const,
  };

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
          fontSize: 200,
          fontFamily: "Georgia, serif",
          color: COLORS.accent,
          opacity: entrance * 0.4,
          lineHeight: 0.5,
          marginBottom: 24,
        }}
      >
        {"\u201C"}
      </div>

      <div
        style={{
          ...textStyle,
          opacity: entrance,
          transform: `scale(${0.85 + entrance * 0.15})`,
          textShadow: `0 0 40px rgba(99, 102, 241, ${glowOpacity})`,
        }}
      >
        {data.text}
      </div>

      <div
        style={{
          width: 200,
          height: 6,
          backgroundColor: COLORS.accent,
          marginTop: 40,
          transform: `scaleX(${barSpring})`,
          transformOrigin: "center",
          borderRadius: 3,
        }}
      />
    </div>
  );
};
