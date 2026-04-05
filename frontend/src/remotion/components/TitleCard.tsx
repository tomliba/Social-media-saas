import React from "react";
import { useCurrentFrame, spring } from "remotion";
import type { TitleCardData } from "../types";
import { SAFE_ZONE, FONT_FAMILY, COLORS } from "./shared";

export const TitleCard: React.FC<{
  data: TitleCardData;
  startFrame: number;
  endFrame: number;
  fps: number;
}> = ({ data, startFrame, endFrame, fps }) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;

  const accentColor = data.accent_color || COLORS.accent;

  const headlineSpring = spring({
    frame: relFrame,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.8 },
  });

  const subtitleSpring = spring({
    frame: Math.max(0, relFrame - 8),
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.6 },
  });

  const lineSpring = spring({
    frame: Math.max(0, relFrame - 4),
    fps,
    config: { damping: 16, stiffness: 140, mass: 0.5 },
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
      <div
        style={{
          width: 160,
          height: 7,
          backgroundColor: accentColor,
          borderRadius: 4,
          marginBottom: 44,
          transform: `scaleX(${lineSpring})`,
          transformOrigin: "center",
        }}
      />

      <div
        style={{
          fontSize: 112,
          fontWeight: 900,
          fontFamily: FONT_FAMILY,
          color: COLORS.text,
          textAlign: "center",
          lineHeight: 1.15,
          opacity: headlineSpring,
          transform: `translateY(${(1 - headlineSpring) * 40}px)`,
        }}
      >
        {data.headline}
      </div>

      {data.subtitle && (
        <div
          style={{
            fontSize: 62,
            fontWeight: 500,
            fontFamily: FONT_FAMILY,
            color: COLORS.textSecondary,
            textAlign: "center",
            marginTop: 28,
            opacity: subtitleSpring,
            transform: `translateY(${(1 - subtitleSpring) * 20}px)`,
          }}
        >
          {data.subtitle}
        </div>
      )}

      <div
        style={{
          width: 160,
          height: 7,
          backgroundColor: accentColor,
          borderRadius: 4,
          marginTop: 44,
          transform: `scaleX(${lineSpring})`,
          transformOrigin: "center",
        }}
      />
    </div>
  );
};
