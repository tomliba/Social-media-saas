/**
 * Voice types.
 *
 * Voice data is fetched dynamically from /api/voices (which proxies Flask).
 * This file provides only the TypeScript interface and the default voice ID.
 */

export interface Voice {
  /** Display name shown in the picker */
  name: string;
  /** Fish Audio voice/reference ID */
  fishAudioId: string;
  /** Gender tag for filtering */
  gender: "male" | "female";
  /** Vibe/style tags for filtering */
  tags: string[];
  /** URL to a pre-recorded audio sample on R2 (instant playback, no API call) */
  sampleUrl?: string;
}

/** Default Fish Audio voice ID used when none is selected */
export const defaultVoice: Voice = {
  name: "Deep Male Voice",
  fishAudioId: "728f6ff2240d49308e8137ffe66008e2",
  gender: "male",
  tags: ["Deep"],
};
