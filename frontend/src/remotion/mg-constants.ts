import { spring } from "remotion";

// ── Shared Motion Graphics Constants ──

export const MG_BG = "#0a0a0a";
export const ACCENT = "#6366f1";
export const LABEL_COLOR = "#94a3b8";
export const DIVIDER_COLOR = "#333333";

// Typography
export const FONT_FAMILY = "Inter, sans-serif";

export const headlineStyle: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  fontWeight: 800,
  fontSize: 56,
  color: "white",
  margin: 0,
  lineHeight: 1.2,
};

export const bodyStyle: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  fontWeight: 600,
  fontSize: 42,
  color: "white",
  margin: 0,
  lineHeight: 1.3,
};

export const labelStyle: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  fontWeight: 400,
  fontSize: 36,
  color: LABEL_COLOR,
  margin: 0,
  lineHeight: 1.3,
};

// Animation
export const STAGGER_FRAMES = 10;

export const SPRING_CONFIG = {
  damping: 200,
};

// Layout — all elements fit within top half of 1080×1920
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 960;

// ── Shared spring helper ──

export function mgSpring(
  frame: number,
  fps: number,
  delay: number = 0
): number {
  return spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIG,
  });
}

// ── Wrapper style for all MG components ──

export const mgContainerStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  background: MG_BG,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 60,
  boxSizing: "border-box",
  overflow: "hidden",
};
