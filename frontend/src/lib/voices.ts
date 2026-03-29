/**
 * Voice configuration — independent from characters.
 *
 * Characters are visual only (body frames, mouth PNGs).
 * Voices are audio only (Fish Audio TTS).
 *
 * To add a new voice:
 *   1. Get the Fish Audio voice/reference ID from https://fish.audio
 *   2. Add an entry below with name, id, emoji, and optional preview URL
 *   3. The voice will appear in the Voice settings pill on the editor page
 */

export interface Voice {
  /** Display name shown in the pill */
  name: string;
  /** Fish Audio voice/reference ID */
  fishAudioId: string;
  /** Emoji for the pill button */
  emoji: string;
  /** Optional: URL to a short audio preview */
  previewUrl?: string;
}

export const voices: Voice[] = [
  // ── Test voices (real Fish Audio IDs) ──
  {
    name: "Geography Guy",
    fishAudioId: "728f6ff2240d49308e8137ffe66008e2",
    emoji: "\u{1F30D}",
  },
  {
    name: "Sports Bro",
    fishAudioId: "c203ca8e441c4e8e80562be2eef75a10",
    emoji: "\u{1F3C8}",
  },

  // ── Placeholder voices (Tom will provide real IDs) ──
  // {
  //   name: "Deep Narrator",
  //   fishAudioId: "TODO",
  //   emoji: "\u{1F399}\uFE0F",
  // },
  // {
  //   name: "Energetic Host",
  //   fishAudioId: "TODO",
  //   emoji: "\u{26A1}",
  // },
  // {
  //   name: "Calm Teacher",
  //   fishAudioId: "TODO",
  //   emoji: "\u{1F4DA}",
  // },
];

/** Default voice used when none is selected */
export const defaultVoice = voices[0];

/** Look up a voice by display name, falling back to default */
export function getVoiceByName(name: string): Voice {
  return voices.find((v) => v.name === name) ?? defaultVoice;
}
