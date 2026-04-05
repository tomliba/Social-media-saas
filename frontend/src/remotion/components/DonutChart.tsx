import React from "react";
import { useCurrentFrame, spring, interpolate } from "remotion";
import type { DonutChartData } from "../types";
import { SAFE_ZONE, FONT_FAMILY, COLORS } from "./shared";

const SIZE = 500;
const STROKE = 60;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CX = SIZE / 2;
const CY = SIZE / 2;

export const DonutChart: React.FC<{
  data: DonutChartData;
  startFrame: number;
  endFrame: number;
  fps: number;
}> = ({ data, startFrame, endFrame, fps }) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;
  const duration = endFrame - startFrame;

  const total = data.segments.reduce((sum, s) => sum + s.value, 0) || 1;

  // Overall entrance
  const entrance = spring({
    frame: relFrame,
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.8 },
  });

  // Fill animation over 60% of duration
  const fillDuration = Math.floor(duration * 0.6);
  const fillProgress = interpolate(relFrame, [8, 8 + fillDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Compute segment arcs
  let cumulativeAngle = 0;
  const arcs = data.segments.map((seg) => {
    const segAngle = (seg.value / total) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += segAngle;
    return { ...seg, startAngle, segAngle };
  });

  // Label stagger
  const labelDelay = Math.min(8, Math.floor((duration - 12) / Math.max(data.segments.length, 1)));

  // Center text
  const centerSpring = spring({
    frame: Math.max(0, relFrame - 10),
    fps,
    config: { damping: 12, stiffness: 80, mass: 0.6 },
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
      {/* Donut SVG */}
      <div
        style={{
          transform: `scale(${entrance})`,
          opacity: entrance,
          marginBottom: 48,
          position: "relative",
        }}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Background ring */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={STROKE}
          />
          {/* Segments */}
          {arcs.map((arc, i) => {
            const segFraction = arc.segAngle / 360;
            const segLength = CIRCUMFERENCE * segFraction;
            const segOffset = CIRCUMFERENCE * (arc.startAngle / 360);

            // How much of this segment is revealed
            const revealedAngle = fillProgress * 360;
            const segEndAngle = arc.startAngle + arc.segAngle;
            let visibleFraction = 0;
            if (revealedAngle >= segEndAngle) {
              visibleFraction = 1;
            } else if (revealedAngle > arc.startAngle) {
              visibleFraction = (revealedAngle - arc.startAngle) / arc.segAngle;
            }

            return (
              <circle
                key={i}
                cx={CX}
                cy={CY}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={STROKE}
                strokeDasharray={`${segLength * visibleFraction} ${CIRCUMFERENCE - segLength * visibleFraction}`}
                strokeDashoffset={-segOffset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${CX} ${CY})`}
              />
            );
          })}
        </svg>
        {/* Center text */}
        {data.centerText && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: SIZE,
              height: SIZE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: centerSpring,
              transform: `scale(${0.8 + centerSpring * 0.2})`,
            }}
          >
            <span
              style={{
                fontSize: 56,
                fontWeight: 800,
                fontFamily: FONT_FAMILY,
                color: COLORS.text,
                textAlign: "center",
                maxWidth: SIZE - STROKE * 2 - 40,
              }}
            >
              {data.centerText}
            </span>
          </div>
        )}
      </div>

      {/* Labels */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 32 }}>
        {data.segments.map((seg, i) => {
          const lFrame = relFrame - 10 - i * labelDelay;
          const ls = spring({
            frame: Math.max(0, lFrame),
            fps,
            config: { damping: 12, stiffness: 100, mass: 0.6 },
          });
          const appeared = lFrame >= 0;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: appeared ? ls : 0,
                transform: `translateY(${(1 - (appeared ? ls : 0)) * 20}px)`,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: seg.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 600,
                  fontFamily: FONT_FAMILY,
                  color: COLORS.text,
                }}
              >
                {seg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
