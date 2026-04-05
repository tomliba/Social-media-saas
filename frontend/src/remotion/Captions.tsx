import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { CaptionEntry } from "./types";

/* ── Constants ─────────────────────────────────────────────── */

const PHRASE_FADE_FRAMES = 5;
const BASE_FONT_SIZE = 64;

/* ── RTL detection ─────────────────────────────────────────── */

function isRTL(text: string): boolean {
  if (!text) return false;
  const first = text.codePointAt(0) ?? 0;
  // Hebrew: 0x0590–0x05FF, Arabic: 0x0600–0x06FF
  return (first >= 0x0590 && first <= 0x05ff) || (first >= 0x0600 && first <= 0x06ff);
}

/* ── Font size mapping ────────────────────────────────────── */

function getFontSize(base: number, size: string): number {
  if (size === "Small") return Math.round(base * 0.75);
  if (size === "Large") return Math.round(base * 1.25);
  return base; // Medium
}

/* ── Text transform mapping ───────────────────────────────── */

function getTextTransform(t: string): React.CSSProperties["textTransform"] {
  if (t === "UPPERCASE") return "uppercase";
  if (t === "Capitalize") return "capitalize";
  if (t === "lowercase") return "lowercase";
  return "none"; // Normal
}

/* ── Style definitions ────────────────────────────────────── */

interface WordStyle {
  fontFamily: string;
  fontWeight: number | string;
  fontStyle?: string;
  color: string;
  activeColor: string;
  textShadow: string;
  activeTextShadow?: string;
  WebkitTextStroke?: string;
  activeWebkitTextStroke?: string;
  paintOrder?: string;
  letterSpacing?: string;
  activeScale?: number;
  activeBackground?: string;
  activeBorderRadius?: number;
  activePadding?: string;
  containerRotate?: string;
  fontSizeMultiplier?: number;
  /** Override text-transform for this style */
  forceTextTransform?: React.CSSProperties["textTransform"];
}

function getStyleDef(styleName: string): WordStyle {
  switch (styleName) {
    case "bold_stroke":
      return {
        fontFamily: "Impact, 'Arial Black', sans-serif",
        fontWeight: 900,
        color: "#FFFFFF",
        activeColor: "#FFFFFF",
        textShadow: "0 2px 4px rgba(0,0,0,0.6)",
        WebkitTextStroke: "2px black",
        paintOrder: "stroke fill",
        activeScale: 1.1,
      };
    case "red_highlight":
      return {
        fontFamily: "Impact, 'Arial Black', sans-serif",
        fontWeight: 900,
        color: "#FFFFFF",
        activeColor: "#FF3333",
        textShadow: "0 2px 6px rgba(0,0,0,0.8), 2px 2px 4px rgba(0,0,0,0.7)",
      };
    case "sleek":
      return {
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontWeight: 300,
        color: "#FFFFFF",
        activeColor: "#FFFFFF",
        textShadow:
          "0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.6)",
        activeTextShadow:
          "0 0 15px rgba(255,255,255,0.8), 0 0 30px rgba(255,255,255,0.5), 0 0 45px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.6)",
      };
    case "karaoke":
      return {
        fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
        fontWeight: 800,
        color: "#FFFFFF",
        activeColor: "#FFFFFF",
        textShadow: "0 2px 4px rgba(0,0,0,0.8)",
        activeBackground: "#7C3AED",
        activeBorderRadius: 6,
        activePadding: "2px 8px",
      };
    case "majestic":
      return {
        fontFamily: "Georgia, 'Times New Roman', Times, serif",
        fontWeight: 700,
        fontStyle: "italic",
        color: "#FFFFFF",
        activeColor: "#FFFFFF",
        textShadow:
          "0 2px 4px rgba(180,140,60,0.5), 0 4px 8px rgba(0,0,0,0.6)",
      };
    case "beast":
      return {
        fontFamily: "Impact, 'Arial Black', sans-serif",
        fontWeight: 900,
        color: "#FFFFFF",
        activeColor: "#FFFFFF",
        textShadow: "0 2px 4px rgba(0,0,0,0.5)",
        WebkitTextStroke: "3.5px black",
        paintOrder: "stroke fill",
        fontSizeMultiplier: 1.25,
        containerRotate: "rotate(-2deg)",
      };
    case "elegant":
      return {
        fontFamily: "Georgia, 'Times New Roman', Times, serif",
        fontWeight: 400,
        color: "#CCCCCC",
        activeColor: "#FFFFFF",
        textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        letterSpacing: "3px",
      };
    case "pixel":
      return {
        fontFamily: "'Courier New', Courier, monospace",
        fontWeight: 700,
        color: "#FFFFFF",
        activeColor: "#FFFFFF",
        textShadow:
          "2px 0 0 rgba(0,0,0,0.9), 0 2px 0 rgba(0,0,0,0.9), -2px 0 0 rgba(0,0,0,0.9), 0 -2px 0 rgba(0,0,0,0.9), 4px 4px 0 rgba(0,0,0,0.4)",
      };
    case "clarity":
      return {
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontWeight: 400,
        color: "#FFFFFF",
        activeColor: "#FFFFFF",
        textShadow: "0 1px 3px rgba(0,0,0,0.4)",
        forceTextTransform: "lowercase",
      };
    default:
      // "regular" — matches original styling
      return {
        fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
        fontWeight: 800,
        color: "#FFFFFF",
        activeColor: "#FFD700",
        textShadow: [
          "0 0 8px rgba(0,0,0,0.9)",
          "2px 2px 4px rgba(0,0,0,0.8)",
          "-2px -2px 4px rgba(0,0,0,0.8)",
          "0 4px 8px rgba(0,0,0,0.6)",
        ].join(", "),
      };
  }
}

/* ── Captions component ───────────────────────────────────── */

interface CaptionsProps {
  captions: CaptionEntry[];
  captionStyle?: string;
  captionFontSize?: string;
  captionTextTransform?: string;
  captionPosition?: string;
}

function getCaptionTop(position: string): string {
  if (position === "top") return "15%";
  if (position === "middle") return "45%";
  return "75%"; // bottom (default)
}

export const Captions: React.FC<CaptionsProps> = ({
  captions,
  captionStyle = "regular",
  captionFontSize = "Medium",
  captionTextTransform = "Normal",
  captionPosition = "bottom",
}) => {
  const frame = useCurrentFrame();

  if (captions.length === 0) return null;

  // Find the active phrase (or one that's fading in/out)
  const activeIndex = captions.findIndex(
    (c) => frame >= c.startFrame - PHRASE_FADE_FRAMES && frame < c.endFrame + PHRASE_FADE_FRAMES
  );
  if (activeIndex === -1) return null;

  const caption = captions[activeIndex];
  const rtl = isRTL(caption.words?.[0]?.word ?? caption.text);

  // Phrase fade in/out
  let phraseOpacity = 1;
  if (frame < caption.startFrame) {
    phraseOpacity = interpolate(
      frame,
      [caption.startFrame - PHRASE_FADE_FRAMES, caption.startFrame],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  } else if (frame >= caption.endFrame) {
    phraseOpacity = interpolate(
      frame,
      [caption.endFrame, caption.endFrame + PHRASE_FADE_FRAMES],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  }

  const styleDef = getStyleDef(captionStyle);
  const fontSize = getFontSize(
    Math.round(BASE_FONT_SIZE * (styleDef.fontSizeMultiplier ?? 1)),
    captionFontSize
  );
  const textTransform = styleDef.forceTextTransform ?? getTextTransform(captionTextTransform);

  return (
    <div
      style={{
        position: "absolute",
        top: getCaptionTop(captionPosition),
        left: "5%",
        right: "5%",
        zIndex: 25,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px 12px",
        opacity: phraseOpacity,
        direction: rtl ? "rtl" : "ltr",
        textAlign: "center",
        transform: styleDef.containerRotate,
        textTransform,
      }}
    >
      {(caption.words ?? []).map((w, i) => {
        const isActive = frame >= w.startFrame && frame < w.endFrame;
        const isPast = frame >= w.endFrame;

        // Word entrance: scale + opacity pop when becoming active
        const animEnd = Math.max(w.startFrame + 1, Math.min(w.startFrame + 5, w.endFrame));
        const wordProgress =
          isActive || isPast
            ? interpolate(
                frame,
                [w.startFrame, animEnd],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              )
            : 0;

        const baseScale = styleDef.activeScale ?? 1.0;
        const wordScale =
          isActive || isPast ? 0.9 + (baseScale - 0.9) * wordProgress : 0.9;
        const wordOpacity = isActive || isPast ? 0.7 + 0.3 * wordProgress : 0.7;
        const color = isActive ? styleDef.activeColor : styleDef.color;
        const textShadow =
          isActive && styleDef.activeTextShadow
            ? styleDef.activeTextShadow
            : styleDef.textShadow;

        const wordBaseStyle: React.CSSProperties = {
          fontSize,
          fontWeight: styleDef.fontWeight,
          fontFamily: styleDef.fontFamily,
          fontStyle: styleDef.fontStyle,
          color,
          opacity: wordOpacity,
          transform: `scale(${wordScale.toFixed(4)})`,
          display: "inline-block",
          textShadow,
          transition: "color 0.1s ease-out",
          letterSpacing: styleDef.letterSpacing,
        };

        if (styleDef.WebkitTextStroke) {
          (wordBaseStyle as Record<string, unknown>).WebkitTextStroke =
            isActive && styleDef.activeWebkitTextStroke
              ? styleDef.activeWebkitTextStroke
              : styleDef.WebkitTextStroke;
        }
        if (styleDef.paintOrder) {
          wordBaseStyle.paintOrder = styleDef.paintOrder;
        }

        // Karaoke-style background on active word
        if (isActive && styleDef.activeBackground) {
          wordBaseStyle.background = styleDef.activeBackground;
          wordBaseStyle.borderRadius = styleDef.activeBorderRadius;
          wordBaseStyle.padding = styleDef.activePadding;
        }

        return (
          <span key={i} style={wordBaseStyle}>
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
