import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  mgContainerStyle,
  mgSpring,
  labelStyle,
  ACCENT,
  FONT_FAMILY,
} from "../mg-constants";

interface TitleCardProps {
  headline: string;
  subtitle?: string;
  accent_color?: string;
  startFrame: number;
  endFrame: number;
}

export const TitleCard: React.FC<TitleCardProps> = ({
  headline,
  subtitle,
  accent_color = ACCENT,
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Headline: spring from scale(2.0) to scale(1.0)
  const headlineProgress = mgSpring(frame, fps, startFrame);
  const headlineScale = 2.0 - headlineProgress * 1.0; // 2.0 → 1.0

  // Subtitle: slides up, 10 frames after headline
  const subtitleProgress = mgSpring(frame, fps, startFrame + 10);

  return (
    <div
      style={{
        ...mgContainerStyle,
        background: `radial-gradient(ellipse at center, ${accent_color}1F 0%, #0a0a0a 70%)`,
      }}
    >
      {/* Headline */}
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 800,
          fontSize: 64,
          color: "white",
          textAlign: "center",
          lineHeight: 1.2,
          opacity: headlineProgress,
          transform: `scale(${headlineScale})`,
          maxWidth: 900,
        }}
      >
        {headline}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            ...labelStyle,
            color: accent_color,
            fontSize: 36,
            marginTop: 16,
            textAlign: "center",
            opacity: subtitleProgress,
            transform: `translateY(${(1 - subtitleProgress) * 20}px)`,
            maxWidth: 800,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
