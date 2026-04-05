"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VoicePickerModal from "@/components/create/VoicePickerModal";
import { triggerPrepareAssets } from "@/app/actions/prepare-assets";
import { defaultVoice } from "@/lib/voices";
import type { Voice } from "@/lib/voices";

// ── Topic presets (29 topics) ──

interface TopicPreset {
  id: string;
  label: string;
  badge?: string;
  defaultMusic?: string;
}

const topicPresets: TopicPreset[] = [
  { id: "scary_stories", label: "Scary Stories", defaultMusic: "shadows" },
  { id: "true_crime", label: "True Crime", defaultMusic: "piano" },
  { id: "greek_mythology", label: "Greek Mythology", defaultMusic: "symphony" },
  { id: "conspiracy_theories", label: "Conspiracy Theories", defaultMusic: "bass" },
  { id: "unsolved_mysteries", label: "Unsolved Mysteries", defaultMusic: "shadows" },
  { id: "interesting_history", label: "Interesting History", defaultMusic: "symphony" },
  { id: "scary_history", label: "Scary History", defaultMusic: "shadows" },
  { id: "bible_stories", label: "Bible Stories", badge: "New", defaultMusic: "symphony" },
  { id: "urban_legends", label: "Urban Legends", defaultMusic: "shadows" },
  { id: "psychology_facts", label: "Psychology Facts", defaultMusic: "tension" },
  { id: "relationship_psychology", label: "Relationship Psychology", defaultMusic: "tension" },
  { id: "stoic_philosophy", label: "Stoic Philosophy", defaultMusic: "symphony" },
  { id: "philosophy", label: "Philosophy", defaultMusic: "symphony" },
  { id: "space_universe", label: "Space / Universe", defaultMusic: "tension" },
  { id: "animal_facts", label: "Animal Facts", defaultMusic: "happy" },
  { id: "travel_destinations", label: "Travel Destinations", defaultMusic: "happy" },
  { id: "what_if", label: "What If?", defaultMusic: "tension" },
  { id: "bedtime_stories", label: "Bedtime Stories", defaultMusic: "tension" },
  { id: "motivational", label: "Motivational", defaultMusic: "motivational" },
  { id: "fun_facts", label: "Fun Facts", defaultMusic: "happy" },
  { id: "money_finance", label: "Money / Finance", defaultMusic: "happy" },
  { id: "survival_tips", label: "Survival Tips", defaultMusic: "bass" },
  { id: "long_form_jokes", label: "Long Form Jokes", defaultMusic: "happy" },
  { id: "life_pro_tips", label: "Life Pro Tips", defaultMusic: "happy" },
  { id: "eli5", label: "ELI5", defaultMusic: "lofi" },
  { id: "famous_last_words", label: "Famous Last Words", defaultMusic: "tension" },
  { id: "glitches_in_the_matrix", label: "Glitches in the Matrix", defaultMusic: "shadows" },
  { id: "banned_forbidden", label: "Banned / Forbidden Things", defaultMusic: "bass" },
];

// ── Art styles ──

interface ArtStyle {
  id: string;
  label: string;
  gradient: string;
}

const artStyles: ArtStyle[] = [
  { id: "anime", label: "Anime", gradient: "from-pink-500 to-violet-600" },
  { id: "ghibli", label: "Ghibli", gradient: "from-green-400 to-cyan-500" },
  { id: "pixel_art", label: "Pixel Art", gradient: "from-emerald-400 to-lime-500" },
  { id: "comic", label: "Comic", gradient: "from-yellow-400 to-orange-500" },
  { id: "lego", label: "Lego", gradient: "from-red-400 to-yellow-500" },
  { id: "dark_fantasy", label: "Dark Fantasy", gradient: "from-slate-700 to-purple-900" },
  { id: "watercolor", label: "Watercolor", gradient: "from-sky-300 to-rose-300" },
  { id: "3d_toon", label: "3D Toon", gradient: "from-blue-400 to-indigo-500" },
  { id: "film_noir", label: "Film Noir", gradient: "from-zinc-600 to-zinc-900" },
  { id: "painting", label: "Painting", gradient: "from-amber-500 to-rose-600" },
  { id: "minecraft", label: "Minecraft", gradient: "from-green-600 to-emerald-800" },
  { id: "realism", label: "Realism", gradient: "from-amber-600 to-stone-700" },
  { id: "charcoal", label: "Charcoal", gradient: "from-neutral-500 to-neutral-800" },
  { id: "cinematic", label: "Cinematic", gradient: "from-slate-800 to-amber-700" },
  { id: "creepy_comic", label: "Creepy Comic", gradient: "from-red-800 to-zinc-900" },
  { id: "disney", label: "Disney", gradient: "from-sky-400 to-pink-400" },
  { id: "mythology", label: "Mythology", gradient: "from-amber-500 to-stone-800" },
  { id: "polaroid", label: "Polaroid", gradient: "from-amber-200 to-stone-400" },
  { id: "gtav", label: "GTAV", gradient: "from-orange-500 to-sky-600" },
  { id: "expressionism", label: "Expressionism", gradient: "from-fuchsia-500 to-yellow-500" },
  { id: "childrens_book", label: "Children's Book", gradient: "from-yellow-300 to-pink-400" },
  { id: "adult_cartoon", label: "Adult Cartoon", gradient: "from-rose-500 to-orange-400" },
  { id: "bw_comic", label: "B&W Comic", gradient: "from-zinc-300 to-zinc-800" },
  { id: "whiteboard", label: "Whiteboard", gradient: "from-gray-100 to-gray-300" },
  { id: "low_poly", label: "Low Poly", gradient: "from-teal-400 to-blue-600" },
  { id: "modern_cartoon", label: "Modern Cartoon", gradient: "from-red-400 to-teal-400" },
  { id: "fantastic", label: "Fantastic", gradient: "from-cyan-500 to-blue-700" },
  { id: "pixar", label: "Pixar", gradient: "from-orange-300 to-red-400" },
  { id: "simpsons", label: "Simpsons", gradient: "from-yellow-400 to-orange-500" },
  { id: "90s_disney", label: "90s Disney", gradient: "from-fuchsia-400 to-purple-600" },
  { id: "historical_18th", label: "18th Century", gradient: "from-amber-300 to-amber-700" },
  { id: "comic_realism", label: "Comic Realism", gradient: "from-red-500 to-slate-800" },
  { id: "2d_hand_drawn", label: "2D Hand Drawn", gradient: "from-orange-200 to-amber-400" },
  { id: "creepy_toon", label: "Creepy Toon", gradient: "from-purple-900 to-slate-900" },
  { id: "dark_comic", label: "Dark Comic", gradient: "from-green-800 to-green-950" },
  { id: "cute_anime", label: "Cute Anime", gradient: "from-pink-300 to-pink-500" },
];

// Map art style IDs to preview image filenames (only where they differ)
const artPreviewFileOverrides: Record<string, string> = {
  pixel_art: "pixel",
  childrens_book: "childrens",
};

// IDs with no preview image at all — keep gradient fallback
const artPreviewMissing = new Set<string>([]);

function artPreviewSrc(id: string): string | null {
  if (artPreviewMissing.has(id)) return null;
  const filename = artPreviewFileOverrides[id] ?? id;
  return `/art_style_previews/${filename}.png`;
}

// ── Tones ──

const toneOptions = [
  { label: "Dramatic", id: "dramatic" },
  { label: "Funny", id: "funny" },
  { label: "Serious", id: "serious" },
  { label: "Mysterious", id: "mysterious" },
  { label: "Motivational", id: "motivational" },
  { label: "Sarcastic", id: "sarcastic" },
  { label: "Friendly", id: "friendly" },
  { label: "Horror", id: "horror" },
  { label: "Inspirational", id: "inspirational" },
  { label: "Dark", id: "dark" },
  { label: "Casual", id: "casual" },
  { label: "Cursing", id: "cursing" },
];

// ── Caption styles ──

interface CaptionStyleDef {
  id: string;
  label: string;
  baseStyle: React.CSSProperties;
  activeStyle: React.CSSProperties;
  containerStyle?: React.CSSProperties;
}

const captionStyles: CaptionStyleDef[] = [
  {
    id: "regular",
    label: "Regular",
    baseStyle: {
      color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: "'Arial Black', Arial, sans-serif",
      textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000",
    },
    activeStyle: { color: "#FFD700" },
  },
  {
    id: "bold_stroke",
    label: "Bold Stroke",
    baseStyle: {
      color: "#fff", fontWeight: 900, fontSize: 16, fontFamily: "Impact, sans-serif",
      WebkitTextStroke: "2px #000", paintOrder: "stroke fill" as const,
    },
    activeStyle: { transform: "scale(1.1)", display: "inline-block" },
  },
  {
    id: "red_highlight",
    label: "Red Highlight",
    baseStyle: {
      color: "#fff", fontWeight: 900, fontSize: 16, fontFamily: "Impact, sans-serif",
      textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000",
    },
    activeStyle: { color: "#FF3333" },
  },
  {
    id: "sleek",
    label: "Sleek",
    baseStyle: {
      color: "#fff", fontWeight: 300, fontSize: 15, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      textShadow: "0 0 10px rgba(255,255,255,0.5)",
    },
    activeStyle: { textShadow: "0 0 16px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.6)" },
  },
  {
    id: "karaoke",
    label: "Karaoke",
    baseStyle: {
      color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: "'Arial Black', Arial, sans-serif",
      textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
    },
    activeStyle: { background: "#7C3AED", borderRadius: 6, padding: "2px 6px" },
  },
  {
    id: "majestic",
    label: "Majestic",
    baseStyle: {
      color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "Georgia, serif", fontStyle: "italic",
      textShadow: "0 2px 8px rgba(180,140,60,0.5)",
    },
    activeStyle: { textShadow: "0 2px 12px rgba(180,140,60,0.8)" },
  },
  {
    id: "beast",
    label: "Beast",
    baseStyle: {
      color: "#fff", fontWeight: 900, fontSize: 19, fontFamily: "Impact, sans-serif",
      WebkitTextStroke: "3.5px #000", paintOrder: "stroke fill" as const,
    },
    activeStyle: { transform: "scale(1.1)", display: "inline-block" },
    containerStyle: { transform: "rotate(-2deg)" },
  },
  {
    id: "elegant",
    label: "Elegant",
    baseStyle: {
      color: "#CCCCCC", fontWeight: 400, fontSize: 15, fontFamily: "Georgia, serif",
      letterSpacing: 3,
    },
    activeStyle: { color: "#fff" },
  },
  {
    id: "pixel",
    label: "Pixel",
    baseStyle: {
      color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "'Courier New', Courier, monospace",
      textShadow: "2px 0 0 #000, -2px 0 0 #000, 0 2px 0 #000, 0 -2px 0 #000",
    },
    activeStyle: { color: "#fff" },
  },
  {
    id: "clarity",
    label: "Clarity",
    baseStyle: {
      color: "#fff", fontWeight: 400, fontSize: 15, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      textTransform: "lowercase" as const, textShadow: "0 1px 3px rgba(0,0,0,0.4)",
    },
    activeStyle: {},
  },
];

// ── Music tracks ──

interface MusicTrack {
  id: string;
  name: string;
  description: string;
  file: string;
  backendFile: string;
  gradient: string;
}

const musicTracks: MusicTrack[] = [
  { id: "happy", name: "Happy rhythm", description: "Upbeat and energetic, perfect for positive content", file: "Happy_rhythm.mp3", backendFile: "Happy rhythm.mp3", gradient: "from-orange-400 to-yellow-400" },
  { id: "tension", name: "Quiet before storm", description: "Building tension and anticipation", file: "Quiet_before_storm.mp3", backendFile: "Quiet before storm.mp3", gradient: "from-blue-500 to-purple-500" },
  { id: "symphony", name: "Brilliant symphony", description: "Orchestral and majestic for epic storytelling", file: "Brilliant_symphony.mp3", backendFile: "Brilliant symphony.mp3", gradient: "from-blue-400 to-blue-600" },
  { id: "shadows", name: "Breathing shadows", description: "Mysterious and eerie ambiance", file: "Breathing_shadows.mp3", backendFile: "Breathing shadows.mp3", gradient: "from-purple-800 to-violet-900" },
  { id: "bass", name: "Deep bass", description: "Dark interstellar atmosphere", file: "Deep_bass.mp3", backendFile: "Deep bass.mp3", gradient: "from-zinc-700 to-zinc-900" },
  { id: "drums", name: "Cinematic drums", description: "Intense percussion for dramatic content", file: "Cinematic_drums.mp3", backendFile: "Cinematic drums.mp3", gradient: "from-red-500 to-orange-600" },
  { id: "lofi", name: "Lo-fi chill", description: "Relaxed beats for casual content", file: "Lo-fi_chill.mp3", backendFile: "Lo-fi chill.mp3", gradient: "from-teal-400 to-cyan-500" },
  { id: "piano", name: "Suspense piano", description: "Sparse eerie piano for true crime and mystery", file: "piano.mp3", backendFile: "piano.mp3", gradient: "from-slate-500 to-slate-700" },
  { id: "motivational", name: "Motivational rise", description: "Inspiring buildup with strings", file: "Motivational_rise.mp3", backendFile: "Motivational rise.mp3", gradient: "from-amber-400 to-rose-500" },
];

// ── Video languages ──

const videoLanguages = [
  "Auto Detect", "English", "Spanish", "French", "German", "Italian",
  "Portuguese", "Polish", "Hindi", "Arabic", "Hebrew", "Chinese",
  "Japanese", "Korean", "Dutch", "Turkish", "Swedish", "Indonesian", "Filipino",
];

// ── Duration options ──

const durations = [
  { label: "30 seconds", value: 30 },
  { label: "60 seconds", value: 60 },
  { label: "90 seconds", value: 90 },
];

// ── Speed ──

// ── Step pills ──

function StepPills({ current }: { current: number }) {
  const steps = ["Setup", "Script"];
  return (
    <div className="flex gap-2 mb-8">
      {steps.map((s, i) => (
        <span
          key={s}
          className={`px-4 py-1.5 rounded-full text-xs font-bold font-headline transition-all ${
            i === current
              ? "bg-primary text-on-primary"
              : i < current
                ? "bg-primary/20 text-primary"
                : "bg-surface-container text-on-surface-variant"
          }`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

// ── Main Component ──

// ── Interfaces ──

interface ScriptScene {
  text: string;
  image_prompt: string;
}

interface ScriptData {
  vg_job_id: string;
  script: string;
  hook: string;
  cta: string;
  scenes: ScriptScene[];
  video_keywords?: string[];
}

export default function AIStorySetup() {
  const router = useRouter();

  // ── Step: 0 = setup, 1 = script review, 2 = preparing assets ──
  const [step, setStep] = useState(0);

  // Setup state
  const [topic, setTopic] = useState("scary_stories");
  const [customPrompt, setCustomPrompt] = useState("");
  const [topicOpen, setTopicOpen] = useState(false);
  const [tone, setTone] = useState("dramatic");
  const [artStyle, setArtStyle] = useState("anime");
  const [artModalOpen, setArtModalOpen] = useState(false);
  const [sceneMode, setSceneMode] = useState<"static" | "animated">("static");
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState("regular");
  const [captionFontSize, setCaptionFontSize] = useState<"small" | "medium" | "large">("medium");
  const [captionTransform, setCaptionTransform] = useState<"normal" | "uppercase" | "capitalize" | "lowercase">("uppercase");
  const [captionPosition, setCaptionPosition] = useState<"top" | "middle" | "bottom">("bottom");
  const [music, setMusic] = useState<string | null>("shadows");
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [speed, setSpeed] = useState(1.0);

  // Music preview playback
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setPlayingTrackId(null);
  }, []);

  const playPreview = useCallback((track: MusicTrack) => {
    stopPreview();
    const audio = new Audio(`/music-previews/${track.file}`);
    audioRef.current = audio;
    setPlayingTrackId(track.id);
    audio.play();
    previewTimerRef.current = setTimeout(() => {
      stopPreview();
    }, 10000);
    audio.addEventListener("ended", stopPreview);
  }, [stopPreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);
  const [duration, setDuration] = useState(30);
  const [videoLanguage, setVideoLanguage] = useState("Auto Detect");
  const [langOpen, setLangOpen] = useState(false);
  const [filmGrain, setFilmGrain] = useState(false);
  const [shake, setShake] = useState(false);
  const [endScreenCta, setEndScreenCta] = useState("Follow for more!");

  // Script generation state
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [scriptData, setScriptData] = useState<ScriptData | null>(null);

  // Editable script fields
  const [editHook, setEditHook] = useState("");
  const [editScenes, setEditScenes] = useState<ScriptScene[]>([]);
  const [editCta, setEditCta] = useState("");



  // Preview flow state
  const [prepareError, setPrepareError] = useState<string | null>(null);

  // Popover state
  const [durationPopoverOpen, setDurationPopoverOpen] = useState(false);

  const topicRef = useRef<HTMLDivElement>(null);
  const durationPopRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Auto-select music when topic changes
  useEffect(() => {
    if (topic !== "custom") {
      const preset = topicPresets.find((p) => p.id === topic);
      if (preset?.defaultMusic) {
        setMusic(preset.defaultMusic);
      }
    }
  }, [topic]);

  // Close popovers on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) {
        setTopicOpen(false);
      }
      if (durationPopRef.current && !durationPopRef.current.contains(e.target as Node)) {
        setDurationPopoverOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleVoiceSelect = (voice: Voice) => {
    setSelectedVoice(voice);
  };

  const currentTopicLabel =
    topic === "custom"
      ? "Custom Prompt"
      : topicPresets.find((p) => p.id === topic)?.label || topic;

  const selectedArt = artStyles.find((a) => a.id === artStyle) || artStyles[0];

  // ── Generate story script ──
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      const topicValue =
        topic === "custom"
          ? customPrompt
          : topicPresets.find((p) => p.id === topic)?.label || topic;

      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicValue,
          customPrompt: topic === "custom" ? customPrompt : "",
          tone,
          artStyle,
          duration,
          language: videoLanguage,
          voiceId: selectedVoice?.fishAudioId || defaultVoice.fishAudioId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed (${res.status})`);
      }

      const data = (await res.json()) as { script_data?: ScriptData } & ScriptData;

      // Handle both { script_data: {...} } and flat response shapes
      const sd = data.script_data || data;
      if (!sd.scenes || sd.scenes.length === 0) {
        throw new Error("No scenes returned from script generation");
      }

      setScriptData(sd);
      setEditHook(sd.hook || "");
      setEditScenes(sd.scenes.map((s) => ({ ...s })));
      setEditCta(endScreenCta || sd.cta || "Follow for more!");
      setStep(1);
    } catch (err) {
      console.error("Generate story error:", err);
      setGenerateError(err instanceof Error ? err.message : "Failed to generate story");
    } finally {
      setGenerating(false);
    }
  }, [topic, customPrompt, tone, artStyle, duration, endScreenCta]);

  // ── Build the common aiStory settings object ──
  const buildAiStorySettings = () => ({
    vgJobId: scriptData!.vg_job_id,
    hook: editHook,
    scenes: editScenes,
    cta: editCta,
    artStyle,
    captionStyle: captionsEnabled ? captionStyle : null,
    captionFontSize: captionsEnabled ? captionFontSize : null,
    captionTransform: captionsEnabled ? captionTransform : null,
    captionPosition: captionsEnabled ? captionPosition : null,
    music: music ? (musicTracks.find((t) => t.id === music)?.backendFile ?? music) : null,
    language: videoLanguage,
    filmGrain,
    shakeEffect: shake,
    sceneMode,
    tone,
    duration,
    transitionStyle: "fade" as const,
  });

  // ── Preview video: create library item, trigger prepare-assets, navigate immediately ──
  const handlePreviewVideo = async () => {
    if (!scriptData) return;
    setPrepareError(null);

    try {
      const fullScript = editScenes.map((s) => s.text).join(" ");
      const aiStorySettings = buildAiStorySettings();
      const title = editHook || scriptData.hook || "AI Voice Story";

      // 1. Create library item with status "preparing"
      const jobId = `prepare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const libRes = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          title,
          format: "video",
          templateId: "AI Story",
          backgroundMode: "AI Images",
          status: "preparing",
          script: fullScript,
          durationSec: duration,
        }),
      });

      if (!libRes.ok) throw new Error("Failed to create library item");
      const { item: libItem } = await libRes.json();

      // 2. Trigger prepare-assets (fire and forget — task will PATCH library item on completion)
      triggerPrepareAssets({
        title,
        script: fullScript,
        libraryItemId: libItem.id,
        settings: {
          voice: selectedVoice?.fishAudioId || defaultVoice.fishAudioId,
          speed,
          backgroundMode: "AI Images",
          aiStory: aiStorySettings,
        },
      }).catch((err) => {
        console.error("Failed to trigger prepare-assets:", err);
      });

      // 3. Navigate immediately
      router.push("/library");
    } catch (err) {
      console.error("Failed to start preview:", err);
      setPrepareError(err instanceof Error ? err.message : "Failed to start preview");
    }
  };

  // ── STEP 1: Script Review ──
  if (step >= 1) {
    return (
      <main className="min-h-screen bg-surface pt-8 pb-48 px-6 max-w-4xl mx-auto">
        <StepPills current={1} />

        {/* Back to setup */}
        <button
          onClick={() => { setStep(0); }}
          className="mb-8 inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to setup
        </button>

        <h1 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-2">
          Review your story
        </h1>
        <p className="text-on-surface-variant text-sm mb-10">
          Edit the hook, scenes, and CTA before previewing your video
        </p>

        {/* Error from prepare-assets */}
        {prepareError && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-medium">
            {prepareError}
          </div>
        )}

        {/* Hook */}
        <div className="mb-8">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">
            Hook text
          </label>
          <textarea
            value={editHook}
            onChange={(e) => setEditHook(e.target.value)}
            rows={2}
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface font-body text-sm resize-none"
          />
        </div>

        {/* Scene cards */}
        <div className="space-y-6 mb-8">
          {editScenes.map((scene, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">
                  Scene {i + 1} of {editScenes.length}
                </span>
              </div>

              {/* Narration text */}
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">
                Narration
              </label>
              <textarea
                value={scene.text}
                onChange={(e) => {
                  setEditScenes((prev) => {
                    const next = [...prev];
                    next[i] = { ...next[i], text: e.target.value };
                    return next;
                  });
                }}
                rows={3}
                className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface font-body text-sm resize-none mb-4"
              />

              {/* Visual prompt */}
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">
                Visual prompt
                <span className="font-normal normal-case tracking-normal ml-1 text-on-surface-variant/50">
                  — describes what AI generates for this scene
                </span>
              </label>
              <textarea
                value={scene.image_prompt}
                onChange={(e) => {
                  setEditScenes((prev) => {
                    const next = [...prev];
                    next[i] = { ...next[i], image_prompt: e.target.value };
                    return next;
                  });
                }}
                rows={2}
                className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface-variant font-body text-sm resize-none"
              />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mb-10">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">
            End screen CTA
          </label>
          <input
            type="text"
            value={editCta}
            onChange={(e) => setEditCta(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface font-body text-sm"
          />
        </div>

        {/* Bottom bar */}
        <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl px-8 py-6 shadow-[0px_-10px_30px_rgba(0,0,0,0.03)] flex justify-center gap-4">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-8 py-4 rounded-xl text-base font-bold font-headline border-2 border-outline-variant/30 text-on-surface hover:bg-surface-container-high transition-all active:scale-95 disabled:opacity-50"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Regenerating...
              </span>
            ) : (
              "Regenerate"
            )}
          </button>

          <button
            onClick={handlePreviewVideo}
            className="flex-1 max-w-md py-4 rounded-xl text-base font-bold font-headline flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 bg-primary text-on-primary shadow-primary/30"
          >
              Preview video
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                play_circle
              </span>
          </button>
        </footer>

        {/* Voice Picker Modal (keep available on review step) */}
        <VoicePickerModal
          open={voiceModalOpen}
          onClose={() => setVoiceModalOpen(false)}
          onSelect={handleVoiceSelect}
          currentVoiceId={selectedVoice?.fishAudioId || defaultVoice.fishAudioId}
        />
      </main>
    );
  }

  // ── STEP 0: Setup ──
  return (
    <main className="min-h-screen bg-surface pb-48 px-6 max-w-4xl mx-auto pt-8">
      {/* ── Section 1: Header ── */}
      <Link
        href="/create/video-styles"
        className="mb-6 inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-1">
          AI voice story
        </h1>
        <p className="text-on-surface-variant text-sm">
          Create faceless AI-narrated videos
        </p>
      </div>

      {/* ── Section 2: Step Indicator ── */}
      <StepPills current={0} />

      {/* ── Section 3: Topic Dropdown ── */}
      <section className="mb-10">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">
          Topic
        </label>
        <div className="relative" ref={topicRef}>
          <button
            onClick={() => setTopicOpen((prev) => !prev)}
            className="w-full flex items-center justify-between bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3.5 text-sm font-body text-on-surface hover:border-outline-variant transition-all"
          >
            <span className={topic === "custom" ? "text-primary font-semibold" : ""}>
              {currentTopicLabel}
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-base">
              {topicOpen ? "expand_less" : "expand_more"}
            </span>
          </button>

          {topicOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest rounded-xl shadow-[0px_30px_60px_rgba(0,0,0,0.12)] border border-outline-variant/15 z-50 max-h-80 overflow-y-auto">
              {/* Custom prompt option */}
              <button
                onClick={() => { setTopic("custom"); setTopicOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  topic === "custom" ? "bg-primary/5" : "hover:bg-surface-container-low"
                }`}
              >
                <span className="material-symbols-outlined text-primary text-lg">edit</span>
                <span className="text-primary font-semibold">Custom Prompt</span>
              </button>

              {/* Divider + header */}
              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 border-t border-outline-variant/10">
                Popular Topics
              </div>

              {/* Topic list */}
              {topicPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => { setTopic(preset.id); setTopicOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                    topic === preset.id ? "bg-primary/5 text-primary font-semibold" : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span>{preset.label}</span>
                  <div className="flex items-center gap-2">
                    {preset.badge && (
                      <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {preset.badge}
                      </span>
                    )}
                    {topic === preset.id && (
                      <span className="material-symbols-outlined text-primary text-sm">check</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom prompt textarea */}
        {topic === "custom" && (
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe the story you want to create..."
            rows={3}
            className="mt-3 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body text-sm resize-none"
          />
        )}
      </section>

      {/* ── Art Style (modal picker) ── */}
      <section className="mb-10">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 block font-headline">
          Art style
        </label>
        <p className="text-xs text-on-surface-variant/70 mb-3">
          Choose the visual style for your scenes
        </p>

        {/* Trigger card */}
        <button
          onClick={() => setArtModalOpen(true)}
          className="w-full flex items-center gap-4 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:border-outline-variant transition-all text-left"
        >
          {artPreviewSrc(selectedArt.id) ? (
            <img
              src={artPreviewSrc(selectedArt.id)!}
              alt={selectedArt.label}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${selectedArt.gradient} flex-shrink-0`} />
          )}
          <div className="flex-grow min-w-0">
            <span className="text-sm font-bold font-headline text-on-surface block">
              {selectedArt.label}
            </span>
            <span className="text-xs text-on-surface-variant">
              Tap to change art style
            </span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant">
            chevron_right
          </span>
        </button>

        {/* Art style modal */}
        {artModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setArtModalOpen(false)}
            />
            {/* Bottom sheet */}
            <div className="relative bg-surface-container-lowest w-full max-w-[min(900px,92vw)] rounded-t-3xl p-6 pb-10 max-h-[92vh] overflow-y-auto animate-[slideUp_0.25s_ease-out]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold font-headline text-on-surface">
                  Choose art style
                </h3>
                <button
                  onClick={() => setArtModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">close</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {artStyles.map((style) => {
                  const isSelected = artStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => { setArtStyle(style.id); setArtModalOpen(false); }}
                      className={`relative rounded-[12px] overflow-hidden transition-all aspect-[3/4] ${
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-surface-container-lowest"
                          : "hover:opacity-90"
                      }`}
                    >
                      {artPreviewSrc(style.id) ? (
                        <img
                          src={artPreviewSrc(style.id)!}
                          alt={style.label}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`} />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-6 pb-2 px-2">
                        <span className="block text-center text-xs font-bold font-headline truncate text-white">
                          {style.label}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Scene Mode ── */}
      <section className="mb-10">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 block font-headline">
          Scene mode
        </label>
        <p className="text-xs text-on-surface-variant/70 mb-3">
          How your scenes look and feel
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Static */}
          <button
            onClick={() => setSceneMode("static")}
            className={`rounded-2xl overflow-hidden text-left transition-all border ${
              sceneMode === "static"
                ? "border-2 border-primary shadow-[0px_10px_30px_rgba(111,51,213,0.1)]"
                : "border-outline-variant/30 hover:border-outline-variant"
            }`}
          >
            <div className="h-28 bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">image</span>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold font-headline text-sm text-on-surface">Static</span>
                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Free</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                AI images with smooth Ken Burns zoom and pan
              </p>
            </div>
          </button>

          {/* Animated */}
          <button
            onClick={() => setSceneMode("animated")}
            className={`rounded-2xl overflow-hidden text-left transition-all border ${
              sceneMode === "animated"
                ? "border-2 border-primary shadow-[0px_10px_30px_rgba(111,51,213,0.1)]"
                : "border-outline-variant/30 hover:border-outline-variant"
            }`}
          >
            <div className="h-28 bg-gradient-to-br from-purple-900/80 to-indigo-900/80 flex items-center justify-center relative">
              <span className="material-symbols-outlined text-4xl text-white/60">play_circle</span>
              <div className="absolute inset-0 border-2 border-primary/20 rounded-t-2xl" />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold font-headline text-sm text-on-surface">Animated</span>
                <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">Premium</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Each scene becomes a 3-5s AI video clip via Kling AI
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* ── Caption Style ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-headline">
            Caption style
          </label>
          <button
            onClick={() => setCaptionsEnabled((prev) => !prev)}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              captionsEnabled ? "bg-primary" : "bg-outline-variant/40"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                captionsEnabled ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {!captionsEnabled ? (
          <p className="text-xs text-on-surface-variant/60 italic">
            Captions are disabled. Your video will have no text overlay.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {captionStyles.map((cs) => {
                const isSelected = captionStyle === cs.id;
                return (
                  <button
                    key={cs.id}
                    onClick={() => setCaptionStyle(cs.id)}
                    className={`rounded-xl overflow-hidden transition-all border ${
                      isSelected
                        ? "border-2 border-primary"
                        : "border-outline-variant/30 hover:border-outline-variant"
                    }`}
                  >
                    <div className="h-20 bg-[#1a1a1a] flex items-center justify-center px-3" style={cs.containerStyle}>
                      <span style={cs.baseStyle}>
                        Sample{" "}
                        <span style={{ ...cs.baseStyle, ...cs.activeStyle }}>text</span>
                      </span>
                    </div>
                    <div className={`py-2 text-center text-[11px] font-bold font-headline ${
                      isSelected ? "text-primary" : "text-on-surface-variant"
                    }`}>
                      {cs.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Caption settings */}
            <div className="mt-4 space-y-4">
                {/* Font size */}
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">
                    Font size
                  </label>
                  <div className="flex gap-2">
                    {(["small", "medium", "large"] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setCaptionFontSize(size)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize transition-all ${
                          captionFontSize === size
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text transform */}
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">
                    Text transform
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { id: "normal", label: "Normal" },
                      { id: "uppercase", label: "UPPERCASE" },
                      { id: "capitalize", label: "Capitalize" },
                      { id: "lowercase", label: "lowercase" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setCaptionTransform(opt.id)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                          captionTransform === opt.id
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption position */}
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">
                    Position
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { id: "top", label: "Top" },
                      { id: "middle", label: "Middle" },
                      { id: "bottom", label: "Bottom" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setCaptionPosition(opt.id)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                          captionPosition === opt.id
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
            </div>
          </>
        )}
      </section>

      {/* ── Background Music ── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-headline">
            Background music
          </label>
          <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold">
            Optional
          </span>
        </div>

        <div className="space-y-2">
          {musicTracks.map((track) => {
            const isSelected = music === track.id;
            const isPlaying = playingTrackId === track.id;
            return (
              <div
                key={track.id}
                onClick={() => setMusic(track.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-primary/5 border-2 border-primary"
                    : "bg-surface-container-lowest border border-outline-variant/20 hover:border-outline-variant"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${track.gradient} flex-shrink-0`} />
                <div className="flex-grow min-w-0">
                  <span className="text-sm font-bold font-headline text-on-surface block">{track.name}</span>
                  <span className="text-xs text-on-surface-variant">{track.description}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPlaying) {
                      stopPreview();
                    } else {
                      playPreview(track);
                    }
                  }}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-on-surface-variant text-xl">
                    {isPlaying ? "pause_circle" : "play_circle"}
                  </span>
                </button>
              </div>
            );
          })}

          {/* No music */}
          <button
            onClick={() => setMusic(null)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
              music === null
                ? "bg-primary/5 border-2 border-primary"
                : "bg-surface-container-lowest border border-outline-variant/20 hover:border-outline-variant"
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">music_off</span>
            </div>
            <span className="text-sm font-bold font-headline text-on-surface">No music</span>
          </button>
        </div>
      </section>

      {/* ── Creative Settings (Voice, Speed, Duration + Language) ── */}
      <section className="mb-10">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 block font-headline">
          Creative settings
        </label>
        <p className="text-xs text-on-surface-variant/70 mb-3">
          Using your defaults. Tap any to change.
        </p>

        <div className="flex flex-wrap gap-3 items-start">
          {/* Voice pill */}
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold font-headline text-sm transition-all bg-surface-container text-on-surface hover:bg-surface-container-highest"
          >
            <span className="material-symbols-outlined text-base">mic</span>
            <span>{selectedVoice ? selectedVoice.name : "Male voice"}</span>
            <span className="material-symbols-outlined text-base">expand_more</span>
          </button>

          {/* Speed pill with inline slider */}
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-surface-container">
            <span className="material-symbols-outlined text-base text-on-surface">speed</span>
            <span className="font-bold font-headline text-sm text-on-surface whitespace-nowrap">
              Speed: {speed.toFixed(1)}x
            </span>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-28 h-1.5 rounded-full appearance-none cursor-pointer bg-outline-variant/30 accent-primary"
            />
          </div>

          {/* Duration pill */}
          <div className="relative" ref={durationPopRef}>
            <button
              onClick={() => setDurationPopoverOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold font-headline text-sm transition-all ${
                durationPopoverOpen
                  ? "bg-secondary-container text-on-secondary-container ring-2 ring-primary"
                  : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              <span className="material-symbols-outlined text-base">timer</span>
              <span>{duration} seconds</span>
              <span className="material-symbols-outlined text-base">
                {durationPopoverOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {durationPopoverOpen && (
              <div className="absolute top-full left-0 mt-2 bg-surface-container-lowest rounded-2xl shadow-[0px_30px_60px_rgba(111,51,213,0.15)] border border-outline-variant/15 p-4 z-40 min-w-[200px]">
                <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 font-headline">Duration</div>
                <div className="flex flex-wrap gap-2">
                  {durations.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => { setDuration(d.value); setDurationPopoverOpen(false); }}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                        duration === d.value
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tone pills */}
        <div className="mt-4">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">
            Tone
          </label>
          <div className="flex flex-wrap gap-2">
            {toneOptions.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  tone === t.id
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Video language dropdown */}
        <div className="mt-4">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">
            Video language
          </label>
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen((prev) => !prev)}
              className="w-full flex items-center justify-between bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3.5 text-sm font-body text-on-surface hover:border-outline-variant transition-all"
            >
              <span>{videoLanguage}</span>
              <span className="material-symbols-outlined text-on-surface-variant text-base">
                {langOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {langOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest rounded-xl shadow-[0px_30px_60px_rgba(0,0,0,0.12)] border border-outline-variant/15 z-50 max-h-60 overflow-y-auto">
                {videoLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { setVideoLanguage(lang); setLangOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                      videoLanguage === lang ? "bg-primary/5 text-primary font-semibold" : "text-on-surface hover:bg-surface-container-low"
                    }`}
                  >
                    <span>{lang}</span>
                    {videoLanguage === lang && (
                      <span className="material-symbols-outlined text-primary text-sm">check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Effects ── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-headline">
            Effects
          </label>
          <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold">
            Optional
          </span>
        </div>

        <div className="space-y-3">
          {/* Film grain */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-headline text-on-surface">Film grain</span>
                <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">New</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">Old film look with scanlines and noise</p>
            </div>
            <button
              onClick={() => setFilmGrain((prev) => !prev)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                filmGrain ? "bg-primary" : "bg-outline-variant/40"
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                filmGrain ? "translate-x-[22px]" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          {/* Shake effect */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-headline text-on-surface">Shake effect</span>
                <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">New</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">Eerie motion for horror and thriller</p>
            </div>
            <button
              onClick={() => setShake((prev) => !prev)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                shake ? "bg-primary" : "bg-outline-variant/40"
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                shake ? "translate-x-[22px]" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        </div>
      </section>

      {/* ── End Screen CTA ── */}
      <section className="mb-10">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">
          End screen CTA
        </label>
        <input
          type="text"
          value={endScreenCta}
          onChange={(e) => setEndScreenCta(e.target.value)}
          placeholder="Follow for more!"
          className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body text-sm"
        />
      </section>

      {/* Error message */}
      {generateError && (
        <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-medium">
          {generateError}
        </div>
      )}

      {/* ── Generate Button ── */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl px-8 py-6 shadow-[0px_-10px_30px_rgba(0,0,0,0.03)] flex justify-center">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className={`w-full max-w-xl py-5 rounded-xl text-xl font-bold font-headline flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${
            generating
              ? "bg-primary/80 text-on-primary cursor-wait"
              : "bg-primary text-on-primary shadow-primary/30"
          }`}
        >
          {generating ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Generating story...
            </>
          ) : (
            <>
              Generate story ideas
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
            </>
          )}
        </button>
      </footer>

      {/* Voice Picker Modal */}
      <VoicePickerModal
        open={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onSelect={handleVoiceSelect}
        currentVoiceId={selectedVoice?.fishAudioId || defaultVoice.fishAudioId}
      />
    </main>
  );
}
