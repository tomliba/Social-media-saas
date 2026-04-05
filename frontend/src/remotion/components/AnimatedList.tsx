import React from "react";
import { useCurrentFrame, spring } from "remotion";
import type { AnimatedListData } from "../types";
import { SAFE_ZONE, FONT_FAMILY, COLORS } from "./shared";

export const AnimatedList: React.FC<{
  data: AnimatedListData;
  startFrame: number;
  endFrame: number;
  fps: number;
}> = ({ data, startFrame, endFrame, fps }) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;
  const duration = endFrame - startFrame;

  const titleSpring = spring({
    frame: relFrame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });

  const itemDelay = Math.min(8, Math.floor((duration - 10) / Math.max(data.items.length, 1)));

  return (
    <div style={{ ...SAFE_ZONE, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div
        style={{
          fontSize: 88,
          fontWeight: 800,
          fontFamily: FONT_FAMILY,
          color: COLORS.accent,
          marginBottom: 60,
          opacity: titleSpring,
          transform: `translateY(${(1 - titleSpring) * 30}px)`,
        }}
      >
        {data.title}
      </div>

      {data.items.map((item, i) => {
        const itemFrame = relFrame - 10 - i * itemDelay;
        const itemSpring = spring({
          frame: Math.max(0, itemFrame),
          fps,
          config: { damping: 12, stiffness: 100, mass: 0.6 },
        });
        const appeared = itemFrame >= 0;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              marginBottom: 44,
              opacity: appeared ? itemSpring : 0,
              transform: `translateX(${(1 - (appeared ? itemSpring : 0)) * 60}px)`,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                backgroundColor: COLORS.accent,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 64,
                fontWeight: 600,
                fontFamily: FONT_FAMILY,
                color: COLORS.text,
                lineHeight: 1.3,
              }}
            >
              {item}
            </span>
          </div>
        );
      })}
    </div>
  );
};
