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
  /** Language this voice speaks (e.g. "English", "Chinese"). Defaults to English if absent. */
  language?: string;
}

/** Default Fish Audio voice ID used when none is selected */
export const defaultVoice: Voice = {
  name: "Ethan",
  fishAudioId: "536d3a5e000945adb7038665781a4aca",
  gender: "male",
  tags: ["Educational", "Narration", "Professional"],
};
