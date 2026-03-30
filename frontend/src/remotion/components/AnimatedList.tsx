import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  mgContainerStyle,
  mgSpring,
  headlineStyle,
  bodyStyle,
  ACCENT,
  FONT_FAMILY,
} from "../mg-constants";

interface AnimatedListProps {
  title: string;
  items: string[];
  style?: "spring_stagger" | "fade_in" | "slide_right";
  startFrame: number;
  endFrame: number;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({
  title,
  items,
  style = "spring_stagger",
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - startFrame;
  const capped = items.slice(0, 5);

  // Title appears at startFrame
  const titleProgress = mgSpring(frame, fps, startFrame);

  return (
    <div style={mgContainerStyle}>
      {/* Title */}
      <div
        style={{
          ...headlineStyle,
          textAlign: "center",
          opacity: titleProgress,
          transform: `translateY(${(1 - titleProgress) * 30}px)`,
          marginBottom: 40,
        }}
      >
        {title}
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
        {capped.map((item, i) => {
          const itemDelay = startFrame + 15 + i * 10;
          const p = mgSpring(frame, fps, itemDelay);

          let transform = `translateY(${(1 - p) * 40}px)`;
          if (style === "slide_right") {
            transform = `translateX(${(1 - p) * -60}px)`;
          }

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                opacity: style === "fade_in" ? p : p,
                transform,
              }}
            >
              {/* Accent bullet */}
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: ACCENT,
                  flexShrink: 0,
                }}
              />
              <span style={{ ...bodyStyle }}>{item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
