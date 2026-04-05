import React from "react";
import { useCurrentFrame, spring } from "remotion";
import type { IconGridData } from "../types";
import { SAFE_ZONE, FONT_FAMILY, COLORS } from "./shared";

/* ── SVG icon paths for the 12 fixed icons ─────────────────── */

const ICON_PATHS: Record<string, string> = {
  checkmark:
    "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z",
  lightning:
    "M7 2v11h3v9l7-12h-4l4-8H7z",
  star:
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  heart:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  shield:
    "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z",
  clock:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z",
  chart_up:
    "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99l1.5 1.5z",
  brain:
    "M12 2C8.5 2 6 4.5 6 7c0 1.5.5 2.5 1.5 3.5C6.5 11.5 5 13.5 5 16c0 3 2.5 5 5 5h4c2.5 0 5-2 5-5 0-2.5-1.5-4.5-2.5-5.5C17.5 9.5 18 8.5 18 7c0-2.5-2.5-5-6-5zm-1 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm2 14h-2c-1.65 0-3-1.35-3-3s1.35-3 3-3h2c1.65 0 3 1.35 3 3s-1.35 3-3 3z",
  fire:
    "M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z",
  target:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  medal:
    "M12 2C8 2 6 4 6 6.5S8 11 12 11s6-2.5 6-4.5S16 2 12 2zm0 12l-4 8 4-2 4 2-4-8z",
  leaf:
    "M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z",
};

const IconSvg: React.FC<{ name: string; size: number; color: string }> = ({ name, size, color }) => {
  const path = ICON_PATHS[name];
  if (!path) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.5,
          fontWeight: 800,
          color: "#0a0a0a",
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d={path} />
    </svg>
  );
};

export const IconGrid: React.FC<{
  data: IconGridData;
  startFrame: number;
  endFrame: number;
  fps: number;
}> = ({ data, startFrame, endFrame, fps }) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;
  const duration = endFrame - startFrame;

  const items = data.items.slice(0, 6);
  const cols = items.length <= 4 ? 2 : 3;
  const itemDelay = Math.min(6, Math.floor((duration - 8) / Math.max(items.length, 1)));

  return (
    <div style={{ ...SAFE_ZONE, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 72,
          maxWidth: cols === 2 ? 800 : 1020,
        }}
      >
        {items.map((item, i) => {
          const itemFrame = relFrame - 4 - i * itemDelay;
          const s = spring({
            frame: Math.max(0, itemFrame),
            fps,
            config: { damping: 10, stiffness: 100, mass: 0.6 },
          });
          const appeared = itemFrame >= 0;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: cols === 2 ? 320 : 280,
                opacity: appeared ? s : 0,
                transform: `scale(${appeared ? s : 0})`,
              }}
            >
              <IconSvg name={item.icon} size={120} color={COLORS.accent} />
              <span
                style={{
                  fontSize: 50,
                  fontWeight: 600,
                  fontFamily: FONT_FAMILY,
                  color: COLORS.text,
                  textAlign: "center",
                  marginTop: 20,
                  lineHeight: 1.2,
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
