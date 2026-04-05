import React from "react";
import { useCurrentFrame, spring } from "remotion";
import type { BarChartData } from "../types";
import { SAFE_ZONE, FONT_FAMILY, COLORS } from "./shared";

export const BarChart: React.FC<{
  data: BarChartData;
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

  const maxValue = Math.max(...data.bars.map((b) => b.value), 1);
  const barDelay = Math.min(8, Math.floor((duration - 12) / Math.max(data.bars.length, 1)));

  return (
    <div style={{ ...SAFE_ZONE, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {/* Title */}
      <div
        style={{
          fontSize: 88,
          fontWeight: 800,
          fontFamily: FONT_FAMILY,
          color: COLORS.accent,
          marginBottom: 56,
          opacity: titleSpring,
          transform: `translateY(${(1 - titleSpring) * 30}px)`,
        }}
      >
        {data.title}
      </div>

      {/* Bars */}
      {data.bars.map((bar, i) => {
        const barFrame = relFrame - 10 - i * barDelay;
        const barSpring = spring({
          frame: Math.max(0, barFrame),
          fps,
          config: { damping: 14, stiffness: 80, mass: 0.7 },
        });
        const appeared = barFrame >= 0;
        const barColor = bar.color || COLORS.accent;
        const widthPct = (bar.value / maxValue) * 100;

        return (
          <div
            key={i}
            style={{
              marginBottom: 36,
              opacity: appeared ? barSpring : 0,
              transform: `translateX(${(1 - (appeared ? barSpring : 0)) * -40}px)`,
            }}
          >
            {/* Label + value */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 600,
                  fontFamily: FONT_FAMILY,
                  color: COLORS.text,
                }}
              >
                {bar.label}
              </span>
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  fontFamily: FONT_FAMILY,
                  color: barColor,
                }}
              >
                {bar.value}
              </span>
            </div>
            {/* Bar track */}
            <div
              style={{
                width: "100%",
                height: 36,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderRadius: 18,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${widthPct * (appeared ? barSpring : 0)}%`,
                  height: "100%",
                  backgroundColor: barColor,
                  borderRadius: 18,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
