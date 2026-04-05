import React from "react";
import { useCurrentFrame, spring } from "remotion";
import type { DiagramData } from "../types";
import { SAFE_ZONE, FONT_FAMILY, COLORS } from "./shared";

export const Diagram: React.FC<{
  data: DiagramData;
  startFrame: number;
  endFrame: number;
  fps: number;
}> = ({ data, startFrame, endFrame, fps }) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;
  const duration = endFrame - startFrame;

  const stepDelay = Math.min(10, Math.floor((duration - 10) / Math.max(data.steps.length, 1)));

  if (data.style === "circular") {
    return (
      <div style={{ ...SAFE_ZONE, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", width: 1000, height: 1000 }}>
          {data.steps.map((step, i) => {
            const angle = (i / data.steps.length) * 2 * Math.PI - Math.PI / 2;
            const radius = 380;
            const cx = 500 + Math.cos(angle) * radius;
            const cy = 500 + Math.sin(angle) * radius;

            const stepFrame = relFrame - 5 - i * stepDelay;
            const s = spring({
              frame: Math.max(0, stepFrame),
              fps,
              config: { damping: 12, stiffness: 100, mass: 0.6 },
            });
            const appeared = stepFrame >= 0;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: cx - 150,
                  top: cy - 70,
                  width: 300,
                  textAlign: "center",
                  opacity: appeared ? s : 0,
                  transform: `scale(${appeared ? s : 0})`,
                }}
              >
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    backgroundColor: COLORS.accent,
                    color: "#fff",
                    fontSize: 38,
                    fontWeight: 800,
                    fontFamily: FONT_FAMILY,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                  }}
                >
                  {i + 1}
                </div>
                <span
                  style={{
                    fontSize: 44,
                    fontWeight: 600,
                    fontFamily: FONT_FAMILY,
                    color: COLORS.text,
                    lineHeight: 1.2,
                  }}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Linear / flowchart (vertical)
  return (
    <div style={{ ...SAFE_ZONE, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {data.steps.map((step, i) => {
        const stepFrame = relFrame - 5 - i * stepDelay;
        const s = spring({
          frame: Math.max(0, stepFrame),
          fps,
          config: { damping: 12, stiffness: 100, mass: 0.6 },
        });
        const appeared = stepFrame >= 0;

        const connectorSpring = spring({
          frame: Math.max(0, stepFrame - 3),
          fps,
          config: { damping: 15, stiffness: 120, mass: 0.5 },
        });

        return (
          <React.Fragment key={i}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 32,
                opacity: appeared ? s : 0,
                transform: `translateY(${(1 - (appeared ? s : 0)) * 40}px)`,
              }}
            >
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  backgroundColor: COLORS.accent,
                  color: "#fff",
                  fontSize: 42,
                  fontWeight: 800,
                  fontFamily: FONT_FAMILY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <span
                style={{
                  fontSize: 58,
                  fontWeight: 600,
                  fontFamily: FONT_FAMILY,
                  color: COLORS.text,
                  lineHeight: 1.3,
                }}
              >
                {step}
              </span>
            </div>

            {i < data.steps.length - 1 && (
              <div
                style={{
                  width: 4,
                  height: 48,
                  backgroundColor: COLORS.accent,
                  marginLeft: 40,
                  opacity: appeared ? connectorSpring * 0.5 : 0,
                  transform: `scaleY(${appeared ? connectorSpring : 0})`,
                  transformOrigin: "top",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
