import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  mgContainerStyle,
  mgSpring,
  FONT_FAMILY,
  DIVIDER_COLOR,
} from "../mg-constants";

interface ComparisonProps {
  left_label: string;
  right_label: string;
  left_items?: string[];
  right_items?: string[];
  startFrame: number;
  endFrame: number;
}

const RED = "rgba(239,68,68,0.08)";
const GREEN = "rgba(34,197,94,0.08)";
const RED_TEXT = "#ef4444";
const GREEN_TEXT = "#22c55e";

export const Comparison: React.FC<ComparisonProps> = ({
  left_label,
  right_label,
  left_items = [],
  right_items = [],
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftSlide = mgSpring(frame, fps, startFrame);
  const rightSlide = mgSpring(frame, fps, startFrame + 4);
  const vsProgress = mgSpring(frame, fps, startFrame + 8);

  return (
    <div style={mgContainerStyle}>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Left column */}
        <div
          style={{
            flex: 1,
            background: RED,
            borderRadius: "16px 0 0 16px",
            padding: "40px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: leftSlide,
            transform: `translateX(${(1 - leftSlide) * -60}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 700,
              fontSize: 48,
              color: "white",
              marginBottom: 32,
            }}
          >
            {left_label}
          </div>
          {left_items.slice(0, 5).map((item, i) => {
            const p = mgSpring(frame, fps, startFrame + 16 + i * 8);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                  opacity: p,
                  transform: `translateX(${(1 - p) * -30}px)`,
                }}
              >
                <span style={{ fontSize: 32, color: RED_TEXT }}>✗</span>
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontWeight: 400,
                    fontSize: 36,
                    color: "white",
                  }}
                >
                  {item}
                </span>
              </div>
            );
          })}
        </div>

        {/* VS badge */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${0.5 + vsProgress * 0.5})`,
            opacity: vsProgress,
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: DIVIDER_COLOR,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            fontFamily: FONT_FAMILY,
            fontWeight: 800,
            fontSize: 24,
            color: "white",
          }}
        >
          VS
        </div>

        {/* Right column */}
        <div
          style={{
            flex: 1,
            background: GREEN,
            borderRadius: "0 16px 16px 0",
            padding: "40px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: rightSlide,
            transform: `translateX(${(1 - rightSlide) * 60}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 700,
              fontSize: 48,
              color: "white",
              marginBottom: 32,
            }}
          >
            {right_label}
          </div>
          {right_items.slice(0, 5).map((item, i) => {
            const p = mgSpring(frame, fps, startFrame + 16 + i * 8);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                  opacity: p,
                  transform: `translateX(${(1 - p) * 30}px)`,
                }}
              >
                <span style={{ fontSize: 32, color: GREEN_TEXT }}>✓</span>
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontWeight: 400,
                    fontSize: 36,
                    color: "white",
                  }}
                >
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
