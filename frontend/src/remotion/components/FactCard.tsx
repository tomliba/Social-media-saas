import React from "react";
import { useCurrentFrame, spring } from "remotion";
import type { FactCardData } from "../types";
import { SAFE_ZONE, FONT_FAMILY, COLORS } from "./shared";

export const FactCard: React.FC<{
  data: FactCardData;
  startFrame: number;
  endFrame: number;
  fps: number;
}> = ({ data, startFrame, endFrame, fps }) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;

  // Emoji scale-in with bounce
  const emojiSpring = spring({
    frame: relFrame,
    fps,
    config: { damping: 8, stiffness: 120, mass: 0.8 },
  });

  // Fact text entrance
  const factSpring = spring({
    frame: Math.max(0, relFrame - 6),
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.7 },
  });

  // Source entrance
  const sourceSpring = spring({
    frame: Math.max(0, relFrame - 14),
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.6 },
  });

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
      {/* Emoji */}
      <div
        style={{
          fontSize: 180,
          lineHeight: 1,
          marginBottom: 48,
          transform: `scale(${emojiSpring})`,
          opacity: emojiSpring,
        }}
      >
        {data.emoji}
      </div>

      {/* Fact text */}
      <div
        style={{
          fontSize: 76,
          fontWeight: 800,
          fontFamily: FONT_FAMILY,
          color: COLORS.text,
          textAlign: "center",
          lineHeight: 1.25,
          opacity: factSpring,
          transform: `translateY(${(1 - factSpring) * 40}px)`,
        }}
      >
        {data.fact}
      </div>

      {/* Source */}
      {data.source && (
        <div
          style={{
            fontSize: 36,
            fontWeight: 400,
            fontFamily: FONT_FAMILY,
            color: COLORS.textSecondary,
            marginTop: 36,
            opacity: sourceSpring,
            transform: `translateY(${(1 - sourceSpring) * 15}px)`,
            fontStyle: "italic",
          }}
        >
          — {data.source}
        </div>
      )}
    </div>
  );
};
