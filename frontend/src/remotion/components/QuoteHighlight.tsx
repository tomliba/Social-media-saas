import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import {
  mgContainerStyle,
  mgSpring,
  ACCENT,
  FONT_FAMILY,
} from "../mg-constants";

interface QuoteHighlightProps {
  text: string;
  style?: "bold" | "italic" | "underline";
  startFrame: number;
  endFrame: number;
}

export const QuoteHighlight: React.FC<QuoteHighlightProps> = ({
  text,
  style = "bold",
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleProgress = mgSpring(frame, fps, startFrame);
  const scale = 0.8 + scaleProgress * 0.2;

  // Underline draw animation (left-to-right over 20 frames)
  const underlineProgress = interpolate(
    frame,
    [startFrame + 10, startFrame + 30],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const fontStyle: React.CSSProperties = {
    fontFamily: FONT_FAMILY,
    fontWeight: style === "italic" ? 400 : 800,
    fontStyle: style === "italic" ? "italic" : "normal",
    fontSize: 64,
    color: "white",
    textAlign: "center" as const,
    lineHeight: 1.2,
    textShadow: "0 4px 24px rgba(0,0,0,0.5)",
    position: "relative" as const,
    display: "inline-block",
  };

  return (
    <div style={mgContainerStyle}>
      {/* Decorative quotation marks */}
      <div
        style={{
          position: "absolute",
          top: 160,
          left: 80,
          fontFamily: "Georgia, serif",
          fontSize: 200,
          color: "white",
          opacity: 0.1,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {"\u201C"}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 160,
          right: 80,
          fontFamily: "Georgia, serif",
          fontSize: 200,
          color: "white",
          opacity: 0.1,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {"\u201D"}
      </div>

      {/* Quote text */}
      <div
        style={{
          opacity: scaleProgress,
          transform: `scale(${scale})`,
          maxWidth: 900,
          padding: "0 40px",
        }}
      >
        <div style={fontStyle}>
          {text}
          {/* Underline animation */}
          {style === "underline" && (
            <div
              style={{
                position: "absolute",
                bottom: -8,
                left: 0,
                width: `${underlineProgress}%`,
                height: 4,
                backgroundColor: ACCENT,
                borderRadius: 2,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
