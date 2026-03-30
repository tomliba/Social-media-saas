// ── Visual segment types for per-segment Pexels rendering ──

export interface VisualSegment {
  visual_type: string; // "pexels_clip" for now, more types in Phase 2
  startSec: number;
  endSec: number;
  speech: string;
  asset_url: string | null;
  data: Record<string, any>;
}

export interface BRollSegment {
  src: string;
  startFrame: number;
  endFrame: number;
}

export interface RenderConfig {
  avatarSrc?: string;
  captionChunks?: { text: string; startFrame: number; endFrame: number }[];
  audioSrc?: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  brollSegments?: BRollSegment[]; // OLD — keep for backward compatibility
  visualSegments?: VisualSegment[]; // NEW — per-segment visuals from /vg/visual-plan
}
