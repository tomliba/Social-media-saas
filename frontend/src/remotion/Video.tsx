import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  interpolate,
  Loop,
  spring,
  useCurrentFrame,
  staticFile,
} from "remotion";
import type { VideoProps, CharacterImages, FrameAnimationConfig, SceneTransitionStyle } from "./types";
import { Captions } from "./Captions";
import { MotionGraphicsLayer } from "./components/MotionGraphicsLayer";

/* ── Asset resolver (supports both local paths and full URLs) ── */

const resolveAsset = (path: string): string =>
  path.startsWith('http://') || path.startsWith('https://') ? path : staticFile(path);

/* ── Constants ─────────────────────────────────────────────── */

const CROSSFADE_FRAMES = 6; // images: slow Ken Burns dissolve
const VIDEO_CUT_FRAMES = 3; // videos: quick cut (~100ms)

const MUSIC_FILES: Record<string, string> = {
  "happy": "Happy rhythm.mp3",
  "tension": "Quiet before storm.mp3",
  "symphony": "Brilliant symphony.mp3",
  "shadows": "Breathing shadows.mp3",
  "bass": "Deep bass.mp3",
  "drums": "Cinematic drums.mp3",
  "lofi": "Lo-fi chill.mp3",
  "piano": "piano.mp3",
  "motivational": "Motivational rise.mp3",
};
const MUSIC_FADE_IN_FRAMES = 30;  // 1 second
const MUSIC_FADE_OUT_FRAMES = 60; // 2 seconds
const MUSIC_VOLUME = 0.13;

type MouthImage = "closed" | "open_slight" | "open_medium" | "open_round" | "open_teeth";

/* ── Seeded PRNG (deterministic blinks across renders) ────── */

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pre-compute blink schedule: list of [startFrame, endFrame] pairs. */
function generateBlinkSchedule(
  durationInFrames: number,
  fps: number
): [number, number][] {
  const rng = mulberry32(42); // fixed seed for determinism
  const blinks: [number, number][] = [];
  let frame = Math.round((3 + rng() * 2) * fps); // first blink at 3-5s

  while (frame < durationInFrames - 10) {
    const blinkDuration = 5; // 5 frames
    blinks.push([frame, frame + blinkDuration]);
    // Next blink in 3-5 seconds
    const gap = 3 + rng() * 2;
    frame += Math.round(gap * fps);
  }

  return blinks;
}


/* ── Pose schedule (random weight-shift idle animation) ────── */

interface Pose {
  startFrame: number;
  holdEnd: number;    // end of hold = start of transition to next
  endFrame: number;   // end of transition
  angle: number;      // rotation in degrees (±1 max)
  offsetX: number;    // horizontal shift in px (±4 max)
}

function generatePoseSchedule(
  durationInFrames: number,
  fps: number
): Pose[] {
  const rng = mulberry32(77); // different seed from blinks
  const poses: Pose[] = [];
  let frame = 0;

  // First pose: start at neutral
  const firstHold = Math.round((1 + rng()) * fps); // hold 1-2s
  const transFrames = Math.round(1.5 * fps);        // 1.5s transition
  poses.push({
    startFrame: 0,
    holdEnd: firstHold,
    endFrame: firstHold + transFrames,
    angle: 0,
    offsetX: 0,
  });
  frame = firstHold + transFrames;

  while (frame < durationInFrames) {
    const hold = Math.round((1 + rng()) * fps);      // hold 1-2s
    const angle = (rng() - 0.5) * 2.5;               // ±1.25°
    const offsetX = (rng() - 0.5) * 14.0;            // ±7px
    const end = Math.min(frame + hold + transFrames, durationInFrames);
    poses.push({
      startFrame: frame,
      holdEnd: frame + hold,
      endFrame: end,
      angle,
      offsetX,
    });
    frame = end;
  }

  return poses;
}

/** Smooth ease-in-out (cubic) */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Get angle and offsetX at a given frame from the pose schedule */
function getPoseAtFrame(
  frame: number,
  poses: Pose[]
): { angle: number; offsetX: number } {
  for (let i = 0; i < poses.length; i++) {
    const pose = poses[i];
    const next = poses[i + 1];

    if (frame < pose.holdEnd) {
      return { angle: pose.angle, offsetX: pose.offsetX };
    }

    if (next && frame >= pose.holdEnd && frame < pose.endFrame) {
      const progress = (frame - pose.holdEnd) / (pose.endFrame - pose.holdEnd);
      const eased = easeInOut(Math.min(Math.max(progress, 0), 1));
      return {
        angle: pose.angle + (next.angle - pose.angle) * eased,
        offsetX: pose.offsetX + (next.offsetX - pose.offsetX) * eased,
      };
    }
  }

  const last = poses[poses.length - 1];
  return { angle: last.angle, offsetX: last.offsetX };
}


/* ── Ken Burns helpers ─────────────────────────────────────── */

type KBDirection = "zoom-in" | "zoom-out" | "pan-left" | "pan-right";

const KB_DIRECTIONS: KBDirection[] = [
  "zoom-in",
  "zoom-out",
  "pan-left",
  "pan-right",
];

function getKenBurnsStyle(
  direction: KBDirection,
  progress: number
): React.CSSProperties {
  switch (direction) {
    case "zoom-in": {
      const scale = 1 + 0.15 * progress;
      return { transform: `scale(${scale})` };
    }
    case "zoom-out": {
      const scale = 1.15 - 0.15 * progress;
      return { transform: `scale(${scale})` };
    }
    case "pan-left": {
      const tx = interpolate(progress, [0, 1], [3, -3]);
      return { transform: `scale(1.12) translateX(${tx}%)` };
    }
    case "pan-right": {
      const tx = interpolate(progress, [0, 1], [-3, 3]);
      return { transform: `scale(1.12) translateX(${tx}%)` };
    }
  }
}

/* ── Image slideshow (Ken Burns) ───────────────────────────── */

const ImageBackground: React.FC<{
  paths: string[];
  durationInFrames: number;
}> = ({ paths, durationInFrames }) => {
  const frame = useCurrentFrame();
  if (paths.length === 0) return null;
  const framesPerSlide = Math.floor(durationInFrames / paths.length);

  return (
    <AbsoluteFill>
      {paths.map((imgPath, i) => {
        const slideStart = i * framesPerSlide;
        const slideEnd =
          i === paths.length - 1 ? durationInFrames : (i + 1) * framesPerSlide;

        const extendedStart = Math.max(0, slideStart - CROSSFADE_FRAMES);
        const extendedEnd = Math.min(durationInFrames, slideEnd + CROSSFADE_FRAMES);
        if (frame < extendedStart || frame > extendedEnd) return null;

        let opacity = 1;
        if (i > 0 && frame < slideStart + CROSSFADE_FRAMES) {
          opacity = interpolate(frame, [slideStart, slideStart + CROSSFADE_FRAMES], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        }
        if (i < paths.length - 1 && frame > slideEnd - CROSSFADE_FRAMES) {
          opacity = interpolate(frame, [slideEnd - CROSSFADE_FRAMES, slideEnd], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        }

        const direction = KB_DIRECTIONS[i % KB_DIRECTIONS.length];
        const progress = interpolate(frame, [slideStart, slideEnd], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const kbStyle = getKenBurnsStyle(direction, progress);

        return (
          <AbsoluteFill key={i} style={{ opacity, overflow: "hidden" }}>
            <Img
              src={resolveAsset(imgPath)}
              style={{ width: "100%", height: "100%", objectFit: "cover", ...kbStyle }}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

/* ── Video clip background ─────────────────────────────────── */

const VideoBackground: React.FC<{
  paths: string[];
  durationInFrames: number;
  fps: number;
}> = ({ paths, durationInFrames, fps }) => {
  const frame = useCurrentFrame();
  if (paths.length === 0) return null;
  const framesPerClip = Math.floor(durationInFrames / paths.length);

  return (
    <AbsoluteFill>
      {paths.map((clipPath, i) => {
        const clipStart = i * framesPerClip;
        const clipEnd =
          i === paths.length - 1 ? durationInFrames : (i + 1) * framesPerClip;

        const extendedStart = Math.max(0, clipStart - VIDEO_CUT_FRAMES);
        const extendedEnd = Math.min(durationInFrames, clipEnd + VIDEO_CUT_FRAMES);
        if (frame < extendedStart || frame > extendedEnd) return null;

        let opacity = 1;
        if (i > 0 && frame < clipStart + VIDEO_CUT_FRAMES) {
          opacity = interpolate(frame, [clipStart, clipStart + VIDEO_CUT_FRAMES], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        }
        if (i < paths.length - 1 && frame > clipEnd - VIDEO_CUT_FRAMES) {
          opacity = interpolate(frame, [clipEnd - VIDEO_CUT_FRAMES, clipEnd], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        }

        return (
          <AbsoluteFill key={i} style={{ opacity, overflow: "hidden" }}>
            <OffthreadVideo
              src={resolveAsset(clipPath)}
              startFrom={0}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

/* ── Volume-only mouth with hold time, micro-closures & jitter */

const MIN_HOLD_FRAMES = 9;   // minimum frames before switching shape
const MICRO_CLOSURE_FRAMES = 2; // closed frames between syllables
const DIP_THRESHOLD = 0.15;  // 15% volume drop triggers micro-closure
const JITTER_PERIOD = 3;     // alternate shapes every 3-4 frames

/** Raw volume → mouth shape (no hold / smoothing applied). */
function rawMouthForFrame(frame: number, volumePerFrame: number[]): MouthImage {
  const vol = frame < volumePerFrame.length ? volumePerFrame[frame] : 0;
  if (vol < 0.08) return "closed";
  if (vol >= 0.20) {
    // Jitter: rotate open_medium / open_teeth / open_round every JITTER_PERIOD frames
    const shapes: MouthImage[] = ["open_medium", "open_teeth", "open_round"];
    return shapes[Math.floor(frame / JITTER_PERIOD) % 3];
  }
  // 0.08–0.20: mostly open_slight, flash open_teeth for 2 of every 14 frames
  return (frame % 14) < 2 ? "open_teeth" : "open_slight";
}

/** Check if a micro-closure dip starts at exactly `dipFrame`. */
function isDipAt(dipFrame: number, volumePerFrame: number[]): boolean {
  if (dipFrame <= 0 || dipFrame >= volumePerFrame.length) return false;
  const vPrev = volumePerFrame[dipFrame - 1];
  const vNow = volumePerFrame[dipFrame];
  return vPrev >= 0.08 && vNow < vPrev * (1 - DIP_THRESHOLD) && vNow < 0.25;
}

function resolveMouthFromVolume(
  frame: number,
  volumePerFrame: number[],
  blinkSchedule: [number, number][],
  images: CharacterImages
): { mouthKey: MouthImage; volume: number; isBlinking: boolean } {
  const vol = frame < volumePerFrame.length ? volumePerFrame[frame] : 0;

  // ── 1. Micro-closure: if a dip started within the last MICRO_CLOSURE_FRAMES, show closed ──
  for (let i = 0; i < MICRO_CLOSURE_FRAMES; i++) {
    if (isDipAt(frame - i, volumePerFrame)) {
      return { mouthKey: "closed", volume: vol, isBlinking: false };
    }
  }

  // ── 2. Compute raw shape for this frame ──
  const desired = rawMouthForFrame(frame, volumePerFrame);

  // ── 3. Minimum hold: keep the previous shape unless it has been held for MIN_HOLD_FRAMES ──
  // Walk backwards to find when the shape last changed (up to MIN_HOLD_FRAMES back)
  let holdShape = desired;
  if (frame >= MIN_HOLD_FRAMES) {
    // Find the shape that was "committed" MIN_HOLD_FRAMES ago
    const anchorFrame = frame - MIN_HOLD_FRAMES;
    const anchorShape = rawMouthForFrame(anchorFrame, volumePerFrame);
    // Check if anchor was a micro-closure — if so, don't hold it
    let anchorWasDip = false;
    for (let i = 0; i < MICRO_CLOSURE_FRAMES; i++) {
      if (isDipAt(anchorFrame - i, volumePerFrame)) { anchorWasDip = true; break; }
    }
    if (!anchorWasDip) {
      // Check if all frames from anchor+1 to now-1 had the same raw shape as anchor
      let allSame = true;
      for (let f = anchorFrame + 1; f < frame; f++) {
        let fWasDip = false;
        for (let i = 0; i < MICRO_CLOSURE_FRAMES; i++) {
          if (isDipAt(f - i, volumePerFrame)) { fWasDip = true; break; }
        }
        if (fWasDip) { allSame = false; break; }
        if (rawMouthForFrame(f, volumePerFrame) !== anchorShape) { allSame = false; break; }
      }
      // If the anchor shape has been stable, commit to it; otherwise allow the new shape
      if (allSame && anchorShape !== desired) {
        // The desired shape just changed — hold the anchor shape for MIN_HOLD_FRAMES
        holdShape = anchorShape;
      }
    }
  }

  // ── 4. Blink override ──
  // Frame-based system: blink is an independent eye overlay, so allow at any volume.
  // Legacy system: blink replaces the whole image, so only during low volume.
  let isBlinking = false;
  const hasFrameBlink = !!images.bodyFrames?.blinkImage;
  const hasLegacyBlink = images.blink || images.gestures?.default?.blink;
  const hasBlink = hasFrameBlink || hasLegacyBlink;
  if (hasBlink && (hasFrameBlink || vol < 0.15)) {
    for (const [bs, be] of blinkSchedule) {
      if (frame >= bs && frame < be) { isBlinking = true; break; }
      if (bs > frame) break;
    }
  }

  return { mouthKey: holdShape, volume: vol, isBlinking };
}

/* ── Gesture schedule (pose switching during pauses) ────────── */

const GESTURE_TRANSITION_FRAMES = 2; // frames to show "between" image
const GESTURE_MIN_GAP = GESTURE_TRANSITION_FRAMES * 2 + 2; // min frames between transitions
const GESTURE_PAUSE_MIN_FRAMES = 15; // min consecutive silent frames to be a pause
const GESTURE_NAMES = ["hands_open", "hands_hips"] as const;

interface GestureTransition {
  frame: number;       // frame at which transition starts
  fromGesture: string;
  toGesture: string;
}

function generateGestureSchedule(
  volumePerFrame: number[],
  gestures: NonNullable<CharacterImages["gestures"]>,
): GestureTransition[] {
  const rng = mulberry32(55);
  const schedule: GestureTransition[] = [];
  const availableGestures = GESTURE_NAMES.filter((g) => gestures[g]);
  if (availableGestures.length === 0) return [];

  // Find all pauses: stretches where volume < 0.08 for >= GESTURE_PAUSE_MIN_FRAMES
  const pauses: { start: number; end: number; mid: number }[] = [];
  let pauseStart = -1;
  for (let f = 0; f < volumePerFrame.length; f++) {
    if (volumePerFrame[f] < 0.08) {
      if (pauseStart === -1) pauseStart = f;
    } else {
      if (pauseStart !== -1 && f - pauseStart >= GESTURE_PAUSE_MIN_FRAMES) {
        pauses.push({ start: pauseStart, end: f, mid: Math.floor((pauseStart + f) / 2) });
      }
      pauseStart = -1;
    }
  }
  // Handle pause at end of audio
  if (pauseStart !== -1 && volumePerFrame.length - pauseStart >= GESTURE_PAUSE_MIN_FRAMES) {
    pauses.push({
      start: pauseStart,
      end: volumePerFrame.length,
      mid: Math.floor((pauseStart + volumePerFrame.length) / 2),
    });
  }

  const GESTURE_MIN_HOLD = 45; // hold a gesture for at least 1.5s (45 frames at 30fps)
  let currentGesture = "default";
  let lastTransitionFrame = -GESTURE_MIN_GAP; // allow first transition immediately
  let lastGestureStartFrame = -GESTURE_MIN_HOLD; // when we switched TO current gesture

  for (const pause of pauses) {
    // Different chance depending on direction:
    // 50% to switch FROM default to a gesture, 25% to return to default
    const chance = currentGesture === "default" ? 0.5 : 0.4;
    if (rng() < (1 - chance)) continue;

    // Ensure enough gap from last transition
    if (pause.mid - lastTransitionFrame < GESTURE_MIN_GAP) continue;

    // Enforce minimum hold time before returning to default
    if (currentGesture !== "default" && pause.mid - lastGestureStartFrame < GESTURE_MIN_HOLD) continue;

    let nextGesture: string;
    if (currentGesture !== "default") {
      // Must return to default first
      nextGesture = "default";
    } else {
      // Pick a random gesture
      nextGesture = availableGestures[Math.floor(rng() * availableGestures.length)];
    }

    schedule.push({
      frame: pause.mid,
      fromGesture: currentGesture,
      toGesture: nextGesture,
    });
    lastTransitionFrame = pause.mid;
    if (nextGesture !== "default") {
      lastGestureStartFrame = pause.mid;
    }
    currentGesture = nextGesture;
  }

  return schedule;
}

type GestureState = {
  activeGesture: string;
  isTransition: boolean;
  betweenImage: string | null; // path to between_open or between_hips image
};

function getGestureAtFrame(
  frame: number,
  schedule: GestureTransition[],
  images: CharacterImages,
): GestureState {
  let activeGesture = "default";
  let isTransition = false;
  let betweenImage: string | null = null;

  for (let i = 0; i < schedule.length; i++) {
    const t = schedule[i];
    const transStart = t.frame;
    const transEnd = t.frame + GESTURE_TRANSITION_FRAMES;

    if (frame < transStart) break;

    if (frame >= transStart && frame < transEnd) {
      // We're in a transition
      isTransition = true;
      // Determine which between image to use
      const nonDefault = t.fromGesture === "default" ? t.toGesture : t.fromGesture;
      if (nonDefault === "hands_open") {
        betweenImage = images.between_open || null;
      } else if (nonDefault === "hands_hips") {
        betweenImage = images.between_hips || null;
      }
      // Active gesture is still the "from" during transition
      activeGesture = t.fromGesture;
      return { activeGesture, isTransition, betweenImage };
    }

    // Past this transition — update active gesture
    activeGesture = t.toGesture;
  }

  return { activeGesture, isTransition: false, betweenImage: null };
}

/** Get the image path for a mouth key from the active gesture set */
function getGestureImage(
  mouthKey: MouthImage | "blink",
  activeGesture: string,
  images: CharacterImages,
): string | null {
  if (!images.gestures || !images.gestures[activeGesture]) {
    // No gestures — use flat images (backwards compat)
    if (mouthKey === "blink") return images.blink;
    return images[mouthKey];
  }
  const gestureSet = images.gestures[activeGesture];
  return gestureSet[mouthKey] || null;
}


/* ── Frame-based gesture schedule (body frames system) ────── */

type FrameGesture = "regular" | "open_hands" | "hands_behind_back";

interface FrameGestureEvent {
  frame: number;
  fromGesture: FrameGesture;
  toGesture: FrameGesture;
}

function generateFrameGestureSchedule(
  volumePerFrame: number[],
  config: FrameAnimationConfig,
): FrameGestureEvent[] {
  const rng = mulberry32(55);
  const schedule: FrameGestureEvent[] = [];
  const gestures: FrameGesture[] = ["open_hands", "hands_behind_back"];
  const fps = 30;
  const totalFrames = volumePerFrame.length;

  // Simple timed schedule: hold each pose 7-10 seconds, always go through regular
  // Flow: regular → gesture A → regular → gesture B → regular → ...
  let currentFrame = 0;
  let current: FrameGesture = "regular";

  while (currentFrame < totalFrames) {
    // Hold current pose for 7-10 seconds
    const holdSeconds = 3 + rng() * 2; // 3-5 seconds
    const holdFrames = Math.round(holdSeconds * fps);
    currentFrame += holdFrames;

    if (currentFrame >= totalFrames) break;

    // Determine next gesture
    let next: FrameGesture;
    if (current !== "regular") {
      // Must return to regular first
      next = "regular";
    } else {
      // Pick a random gesture (not the same as the last non-regular one)
      next = gestures[Math.floor(rng() * gestures.length)];
    }

    schedule.push({ frame: currentFrame, fromGesture: current, toGesture: next });

    // Add transition duration to current frame
    const transLen = getTransitionLength(current, next, config);
    currentFrame += transLen;

    current = next;
  }

  return schedule;
}

/** Get the body frame number to display at a given animation frame. */
function getBodyFrameAtFrame(
  frame: number,
  gestureSchedule: FrameGestureEvent[],
  config: FrameAnimationConfig,
): number {
  // Walk through schedule to find current state
  let currentGesture: FrameGesture = "regular";
  let transitionStartFrame = -1;
  let transitionFrom: FrameGesture = "regular";
  let transitionTo: FrameGesture = "regular";

  for (const event of gestureSchedule) {
    if (event.frame > frame) break;

    // Calculate transition length for this event
    const transLen = getTransitionLength(event.fromGesture, event.toGesture, config);
    if (frame >= event.frame && frame < event.frame + transLen) {
      // We're in a transition
      transitionStartFrame = event.frame;
      transitionFrom = event.fromGesture;
      transitionTo = event.toGesture;
      currentGesture = event.fromGesture; // still transitioning
      break;
    }
    // Past this event
    currentGesture = event.toGesture;
    transitionStartFrame = -1;
  }

  if (transitionStartFrame >= 0) {
    const progress = frame - transitionStartFrame;
    return getTransitionFrame(transitionFrom, transitionTo, progress, config);
  }

  return getHoldFrame(currentGesture, config);
}

function getTransitionLength(from: FrameGesture, to: FrameGesture, config: FrameAnimationConfig): number {
  if (from === "open_hands" || to === "open_hands") {
    const [start, end] = config.transitions.open_hands.frames;
    return end - start + 1;
  }
  if (from === "hands_behind_back" || to === "hands_behind_back") {
    const [start, end] = config.transitions.hands_behind_back.frames;
    return end - start + 1;
  }
  return 0;
}

function getHoldFrame(gesture: FrameGesture, config: FrameAnimationConfig): number {
  switch (gesture) {
    case "regular": return config.transitions.regular.hold_frame;
    case "open_hands": return config.transitions.open_hands.hold_frame;
    case "hands_behind_back": return config.transitions.hands_behind_back.hold_frame;
  }
}

function getTransitionFrame(
  from: FrameGesture,
  to: FrameGesture,
  progress: number,
  config: FrameAnimationConfig,
): number {
  let result: number;
  if (from === "regular" && to === "open_hands") {
    const [start, end] = config.transitions.open_hands.frames;
    // Play frames end,end-1,...,start+1,start (reverse)
    result = Math.max(start, end - progress);
  } else if (from === "open_hands" && to === "regular") {
    const [start, end] = config.transitions.open_hands.frames;
    // Play frames start,start+1,...,end-1,end (forward)
    result = Math.min(end, start + progress);
  } else if (from === "regular" && to === "hands_behind_back") {
    const [start, end] = config.transitions.hands_behind_back.frames;
    // Play frames start,start+1,...,end-1,end (forward)
    result = Math.min(end, start + progress);
  } else if (from === "hands_behind_back" && to === "regular") {
    const [start, end] = config.transitions.hands_behind_back.frames;
    // Play frames end,end-1,...,start+1,start (reverse)
    result = Math.max(start, end - progress);
  } else {
    result = getHoldFrame(from, config);
  }
  return result;
}


/* ── Frame-based Character component ──────────────────────── */

const FrameBasedCharacter: React.FC<{
  images: CharacterImages;
  volumePerFrame: number[];
  fps: number;
  durationInFrames: number;
  debug?: boolean;
}> = ({ images, volumePerFrame, fps, durationInFrames, debug }) => {
  const frame = useCurrentFrame();
  const bodyFrames = images.bodyFrames!;
  const config = bodyFrames.config;

  const blinkSchedule = React.useMemo(
    () => generateBlinkSchedule(durationInFrames, fps),
    [durationInFrames, fps]
  );

  const poseSchedule = React.useMemo(
    () => generatePoseSchedule(durationInFrames, fps),
    [durationInFrames, fps]
  );

  const gestureSchedule = React.useMemo(
    () => generateFrameGestureSchedule(volumePerFrame, config),
    [volumePerFrame, config]
  );

  // Mouth (unchanged logic)
  const { mouthKey, isBlinking } = resolveMouthFromVolume(
    frame, volumePerFrame, blinkSchedule, images
  );

  // Body frame (fall back to regular hold frame if key missing)
  const bodyFrameNum = getBodyFrameAtFrame(frame, gestureSchedule, config);
  const bodyFrameKey = String(bodyFrameNum);
  const bodyFrameSrc = bodyFrames.frames[bodyFrameKey]
    || bodyFrames.frames[String(config.transitions.regular.hold_frame)];
  if (!bodyFrameSrc) return null;

  // Mouth position from config
  const mouthPos = config.mouth_positions[mouthKey];
  const mouthSrc = bodyFrames.mouthImages[mouthKey];

  // Blink
  const blinkPos = config.blink_position;
  const blinkSrc = bodyFrames.blinkImage;

  // Weight-shift idle
  const { angle: swayAngle, offsetX: swayX } = getPoseAtFrame(frame, poseSchedule);

  // Breathing: subtle scale pulse, ~4s cycle (same as legacy)
  const breathScale =
    1 + 0.015 * 0.5 * (1 + Math.sin((2 * Math.PI * frame) / (fps * 4) - Math.PI / 2));

  const characterTransform = [
    `rotate(${swayAngle.toFixed(3)}deg)`,
    `translateX(${swayX.toFixed(2)}px)`,
    `scale(${breathScale.toFixed(4)})`,
  ].join(" ");

  // Body frame native size — scale inner div from image coords to container
  // Images are 2048x2048, container is 70% of 1080px video width = 756px
  const IMAGE_SIZE = 2048;
  const containerWidth = 1080 * 0.98; // 98% of 1080p width = 1058px
  const scaleFactor = containerWidth / IMAGE_SIZE;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "-12%",
        left: "-10%",
        width: "98%",
        zIndex: 20,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          transform: characterTransform,
          transformOrigin: "bottom center",
        }}
      >
        {/* Inner div at native image pixel size, scaled down to fit */}
        <div
          style={{
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            position: "relative",
            transform: `scale(${scaleFactor})`,
            transformOrigin: "bottom center",
          }}
        >
          {/* Layer 1: Body frame */}
          <Img
            src={resolveAsset(bodyFrameSrc)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              ...(debug ? { border: "3px solid lime" } : {}),
            }}
          />

          {/* Layer 2: Mouth overlay */}
          {mouthSrc && mouthPos && (
            <Img
              src={resolveAsset(mouthSrc)}
              style={{
                position: "absolute",
                left: mouthPos.x,
                top: mouthPos.y,
                ...(mouthPos.scale || mouthPos.rotation
                  ? {
                      transform: [
                        mouthPos.scale && mouthPos.scale !== 1 ? `scale(${mouthPos.scale})` : "",
                        mouthPos.rotation ? `rotate(${mouthPos.rotation}deg)` : "",
                      ].filter(Boolean).join(" "),
                      transformOrigin: "top left",
                    }
                  : {}),
                ...(debug ? { border: "3px solid red" } : {}),
              }}
            />
          )}

          {/* Layer 3: Blink overlay (independent from mouth) */}
          {isBlinking && blinkSrc && (
            <Img
              src={resolveAsset(blinkSrc)}
              style={{
                position: "absolute",
                left: blinkPos.x,
                top: blinkPos.y,
                ...(blinkPos.scale || blinkPos.rotation
                  ? {
                      transform: [
                        blinkPos.scale && blinkPos.scale !== 1 ? `scale(${blinkPos.scale})` : "",
                        blinkPos.rotation ? `rotate(${blinkPos.rotation}deg)` : "",
                      ].filter(Boolean).join(" "),
                      transformOrigin: "top left",
                    }
                  : {}),
                ...(debug ? { border: "3px solid blue" } : {}),
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};


/* ── Legacy Character component (full-image swap) ─────────── */

const Character: React.FC<{
  images: CharacterImages;
  volumePerFrame: number[];
  fps: number;
  durationInFrames: number;
  debug?: boolean;
}> = ({ images, volumePerFrame, fps, durationInFrames, debug }) => {
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  // If body frames exist, use the new frame-based system
  if (images.bodyFrames) {
    return (
      <FrameBasedCharacter
        images={images}
        volumePerFrame={volumePerFrame}
        fps={fps}
        durationInFrames={durationInFrames}
        debug={debug}
      />
    );
  }

  const blinkSchedule = React.useMemo(
    () => generateBlinkSchedule(durationInFrames, fps),
    [durationInFrames, fps]
  );

  const poseSchedule = React.useMemo(
    () => generatePoseSchedule(durationInFrames, fps),
    [durationInFrames, fps]
  );

  const gestureSchedule = React.useMemo(
    () =>
      images.gestures
        ? generateGestureSchedule(volumePerFrame, images.gestures)
        : [],
    [volumePerFrame, images.gestures]
  );

  const { mouthKey, isBlinking } = resolveMouthFromVolume(
    frame, volumePerFrame, blinkSchedule, images
  );

  // Determine gesture state
  const gestureState = getGestureAtFrame(frame, gestureSchedule, images);

  let imageSrc: string | null;
  if (gestureState.isTransition && gestureState.betweenImage) {
    // During transition frames, show the between image
    imageSrc = gestureState.betweenImage;
  } else if (images.gestures) {
    // Use the active gesture's image set
    const displayKey = isBlinking ? "blink" : mouthKey;
    imageSrc = getGestureImage(displayKey, gestureState.activeGesture, images);
  } else {
    // Backwards compat: flat images, no gestures
    imageSrc = isBlinking ? images.blink : images[mouthKey];
  }
  if (!imageSrc) return null;

  // ── Weight-shift idle: random poses with smooth easing ──

  const { angle: swayAngle, offsetX: swayX } = getPoseAtFrame(frame, poseSchedule);

  const characterTransform = [
    `rotate(${swayAngle.toFixed(3)}deg)`,
    `translateX(${swayX.toFixed(2)}px)`,
  ].join(" ");

  return (
    <>
      <div
        style={{
          position: "absolute",
          bottom: "-12%",
          left: "5%",
          width: "90%",
          zIndex: 20,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1 / 1",
            transform: characterTransform,
            transformOrigin: "bottom center",
          }}
        >
          <Img
            src={resolveAsset(imageSrc)}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "bottom center",
            }}
          />
        </div>
      </div>

    </>
  );
};

/* ── Motion graphics active check ─────────────────────────── */

function isMotionGraphicsActive(
  frame: number,
  segments: VideoProps["visualSegments"],
  fps: number,
): boolean {
  if (!segments || segments.length === 0) return false;
  for (const seg of segments) {
    if (seg.visual_type === "pexels_clip" || seg.visual_type === "ai_image") continue;
    const startFrame = Math.round(seg.startSec * fps);
    const endFrame = Math.round(seg.endSec * fps);
    if (frame >= startFrame && frame < endFrame) return true;
  }
  return false;
}

/* ── Scene transition helpers (ai-story) ──────────────────── */

/** Transition frame counts by style */
const TRANSITION_FRAMES: Record<SceneTransitionStyle, number> = {
  fade: 6,
  dissolve: 12,
  smooth: 18,
  zoom: 10,
  slide: 10,
  snap: 0,
  none: 0,
};

/** Enhanced ImageBackground with configurable transitions for ai-story */
const StoryImageBackground: React.FC<{
  paths: string[];
  durationInFrames: number;
  transitionStyle: SceneTransitionStyle;
  imageDurations?: number[];
}> = ({ paths, durationInFrames, transitionStyle, imageDurations }) => {
  console.log("[StoryImageBackground] paths:", paths.length, "imageDurations:", imageDurations?.length, "match:", imageDurations?.length === paths.length);
  const frame = useCurrentFrame();
  if (paths.length === 0) return null;
  const tf = TRANSITION_FRAMES[transitionStyle] || 0;

  // Build per-image frame ranges from imageDurations or equal distribution
  let imageRanges: { start: number; end: number }[];
  if (imageDurations && imageDurations.length === paths.length) {
    let cumulative = 0;
    imageRanges = imageDurations.map((dur) => {
      const start = cumulative;
      cumulative += dur;
      return { start, end: cumulative };
    });
  } else {
    const framesPerSlide = Math.floor(durationInFrames / paths.length);
    imageRanges = paths.map((_, i) => ({
      start: i * framesPerSlide,
      end: i === paths.length - 1 ? durationInFrames : (i + 1) * framesPerSlide,
    }));
  }

  return (
    <AbsoluteFill>
      {paths.map((imgPath, i) => {
        const slideStart = imageRanges[i].start;
        const slideEnd = imageRanges[i].end;

        const extendedStart = Math.max(0, slideStart - tf);
        const extendedEnd = Math.min(durationInFrames, slideEnd + tf);
        if (frame < extendedStart || frame > extendedEnd) return null;

        // Ken Burns
        const direction = KB_DIRECTIONS[i % KB_DIRECTIONS.length];
        const progress = interpolate(frame, [slideStart, slideEnd], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const kbStyle = getKenBurnsStyle(direction, progress);

        // Snap / none: hard cut, no transition
        if (transitionStyle === "snap" || transitionStyle === "none") {
          if (frame < slideStart || frame >= slideEnd) return null;
          return (
            <AbsoluteFill key={i} style={{ overflow: "hidden" }}>
              <Img
                src={resolveAsset(imgPath)}
                style={{ width: "100%", height: "100%", objectFit: "cover", ...kbStyle }}
              />
            </AbsoluteFill>
          );
        }

        // Slide transition
        if (transitionStyle === "slide") {
          let translateX = 0;
          let opacity = 1;
          // Incoming: slide from right
          if (i > 0 && frame < slideStart + tf) {
            translateX = interpolate(frame, [slideStart, slideStart + tf], [100, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
          }
          // Outgoing: slide to left
          if (i < paths.length - 1 && frame > slideEnd - tf) {
            translateX = interpolate(frame, [slideEnd - tf, slideEnd], [0, -100], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            opacity = 1;
          }
          return (
            <AbsoluteFill
              key={i}
              style={{
                overflow: "hidden",
                transform: `translateX(${translateX}%)`,
                opacity,
              }}
            >
              <Img
                src={resolveAsset(imgPath)}
                style={{ width: "100%", height: "100%", objectFit: "cover", ...kbStyle }}
              />
            </AbsoluteFill>
          );
        }

        // Zoom transition: outgoing zooms in + fades, incoming starts zoomed + settles
        if (transitionStyle === "zoom") {
          let opacity = 1;
          let extraScale = 1;
          if (i > 0 && frame < slideStart + tf) {
            const t = interpolate(frame, [slideStart, slideStart + tf], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            opacity = t;
            extraScale = 1.15 - 0.15 * t; // start 1.15x, settle to 1x
          }
          if (i < paths.length - 1 && frame > slideEnd - tf) {
            const t = interpolate(frame, [slideEnd - tf, slideEnd], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            opacity = 1 - t;
            extraScale = 1 + 0.2 * t; // zoom in as it fades
          }
          return (
            <AbsoluteFill key={i} style={{ opacity, overflow: "hidden" }}>
              <Img
                src={resolveAsset(imgPath)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `${kbStyle.transform || ""} scale(${extraScale})`.trim(),
                }}
              />
            </AbsoluteFill>
          );
        }

        // Fade / dissolve / smooth: opacity crossfade with varying frame count
        let opacity = 1;
        if (i > 0 && frame < slideStart + tf) {
          opacity = interpolate(frame, [slideStart, slideStart + tf], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        }
        if (i < paths.length - 1 && frame > slideEnd - tf) {
          opacity = interpolate(frame, [slideEnd - tf, slideEnd], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        }

        return (
          <AbsoluteFill key={i} style={{ opacity, overflow: "hidden" }}>
            <Img
              src={resolveAsset(imgPath)}
              style={{ width: "100%", height: "100%", objectFit: "cover", ...kbStyle }}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};


/* ── Hook text overlay (ai-story) ────────────────────────────── */

const HOOK_DURATION_FRAMES = 75; // ~2.5s at 30fps
const HOOK_FADE_IN = 15;
const HOOK_FADE_OUT = 10;

const HookTextOverlay: React.FC<{ text: string; fps: number }> = ({ text, fps }) => {
  const frame = useCurrentFrame();
  if (frame >= HOOK_DURATION_FRAMES) return null;

  const scaleSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 120, mass: 0.5 },
    durationInFrames: HOOK_FADE_IN,
  });
  const scale = interpolate(scaleSpring, [0, 1], [0.8, 1]);

  const fadeIn = interpolate(frame, [0, HOOK_FADE_IN], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [HOOK_DURATION_FRAMES - HOOK_FADE_OUT, HOOK_DURATION_FRAMES],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "30%",
        zIndex: 5,
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          maxWidth: "80%",
          textAlign: "center",
          fontSize: 64,
          fontFamily: "Impact, Arial Black, sans-serif",
          fontWeight: 900,
          textTransform: "uppercase" as const,
          color: "#fff",
          WebkitTextStroke: "2px rgba(0,0,0,0.8)",
          textShadow: "0 4px 20px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.9)",
          lineHeight: 1.15,
          letterSpacing: "1px",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};


/* ── Film grain overlay ──────────────────────────────────────── */

/* Tiny 100x100 noise tile (base64 PNG, ~180 bytes) regenerated via CSS offset per frame */
const NOISE_TILE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E" +
  "%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' " +
  "stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' " +
  "opacity='1'/%3E%3C/svg%3E";

const FilmGrain: React.FC = () => {
  const frame = useCurrentFrame();
  // Shift background position each frame for animated grain
  const offsetX = (frame * 37) % 200;
  const offsetY = (frame * 53) % 200;

  return (
    <AbsoluteFill style={{ zIndex: 25, pointerEvents: "none" }}>
      {/* Noise layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${NOISE_TILE}")`,
          backgroundSize: "200px 200px",
          backgroundPosition: `${offsetX}px ${offsetY}px`,
          opacity: 0.1,
          mixBlendMode: "overlay",
        }}
      />
      {/* Subtle scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)",
          opacity: 0.5,
        }}
      />
    </AbsoluteFill>
  );
};


/* ── Shake effect helper ─────────────────────────────────────── */

function getShakeOffset(frame: number): { x: number; y: number } {
  return {
    x: Math.sin(frame * 0.7) * 3,
    y: Math.cos(frame * 1.1) * 3,
  };
}


/* ── Background music ─────────────────────────────────────── */

const BackgroundMusic: React.FC<{
  musicId: string;
  musicUrl?: string;
  durationInFrames: number;
}> = ({ musicId, musicUrl, durationInFrames }) => {
  const frame = useCurrentFrame();

  // Resolve audio source: prefer explicit R2 URL, fall back to local file lookup
  let src: string | null = null;
  if (musicUrl && (musicUrl.startsWith('http://') || musicUrl.startsWith('https://'))) {
    src = musicUrl;
  } else {
    const filename = musicId.endsWith('.mp3') ? musicId : MUSIC_FILES[musicId];
    if (filename) src = staticFile(`music/${filename}`);
  }
  if (!src) return null;

  // Fade in over first 1s, fade out over last 2s
  const fadeIn = interpolate(frame, [0, MUSIC_FADE_IN_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - MUSIC_FADE_OUT_FRAMES, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const volume = MUSIC_VOLUME * fadeIn * fadeOut;

  // Use Loop to repeat the track if the video is longer than the music file.
  // durationInFrames for Loop = total video length; Remotion loops the child audio.
  return (
    <Loop durationInFrames={durationInFrames}>
      <Audio src={src} volume={volume} />
    </Loop>
  );
};

/* ── Main composition ──────────────────────────────────────── */

export const Video: React.FC<VideoProps> = ({
  audioPath,
  backgroundPaths,
  backgroundType,
  characterImages,
  captions,
  isFreeTier,
  volumePerFrame,
  visualSegments,
  showCaptions = true,
  captionStyle = "regular",
  captionFontSize = "Medium",
  captionTextTransform = "Normal",
  captionPosition = "bottom",
  debug,
  durationInFrames,
  fps,
  style,
  hookText,
  filmGrain,
  shakeEffect,
  transitionStyle = "fade",
  music,
  musicUrl,
  imageDurations,
}) => {
  const frame = useCurrentFrame();

  const isAiStory = style === "ai-story";
  const hasCharacter = !isAiStory &&
    (characterImages?.bodyFrames || characterImages?.closed || characterImages?.gestures?.default?.closed);

  // Per-segment caption toggling: hide during motion graphics, show during pexels/ai_image
  const mgActive = isMotionGraphicsActive(frame, visualSegments, fps);
  const captionsEnabled = showCaptions !== false && !mgActive;

  // Shake offset (applied to background layer only)
  const shake = shakeEffect ? getShakeOffset(frame) : { x: 0, y: 0 };
  const shakeTransform = shakeEffect
    ? `translate(${shake.x.toFixed(1)}px, ${shake.y.toFixed(1)}px)`
    : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Background layer (with optional shake) */}
      <AbsoluteFill style={shakeTransform ? { transform: shakeTransform } : undefined}>
        {backgroundPaths.length > 0 ? (
          backgroundType === "video" ? (
            <VideoBackground paths={backgroundPaths} durationInFrames={durationInFrames} fps={fps} />
          ) : isAiStory ? (
            <StoryImageBackground
              paths={backgroundPaths}
              durationInFrames={durationInFrames}
              transitionStyle={transitionStyle}
              imageDurations={imageDurations}
            />
          ) : (
            <ImageBackground paths={backgroundPaths} durationInFrames={durationInFrames} />
          )
        ) : (
          <AbsoluteFill
            style={{
              background: "linear-gradient(180deg, #16213e 0%, #0f3460 40%, #1a1a2e 100%)",
            }}
          />
        )}
      </AbsoluteFill>

      {/* Motion graphics layer */}
      {visualSegments && visualSegments.length > 0 && (
        <MotionGraphicsLayer segments={visualSegments} fps={fps} />
      )}

      {/* Hook text overlay (ai-story only, first ~2.5s) */}
      {isAiStory && hookText && <HookTextOverlay text={hookText} fps={fps} />}

      {/* Character overlay (skipped for ai-story) */}
      {hasCharacter && (
        <Character
          images={characterImages}
          volumePerFrame={volumePerFrame || []}
          fps={fps}
          durationInFrames={durationInFrames}
          debug={debug}
        />
      )}

      {/* Captions overlay — disabled entirely for motion graphics mode */}
      {captionsEnabled && captions && captions.length > 0 && (
        <Captions
          captions={captions}
          captionStyle={captionStyle}
          captionFontSize={captionFontSize}
          captionTextTransform={captionTextTransform}
          captionPosition={captionPosition}
        />
      )}

      {/* Film grain overlay */}
      {filmGrain && <FilmGrain />}

      {/* Background music (layered under TTS voice) */}
      {music && <BackgroundMusic musicId={music} musicUrl={musicUrl} durationInFrames={durationInFrames} />}

      {/* TTS voice audio track */}
      {audioPath && <Audio src={resolveAsset(audioPath)} />}

      {/* Free tier watermark */}
      {isFreeTier && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            fontSize: 14,
            color: "rgba(255, 255, 255, 0.3)",
            fontWeight: 600,
            zIndex: 30,
          }}
        >
          ContentCreator Free
        </div>
      )}
    </AbsoluteFill>
  );
};
