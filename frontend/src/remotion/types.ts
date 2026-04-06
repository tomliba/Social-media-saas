/**
 * Props passed from Python to the Remotion Video composition.
 *
 * The Python wrapper serializes these to JSON; Remotion deserializes
 * them and passes them as React props to <Video />.
 */

export interface CharacterImages {
  closed: string;
  open_slight: string;
  open_medium: string;
  open_round: string;
  open_teeth: string;
  blink: string;
  gestures?: {
    [gestureName: string]: {
      closed: string;
      open_slight: string;
      open_medium: string;
      open_round: string;
      open_teeth: string;
      blink: string;
    };
  };
  between_open?: string;
  between_hips?: string;
  /** Frame-based animation system (body frames + mouth/blink overlays) */
  bodyFrames?: {
    /** Map of frame number (string) to public path, e.g. {"1": "char_doctor_frame_01.png"} */
    frames: Record<string, string>;
    config: FrameAnimationConfig;
    /** Mouth overlay PNGs: map of mouth key to public path */
    mouthImages: Record<string, string>;
    /** Blink overlay PNG public path */
    blinkImage: string;
  };
}

export interface FrameAnimationConfig {
  fps: number;
  transitions: {
    open_hands: { frames: [number, number]; hold_frame: number };
    hands_behind_back: { frames: [number, number]; hold_frame: number };
    regular: { hold_frame: number };
  };
  mouth_positions: Record<string, { x: number; y: number; scale?: number; rotation?: number }>;
  blink_position: { x: number; y: number; scale?: number; rotation?: number };
}

export interface CaptionWord {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface CaptionEntry {
  text: string;
  startFrame: number;
  endFrame: number;
  words: CaptionWord[];
}

export interface AudioTimestamp {
  time: number; // seconds
  volume: number; // 0-1
}

/* ── Visual Segment types (from Gemini visual plan) ────────── */

export interface AnimatedListData {
  title: string;
  items: string[];
  position?: string;
}

export interface StatCounterData {
  number: number;
  suffix: string;
  label: string;
  color: string;
  position?: string;
}

export interface DiagramData {
  steps: string[];
  style: "flowchart" | "linear" | "circular";
  position?: string;
}

export interface ComparisonData {
  left_label: string;
  right_label: string;
  left_items?: string[];
  right_items?: string[];
  position?: string;
}

export interface QuoteHighlightData {
  text: string;
  style: "bold" | "italic" | "underline";
  position?: string;
}

export interface TitleCardData {
  headline: string;
  subtitle?: string;
  accent_color?: string;
  position?: string;
}

export interface IconGridData {
  items: { icon: string; label: string }[];
  position?: string;
}

export interface BarChartData {
  title: string;
  bars: { label: string; value: number; color?: string }[];
  position?: string;
}

export interface BeforeAfterData {
  beforeTitle: string;
  beforeItems: string[];
  afterTitle: string;
  afterItems: string[];
  position?: string;
}

export interface FactCardData {
  emoji: string;
  fact: string;
  source?: string;
  position?: string;
}

export interface DonutChartData {
  segments: { label: string; value: number; color: string }[];
  centerText?: string;
  position?: string;
}

export interface CountdownRevealData {
  items: string[];
  revealText: string;
  position?: string;
}

export type VisualSegmentData =
  | AnimatedListData
  | StatCounterData
  | DiagramData
  | ComparisonData
  | QuoteHighlightData
  | TitleCardData
  | IconGridData
  | BarChartData
  | BeforeAfterData
  | FactCardData
  | DonutChartData
  | CountdownRevealData;

export type TransitionType = "fade" | "light_leak" | "zoom_blur";

export interface VisualSegment {
  startSec: number;
  endSec: number;
  speech: string;
  transition?: TransitionType;
  visual_type:
    | "animated_list"
    | "stat_counter"
    | "diagram"
    | "comparison"
    | "quote_highlight"
    | "title_card"
    | "icon_grid"
    | "bar_chart"
    | "before_after"
    | "fact_card"
    | "donut_chart"
    | "countdown_reveal"
    | "pexels_clip"
    | "ai_image";
  data: VisualSegmentData & Record<string, unknown>;
}

export type SceneTransitionStyle =
  | "fade"
  | "dissolve"
  | "smooth"
  | "zoom"
  | "slide"
  | "snap"
  | "none";

export interface VideoProps {
  audioPath: string;
  backgroundPaths: string[];
  backgroundType: "video" | "image";
  characterImages: CharacterImages;
  captions: CaptionEntry[];
  audioTimestamps: AudioTimestamp[];
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  characterPosition: "bottom-left" | "bottom-right";
  isFreeTier: boolean;
  watermarkPath: string;
  volumePerFrame?: number[];
  visualSegments?: VisualSegment[];
  showCaptions?: boolean;
  captionStyle?: string;
  captionFontSize?: string;
  captionTextTransform?: string;
  captionPosition?: string;
  music?: string;
  /** R2 URL for background music (browser preview); overrides local music lookup */
  musicUrl?: string;
  debug?: boolean;
  /** Video style — "ai-story" skips character layer and enables story overlays */
  style?: string;
  /** Hook text displayed in the first 2-3 seconds for ai-story */
  hookText?: string;
  /** Overlay animated film grain noise */
  filmGrain?: boolean;
  /** Subtle handheld-camera shake on the background layer */
  shakeEffect?: boolean;
  /** Scene transition style (ai-story only, character videos keep default crossfade) */
  transitionStyle?: SceneTransitionStyle;
  /** Per-scene duration in frames — controls how long each background image is shown */
  imageDurations?: number[];
}
