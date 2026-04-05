import React from "react";
import { useCurrentFrame, spring } from "remotion";
import type { BeforeAfterData } from "../types";
import { SAFE_ZONE, FONT_FAMILY, COLORS } from "./shared";

export const BeforeAfter: React.FC<{
  data: BeforeAfterData;
  startFrame: number;
  endFrame: number;
  fps: number;
}> = ({ data, startFrame, endFrame, fps }) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;
  const duration = endFrame - startFrame;

  const beforeTitleSpring = spring({
    frame: relFrame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });

  const afterTitleSpring = spring({
    frame: Math.max(0, relFrame - 6),
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });

  const dividerSpring = spring({
    frame: Math.max(0, relFrame - 3),
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.6 },
  });

  const maxItems = Math.max(data.beforeItems.length, data.afterItems.length);
  const itemDelay = Math.min(7, Math.floor((duration - 16) / Math.max(maxItems, 1)));

  return (
    <div style={{ ...SAFE_ZONE, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {/* BEFORE section */}
      <div
        style={{
          fontSize: 68,
          fontWeight: 800,
          fontFamily: FONT_FAMILY,
          color: "#ef4444",
          marginBottom: 28,
          opacity: beforeTitleSpring,
          transform: `translateX(${(1 - beforeTitleSpring) * -40}px)`,
        }}
      >
        {data.beforeTitle}
      </div>

      {data.beforeItems.map((item, i) => {
        const itemFrame = relFrame - 8 - i * itemDelay;
        const s = spring({
          frame: Math.max(0, itemFrame),
          fps,
          config: { damping: 12, stiffness: 100, mass: 0.6 },
        });
        const appeared = itemFrame >= 0;

        return (
          <div
            key={`b-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 20,
              opacity: appeared ? s : 0,
              transform: `translateX(${(1 - (appeared ? s : 0)) * 50}px)`,
            }}
          >
            <span style={{ fontSize: 44, color: "#ef4444" }}>✗</span>
            <span
              style={{
                fontSize: 50,
                fontWeight: 600,
                fontFamily: FONT_FAMILY,
                color: "rgba(255,255,255,0.7)",
                textDecoration: "line-through",
                textDecorationColor: "rgba(239,68,68,0.5)",
              }}
            >
              {item}
            </span>
          </div>
        );
      })}

      {/* Divider with arrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 28,
          marginBottom: 28,
          opacity: dividerSpring,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 3,
            background: "linear-gradient(90deg, #ef4444, #22c55e)",
            transform: `scaleX(${dividerSpring})`,
            transformOrigin: "left",
          }}
        />
        <span
          style={{
            fontSize: 56,
            transform: `scale(${dividerSpring})`,
          }}
        >
          →
        </span>
      </div>

      {/* AFTER section */}
      <div
        style={{
          fontSize: 68,
          fontWeight: 800,
          fontFamily: FONT_FAMILY,
          color: "#22c55e",
          marginBottom: 28,
          opacity: afterTitleSpring,
          transform: `translateX(${(1 - afterTitleSpring) * -40}px)`,
        }}
      >
        {data.afterTitle}
      </div>

      {data.afterItems.map((item, i) => {
        const itemFrame = relFrame - 14 - i * itemDelay;
        const s = spring({
          frame: Math.max(0, itemFrame),
          fps,
          config: { damping: 12, stiffness: 100, mass: 0.6 },
        });
        const appeared = itemFrame >= 0;

        return (
          <div
            key={`a-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 20,
              opacity: appeared ? s : 0,
              transform: `translateX(${(1 - (appeared ? s : 0)) * 50}px)`,
            }}
          >
            <span style={{ fontSize: 44, color: "#22c55e" }}>✓</span>
            <span
              style={{
                fontSize: 50,
                fontWeight: 600,
                fontFamily: FONT_FAMILY,
                color: COLORS.text,
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
