import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  mgContainerStyle,
  mgSpring,
  ACCENT,
  FONT_FAMILY,
} from "../mg-constants";
import { getIcon } from "../mg-icons";

interface IconGridItem {
  icon: string;
  label: string;
}

interface IconGridProps {
  items: IconGridItem[];
  startFrame: number;
  endFrame: number;
}

export const IconGrid: React.FC<IconGridProps> = ({
  items,
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const capped = items.slice(0, 6);

  // Grid layout: 1 col for 1-3, 2 cols for 4, 3 cols for 5-6
  const cols = capped.length <= 3 ? 1 : capped.length <= 4 ? 2 : 3;

  return (
    <div style={mgContainerStyle}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "48px 40px",
          width: "100%",
          maxWidth: 900,
        }}
      >
        {capped.map((item, i) => {
          const delay = startFrame + i * 8;
          const p = mgSpring(frame, fps, delay);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                opacity: p,
                transform: `scale(${0.7 + p * 0.3}) translateY(${(1 - p) * 20}px)`,
              }}
            >
              {getIcon(item.icon, 48, ACCENT)}
              <span
                style={{
                  fontFamily: FONT_FAMILY,
                  fontWeight: 600,
                  fontSize: 28,
                  color: "white",
                  textAlign: "center",
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
