import type React from "react";

/**
 * Shared option arrays for the Create flows, COPIED (not moved) here so the
 * Preferences page can render the same choices the setup flows offer. The
 * original array definitions still live in each setup file unchanged — this is
 * a deliberate duplication so Preferences never destabilises those files.
 *
 * IMPORTANT: Character uses an 11-tone set; AI Story / Argument / Skeleton share
 * a separate 12-tone set. They are kept as two distinct lists, never merged.
 */

// ── Tones (TWO distinct sets) ──
export const TONES_CHARACTER = [
  { label: "Regular", emoji: "🙂" },
  { label: "Funny", emoji: "😄" },
  { label: "Serious", emoji: "🎯" },
  { label: "Cursing", emoji: "🤬" },
  { label: "Edgy", emoji: "🔥" },
  { label: "Motivational", emoji: "💪" },
  { label: "Storytelling", emoji: "📖" },
  { label: "Sarcastic", emoji: "🙄" },
  { label: "Shocked", emoji: "🤯" },
  { label: "Conspiracy", emoji: "🕵️" },
  { label: "Friendly", emoji: "☕" },
] as const;

export const TONES_STORY = [
  { label: "Regular", id: "Regular" },
  { label: "Storytelling", id: "Storytelling" },
  { label: "Dramatic", id: "Dramatic" },
  { label: "Horror", id: "Horror" },
  { label: "Funny", id: "Funny" },
  { label: "Cursing", id: "Cursing" },
  { label: "Sarcastic", id: "Sarcastic" },
  { label: "Motivational", id: "Motivational" },
  { label: "Mysterious", id: "Mysterious" },
  { label: "Wholesome", id: "Wholesome" },
  { label: "Dark", id: "Dark" },
  { label: "Epic", id: "Epic" },
] as const;

// ── Background modes (Character only) ──
export const BACKGROUND_MODES = [
  { label: "Smart Mix", emoji: "✨", desc: "AI picks the best visuals for each moment" },
  { label: "Stock Footage", emoji: "📹", desc: "Real video clips from Pexels" },
  { label: "AI Images", emoji: "🎨", desc: "Custom AI-generated images" },
  { label: "Animated AI", emoji: "🎬", desc: "AI images with motion" },
  { label: "Motion Graphics", emoji: "✨", desc: "Animated data visualizations and graphics" },
  { label: "Green Screen", emoji: "🟢", desc: "Solid green background for chroma key removal" },
] as const;

// ── Caption styles (10, identical across all formats) ──
export interface CaptionStyleDef {
  id: string;
  label: string;
  baseStyle: React.CSSProperties;
  activeStyle: React.CSSProperties;
  containerStyle?: React.CSSProperties;
}

export const CAPTION_STYLES: CaptionStyleDef[] = [
  { id: "regular", label: "Regular", baseStyle: { color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: "'Arial Black', Arial, sans-serif", textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000" }, activeStyle: { color: "#FFD700" } },
  { id: "bold_stroke", label: "Bold Stroke", baseStyle: { color: "#fff", fontWeight: 900, fontSize: 16, fontFamily: "Impact, sans-serif", WebkitTextStroke: "2px #000", paintOrder: "stroke fill" }, activeStyle: { transform: "scale(1.1)", display: "inline-block" } },
  { id: "red_highlight", label: "Red Highlight", baseStyle: { color: "#fff", fontWeight: 900, fontSize: 16, fontFamily: "Impact, sans-serif", textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000" }, activeStyle: { color: "#FF3333" } },
  { id: "sleek", label: "Sleek", baseStyle: { color: "#fff", fontWeight: 300, fontSize: 15, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", textShadow: "0 0 10px rgba(255,255,255,0.5)" }, activeStyle: { textShadow: "0 0 16px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.6)" } },
  { id: "karaoke", label: "Karaoke", baseStyle: { color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: "'Arial Black', Arial, sans-serif", textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }, activeStyle: { background: "#7C3AED", borderRadius: 6, padding: "2px 6px" } },
  { id: "majestic", label: "Majestic", baseStyle: { color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "Georgia, serif", fontStyle: "italic", textShadow: "0 2px 8px rgba(180,140,60,0.5)" }, activeStyle: { textShadow: "0 2px 12px rgba(180,140,60,0.8)" } },
  { id: "beast", label: "Beast", baseStyle: { color: "#fff", fontWeight: 900, fontSize: 19, fontFamily: "Impact, sans-serif", WebkitTextStroke: "3.5px #000", paintOrder: "stroke fill" }, activeStyle: { transform: "scale(1.1)", display: "inline-block" }, containerStyle: { transform: "rotate(-2deg)" } },
  { id: "elegant", label: "Elegant", baseStyle: { color: "#CCCCCC", fontWeight: 400, fontSize: 15, fontFamily: "Georgia, serif", letterSpacing: 3 }, activeStyle: { color: "#fff" } },
  { id: "pixel", label: "Pixel", baseStyle: { color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "'Courier New', Courier, monospace", textShadow: "2px 0 0 #000, -2px 0 0 #000, 0 2px 0 #000, 0 -2px 0 #000" }, activeStyle: { color: "#fff" } },
  { id: "clarity", label: "Clarity", baseStyle: { color: "#fff", fontWeight: 400, fontSize: 15, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", textTransform: "lowercase", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }, activeStyle: {} },
];

// ── Caption sub-options (identical across formats) ──
export const CAPTION_SIZES = ["small", "medium", "large"] as const;
export const CAPTION_TRANSFORMS = [
  { id: "normal", label: "Normal" },
  { id: "uppercase", label: "UPPERCASE" },
  { id: "capitalize", label: "Capitalize" },
  { id: "lowercase", label: "lowercase" },
] as const;
export const CAPTION_POSITIONS = [
  { id: "top", label: "Top" },
  { id: "middle", label: "Middle" },
  { id: "bottom", label: "Bottom" },
] as const;

// ── Music tracks (9, identical across formats) ──
export const MUSIC_TRACKS = [
  { id: "happy", name: "Happy rhythm" },
  { id: "tension", name: "Quiet before storm" },
  { id: "symphony", name: "Brilliant symphony" },
  { id: "shadows", name: "Breathing shadows" },
  { id: "bass", name: "Deep bass" },
  { id: "drums", name: "Cinematic drums" },
  { id: "lofi", name: "Lo-fi chill" },
  { id: "piano", name: "Suspense piano" },
  { id: "motivational", name: "Motivational rise" },
] as const;

// ── Languages (9; not applied to Argument) ──
export const VIDEO_LANGUAGES = [
  "Auto Detect", "English", "Chinese", "Japanese", "German", "French",
  "Spanish", "Korean", "Portuguese",
] as const;

// ── Characters (Character flow, 14) ──
export const CHARACTERS = [
  { name: "Doctor", image: "/characters/doctor.png", color: "from-blue-400 to-cyan-300" },
  { name: "Professor", image: "/characters/Proffesor.png", color: "from-amber-400 to-yellow-300" },
  { name: "Chef", image: "/characters/chef.png", color: "from-orange-400 to-red-300" },
  { name: "Cowboy", image: "/characters/cowboy.png", color: "from-yellow-600 to-amber-400" },
  { name: "Robot", image: "/characters/Robot.png", color: "from-zinc-400 to-slate-300" },
  { name: "Vampire", image: "/characters/Vempaire.png", color: "from-purple-600 to-violet-400" },
  { name: "Wizard", image: "/characters/Wizard.png", color: "from-indigo-500 to-blue-400" },
  { name: "Finance Bro", image: "/characters/Finance men.png", color: "from-emerald-500 to-green-400" },
  { name: "Alien", image: "/characters/Alion.png", color: "from-lime-400 to-green-300" },
  { name: "Gamer", image: "/characters/Gamer.png", color: "from-pink-500 to-purple-400" },
  { name: "Chef Women", image: "/characters/cheff_women.png", color: "from-rose-400 to-pink-300" },
  { name: "Fitness Men", image: "/characters/fitness_men.png", color: "from-red-500 to-orange-400" },
  { name: "Fitness Women", image: "/characters/fitness_women.png", color: "from-teal-400 to-cyan-300" },
  { name: "Teacher", image: "/characters/teacher.png", color: "from-sky-400 to-blue-300" },
] as const;

// ── AI Story topic presets (28) ──
export const TOPIC_PRESETS = [
  { id: "scary_stories", label: "Scary Stories" },
  { id: "true_crime", label: "True Crime" },
  { id: "greek_mythology", label: "Greek Mythology" },
  { id: "conspiracy_theories", label: "Conspiracy Theories" },
  { id: "unsolved_mysteries", label: "Unsolved Mysteries" },
  { id: "interesting_history", label: "Interesting History" },
  { id: "scary_history", label: "Scary History" },
  { id: "bible_stories", label: "Bible Stories" },
  { id: "urban_legends", label: "Urban Legends" },
  { id: "psychology_facts", label: "Psychology Facts" },
  { id: "relationship_psychology", label: "Relationship Psychology" },
  { id: "stoic_philosophy", label: "Stoic Philosophy" },
  { id: "philosophy", label: "Philosophy" },
  { id: "space_universe", label: "Space / Universe" },
  { id: "animal_facts", label: "Animal Facts" },
  { id: "travel_destinations", label: "Travel Destinations" },
  { id: "what_if", label: "What If?" },
  { id: "bedtime_stories", label: "Bedtime Stories" },
  { id: "motivational", label: "Motivational" },
  { id: "fun_facts", label: "Fun Facts" },
  { id: "money_finance", label: "Money / Finance" },
  { id: "survival_tips", label: "Survival Tips" },
  { id: "long_form_jokes", label: "Long Form Jokes" },
  { id: "life_pro_tips", label: "Life Pro Tips" },
  { id: "eli5", label: "ELI5" },
  { id: "famous_last_words", label: "Famous Last Words" },
  { id: "glitches_in_the_matrix", label: "Glitches in the Matrix" },
  { id: "banned_forbidden", label: "Banned / Forbidden Things" },
] as const;

// ── Skeleton colors (3) ──
export const SKELETON_COLORS = [
  { id: "cool", label: "Cool", thumbnail: "/skeleton-styles/skeleton_cool.png" },
  { id: "warm", label: "Warm", thumbnail: "/skeleton-styles/skeleton_warm.png" },
  { id: "red", label: "Red", thumbnail: "/skeleton-styles/skeleton_red.png" },
] as const;

// ── Durations (per format — different sets) ──
export const DURATIONS_CHARACTER = ["15s", "30s", "60s", "90s"] as const;
export const DURATIONS_STORY = [30, 60, 90, 120] as const;
export const DURATIONS_ARGUMENT = [30, 45, 60, 90] as const;
export const DURATIONS_SKELETON = [30, 60, 90, 120] as const;

/**
 * The CURRENT hardcoded initial values each Create flow uses today. Preferences
 * pre-fills controls with the saved value, or these when the saved value is null.
 * Mirrors the inline useState defaults in the setup files (kept in sync manually).
 */
export const CREATE_DEFAULTS = {
  global: {
    captionStyle: "regular",
    captionFontSize: "medium",
    captionTransform: "uppercase",
    captionPosition: "bottom",
    filmGrain: false,
    shakeEffect: false,
    language: "Auto Detect",
  },
  character: {
    niche: "", // empty by default — user sets their own niche (Preferences / first-use prompt)
    character: "Doctor",
    speed: 1.0,
    backgroundMode: "Smart Mix",
    artStyle: "realism",
    tone: "Funny",
    duration: "30s",
    music: null as string | null, // none by default
  },
  story: {
    topicPreset: null as string | null,
    artStyle: "anime",
    sceneMode: "static",
    tone: "Regular",
    duration: 30,
    music: "shadows",
  },
  argument: {
    characterA: "big_dave",
    characterB: "baby",
    tone: "Regular",
    duration: 45,
    music: "shadows",
  },
  skeleton: {
    color: "red",
    tone: "Regular",
    duration: 30,
    music: "tension",
  },
} as const;

/** Serializable shape of the saved preferences (all nullable). */
export interface UserPrefs {
  captionStyle: string | null;
  captionFontSize: string | null;
  captionTransform: string | null;
  captionPosition: string | null;
  music: string | null;
  filmGrain: boolean | null;
  shakeEffect: boolean | null;
  language: string | null;
  characterNiche: string | null;
  characterName: string | null;
  characterVoiceId: string | null;
  characterSpeed: number | null;
  characterBackgroundMode: string | null;
  characterArtStyle: string | null;
  characterTone: string | null;
  characterDuration: string | null;
  storyTopicPreset: string | null;
  storyArtStyle: string | null;
  storySceneMode: string | null;
  storyTone: string | null;
  storyVoiceId: string | null;
  storyDuration: number | null;
  argumentCharacterA: string | null;
  argumentCharacterB: string | null;
  argumentTone: string | null;
  argumentDuration: number | null;
  skeletonColor: string | null;
  skeletonVoiceId: string | null;
  skeletonTone: string | null;
  skeletonDuration: number | null;
}

/** The pref columns to select from the DB (keeps DateTime/id/userId out). */
export const PREF_FIELDS = [
  "captionStyle", "captionFontSize", "captionTransform", "captionPosition",
  "music", "filmGrain", "shakeEffect", "language",
  "characterNiche", "characterName", "characterVoiceId", "characterSpeed",
  "characterBackgroundMode", "characterArtStyle", "characterTone", "characterDuration",
  "storyTopicPreset", "storyArtStyle", "storySceneMode", "storyTone", "storyVoiceId", "storyDuration",
  "argumentCharacterA", "argumentCharacterB", "argumentTone", "argumentDuration",
  "skeletonColor", "skeletonVoiceId", "skeletonTone", "skeletonDuration",
] as const;
