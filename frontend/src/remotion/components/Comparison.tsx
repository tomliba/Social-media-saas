import React from "react";
import { useCurrentFrame, spring } from "remotion";
import type { ComparisonData } from "../types";
import { SAFE_ZONE, FONT_FAMILY, COLORS } from "./shared";

export const Comparison: React.FC<{
  data: ComparisonData;
  startFrame: number;
  endFrame: number;
  fps: number;
}> = ({ data, startFrame, endFrame, fps }) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;
  const duration = endFrame - startFrame;

  const labelSpring = spring({
    frame: relFrame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });

  const dividerSpring = spring({
    frame: Math.max(0, relFrame - 6),
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.6 },
  });

  const leftItems = data.left_items || [];
  const rightItems = data.right_items || [];
  const maxItems = Math.max(leftItems.length, rightItems.length);
  const itemDelay = Math.min(8, Math.floor((duration - 20) / Math.max(maxItems, 1)));

  return (
    <div style={{ ...SAFE_ZONE, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 48,
          opacity: labelSpring,
        }}
      >
        <div
          style={{
            flex: 1,
            fontSize: 68,
            fontWeight: 800,
            fontFamily: FONT_FAMILY,
            color: "#ef4444",
            textAlign: "center",
            transform: `translateX(${(1 - labelSpring) * -40}px)`,
          }}
        >
          {data.left_label}
        </div>
        <div
          style={{
            flex: 1,
            fontSize: 68,
            fontWeight: 800,
            fontFamily: FONT_FAMILY,
            color: "#22c55e",
            textAlign: "center",
            transform: `translateX(${(1 - labelSpring) * 40}px)`,
          }}
        >
          {data.right_label}
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: 4,
          backgroundColor: COLORS.textSecondary,
          marginBottom: 48,
          transform: `scaleX(${dividerSpring})`,
          transformOrigin: "center",
          opacity: dividerSpring * 0.4,
        }}
      />

      {Array.from({ length: maxItems }).map((_, i) => {
        const itemFrame = relFrame - 14 - i * itemDelay;
        const s = spring({
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
              justifyContent: "space-between",
              marginBottom: 40,
              opacity: appeared ? s : 0,
            }}
          >
            <div
              style={{
                flex: 1,
                fontSize: 54,
                fontWeight: 600,
                fontFamily: FONT_FAMILY,
                color: COLORS.text,
                textAlign: "center",
                paddingRight: 20,
                transform: `translateX(${(1 - (appeared ? s : 0)) * -30}px)`,
              }}
            >
              {leftItems[i] || ""}
            </div>
            <div
              style={{
                width: 3,
                backgroundColor: COLORS.textSecondary,
                opacity: 0.3,
              }}
            />
            <div
              style={{
                flex: 1,
                fontSize: 54,
                fontWeight: 600,
                fontFamily: FONT_FAMILY,
                color: COLORS.text,
                textAlign: "center",
                paddingLeft: 20,
                transform: `translateX(${(1 - (appeared ? s : 0)) * 30}px)`,
              }}
            >
              {rightItems[i] || ""}
            </div>
          </div>
        );
      })}
    </div>
  );
};
