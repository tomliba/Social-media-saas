"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VoicePickerModal from "@/components/create/VoicePickerModal";
import { triggerPrepareAssets } from "@/app/actions/prepare-assets";
import { defaultVoice } from "@/lib/voices";
import type { Voice } from "@/lib/voices";

// ── Script source modes (same accordion pattern as Argument) ──

const scriptModes = [
  { id: "topic" as const, label: "Viral ideas", icon: "local_fire_department", description: "AI generates 10 viral skeleton video ideas" },
  { id: "script" as const, label: "Paste your own script", icon: "content_paste", description: "Paste narration text directly" },
  { id: "upload" as const, label: "Upload content", icon: "upload_file", description: "Upload a file as source material" },
  { id: "prompt" as const, label: "Write your own prompt", icon: "edit_note", description: "Freeform instructions to AI" },
];

// ── Tones ──

const toneOptions = [
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

// ── Proven winner formats ──

const provenFormats = [
  { id: "raised_by", icon: "pets", label: "Raised by Animals", description: "What if you were raised by [animal]", tier: "6M+ avg" },
  { id: "extreme_scenario", icon: "bolt", label: "Extreme Scenarios", description: "What if you [extreme scenario]", tier: "6M+ avg" },
  { id: "habit_extreme", icon: "schedule", label: "Habit Extremes", description: "What happens if you [habit] for [time]", tier: "3M+ avg" },
  { id: "lethal_dose", icon: "science", label: "Lethal Dose", description: "How many [substance] will end you", tier: "3M+ avg" },
  { id: "body_explainer", icon: "fitness_center", label: "Body Explainer", description: "What [thing] does to your body", tier: "3M+ avg" },
  { id: "body_reaction", icon: "psychology", label: "Body Reactions", description: "What your body does when you [experience]", tier: "1M+ avg" },
  { id: "after_death", icon: "skull", label: "After Death", description: "What happens to your body [timeline]", tier: "1M+ avg" },
];

// ── Skeleton styles ──

const skeletonStyleOptions = [
  { id: "cool", label: "Cool", thumbnail: "/skeleton-styles/skeleton_cool.png" },
  { id: "warm", label: "Warm", thumbnail: "/skeleton-styles/skeleton_warm.png" },
  { id: "red", label: "Red", thumbnail: "/skeleton-styles/skeleton_red.png" },
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
  "Auto Detect", "English", "Chinese", "Japanese", "German", "French",
  "Spanish", "Korean", "Portuguese",
];

// ── Duration options ──

const durations = [
  { label: "30 seconds", value: 30 },
  { label: "60 seconds", value: 60 },
  { label: "90 seconds", value: 90 },
  { label: "120 seconds", value: 120 },
];

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

// ── Interfaces ──

interface ScriptScene {
  text: string;
  image_prompt: string;
  image_prompt_1?: string;
  motion_prompt?: string;
}

function getImagePrompt(scene: ScriptScene): string {
  return scene.image_prompt || scene.image_prompt_1 || "";
}

interface ScriptData {
  vg_job_id: string;
  script: string;
  hook: string;
  cta: string;
  scenes: ScriptScene[];
  video_keywords?: string[];
  hook_image_prompt?: string;
  cta_image_prompt?: string;
  hook_motion_prompt?: string;
  cta_motion_prompt?: string;
}

// ── Main Component ──

export default function SkeletonSetup() {
  const router = useRouter();

  // Step: 0 = setup, 1 = script review
  const [step, setStep] = useState(0);

  // Skeleton-specific state
  const [niche, setNiche] = useState("");
  const [scriptMode, setScriptMode] = useState<"topic" | "script" | "upload" | "prompt">("topic");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicTab, setTopicTab] = useState<"viral" | "proven">("viral");
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [pastedScript, setPastedScript] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExtracting, setUploadExtracting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  // Settings state (identical to AIStorySetup)
  const [tone, setTone] = useState("Regular");
  const [skeletonStyle, setSkeletonStyle] = useState("red");
  const [sceneMode, setSceneMode] = useState<"static" | "animated">("static");
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState("regular");
  const [captionFontSize, setCaptionFontSize] = useState<"small" | "medium" | "large">("medium");
  const [captionTransform, setCaptionTransform] = useState<"normal" | "uppercase" | "capitalize" | "lowercase">("uppercase");
  const [captionPosition, setCaptionPosition] = useState<"top" | "middle" | "bottom">("bottom");
  const [music, setMusic] = useState<string | null>("tension");
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [duration, setDuration] = useState(30);
  const [videoLanguage, setVideoLanguage] = useState("Auto Detect");
  const [langOpen, setLangOpen] = useState(false);
  const [filmGrain, setFilmGrain] = useState(false);
  const [shake, setShake] = useState(false);
  const [endScreenCta, setEndScreenCta] = useState("Follow for more!");

  // Music preview
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPreview = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null; }
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null; }
    setPlayingTrackId(null);
  }, []);

  const playPreview = useCallback((track: MusicTrack) => {
    stopPreview();
    const audio = new Audio(`/music-previews/${track.file}`);
    audioRef.current = audio;
    setPlayingTrackId(track.id);
    audio.play();
    previewTimerRef.current = setTimeout(() => { stopPreview(); }, 10000);
    audio.addEventListener("ended", stopPreview);
  }, [stopPreview]);

  useEffect(() => { return () => { stopPreview(); }; }, [stopPreview]);

  // Script generation state
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [scriptData, setScriptData] = useState<ScriptData | null>(null);

  // Editable script fields
  const [editHook, setEditHook] = useState("");
  const [editScenes, setEditScenes] = useState<ScriptScene[]>([]);
  const [editCta, setEditCta] = useState("");
  const [editHookImagePrompt, setEditHookImagePrompt] = useState("");
  const [editCtaImagePrompt, setEditCtaImagePrompt] = useState("");

  // Scene image generation state
  const [sceneImageUrls, setSceneImageUrls] = useState<(string | null)[]>([]);
  const [sceneImageStatus, setSceneImageStatus] = useState<("loading" | "done" | "error")[]>([]);
  const [regeneratingScene, setRegeneratingScene] = useState<number | null>(null);

  // Animation state
  const [animationJobId, setAnimationJobId] = useState<string | null>(null);
  const [animationStatus, setAnimationStatus] = useState<Record<number, { status: string; video_url: string | null; error: string | null }>>({});
  const [animating, setAnimating] = useState(false);
  const [editHookMotionPrompt, setEditHookMotionPrompt] = useState("");
  const [editCtaMotionPrompt, setEditCtaMotionPrompt] = useState("");

  // TTS-based duration cache
  const [cachedTtsResult, setCachedTtsResult] = useState<{ audio_duration_ms: number; word_timestamps: unknown; audio_r2_url: string } | null>(null);
  const [cachedScriptHash, setCachedScriptHash] = useState("");

  // Hook & CTA image state
  const [hookImageUrl, setHookImageUrl] = useState<string | null>(null);
  const [hookImageStatus, setHookImageStatus] = useState<"loading" | "done" | "error">("loading");
  const [ctaImageUrl, setCtaImageUrl] = useState<string | null>(null);
  const [ctaImageStatus, setCtaImageStatus] = useState<"loading" | "done" | "error">("loading");
  const [regeneratingHook, setRegeneratingHook] = useState(false);
  const [regeneratingCta, setRegeneratingCta] = useState(false);

  // Preview flow state
  const [prepareError, setPrepareError] = useState<string | null>(null);

  // Popover state
  const [durationPopoverOpen, setDurationPopoverOpen] = useState(false);

  const durationPopRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const animPollRef = useRef<NodeJS.Timeout | null>(null);

  // Close popovers on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (durationPopRef.current && !durationPopRef.current.contains(e.target as Node)) setDurationPopoverOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleVoiceSelect = (voice: Voice) => { setSelectedVoice(voice); };

  // Reset topics when niche changes
  useEffect(() => {
    setSuggestedTopics([]);
    setSelectedTopic("");
  }, [niche]);

  // ── Fetch viral skeleton topics ──
  const fetchTopics = useCallback(async (mode: "viral" | "proven" = "viral", formatId?: string) => {
    setLoadingTopics(true);
    try {
      const res = await fetch("/api/skeleton/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          ...(mode === "proven" && { mode: "proven", format_id: formatId }),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSuggestedTopics(data.topics || []);
      if (data.topics?.length > 0) setSelectedTopic(data.topics[0]);
    } catch {
      setSuggestedTopics([]);
    } finally {
      setLoadingTopics(false);
    }
  }, [niche]);

  // ── Validate and set upload file ──
  const validateAndSetFile = (file: File | null) => {
    if (!file) { setUploadFile(null); return; }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx", "txt", "md"].includes(ext)) {
      setUploadError("Unsupported file type. Use PDF, DOCX, TXT, or MD.");
      setUploadFile(null);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("File is too large. Max 25MB.");
      setUploadFile(null);
      return;
    }
    setUploadError(null);
    setUploadFile(file);
  };

  // ── Generate scene images ──
  const generateSceneImages = useCallback(async (sd: ScriptData) => {
    const hasHookPrompt = !!sd.hook_image_prompt;
    const hasCtaPrompt = !!sd.cta_image_prompt;

    setSceneImageUrls(sd.scenes.map(() => null));
    setSceneImageStatus(sd.scenes.map(() => "loading"));
    if (hasHookPrompt) { setHookImageUrl(null); setHookImageStatus("loading"); }
    if (hasCtaPrompt) { setCtaImageUrl(null); setCtaImageStatus("loading"); }

    try {
      const res = await fetch("/api/generate-scene-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vg_job_id: sd.vg_job_id,
          scenes: sd.scenes.map((s) => ({ text: s.text, image_prompt: getImagePrompt(s) })),
          ...(hasHookPrompt && { hook_image_prompt: sd.hook_image_prompt }),
          ...(hasCtaPrompt && { cta_image_prompt: sd.cta_image_prompt }),
          art_style: "skeleton",
          style: "skeleton",
          scene_mode: sceneMode,
          duration,
          skeleton_style: skeletonStyle,
        }),
      });

      if (!res.ok) {
        setSceneImageStatus(sd.scenes.map(() => "error"));
        if (hasHookPrompt) setHookImageStatus("error");
        if (hasCtaPrompt) setCtaImageStatus("error");
        return;
      }

      const data = await res.json() as { image_urls?: string[]; hook_image_url?: string; cta_image_url?: string };
      const urls = data.image_urls ?? [];

      setSceneImageUrls(sd.scenes.map((_, i) => urls[i] || null));
      setSceneImageStatus(sd.scenes.map((_, i) => urls[i] ? "done" : "error"));

      if (hasHookPrompt) { setHookImageUrl(data.hook_image_url ?? null); setHookImageStatus(data.hook_image_url ? "done" : "error"); }
      if (hasCtaPrompt) { setCtaImageUrl(data.cta_image_url ?? null); setCtaImageStatus(data.cta_image_url ? "done" : "error"); }
    } catch {
      setSceneImageStatus(sd.scenes.map(() => "error"));
      if (hasHookPrompt) setHookImageStatus("error");
      if (hasCtaPrompt) setCtaImageStatus("error");
    }
  }, [duration, sceneMode, skeletonStyle]);

  // ── Regenerate a single scene image ──
  const handleRegenerateImage = useCallback(async (sceneIndex: number) => {
    if (!scriptData) return;
    setRegeneratingScene(sceneIndex);
    setSceneImageStatus((prev) => { const next = [...prev]; next[sceneIndex] = "loading"; return next; });

    try {
      const scene = editScenes[sceneIndex];
      const res = await fetch("/api/regenerate-scene-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vg_job_id: scriptData.vg_job_id,
          scene_index: sceneIndex,
          image_prompt: getImagePrompt(scene),
          art_style: "skeleton",
          style: "skeleton",
        }),
      });

      if (!res.ok) {
        setSceneImageStatus((prev) => { const next = [...prev]; next[sceneIndex] = "error"; return next; });
        return;
      }

      const data = await res.json() as { image_url?: string };
      if (data.image_url) {
        setSceneImageUrls((prev) => { const next = [...prev]; next[sceneIndex] = data.image_url!; return next; });
        setSceneImageStatus((prev) => { const next = [...prev]; next[sceneIndex] = "done"; return next; });
      } else {
        setSceneImageStatus((prev) => { const next = [...prev]; next[sceneIndex] = "error"; return next; });
      }
    } catch {
      setSceneImageStatus((prev) => { const next = [...prev]; next[sceneIndex] = "error"; return next; });
    } finally {
      setRegeneratingScene(null);
    }
  }, [scriptData, editScenes]);

  // ── Regenerate hook or CTA image ──
  const handleRegenerateHookOrCta = useCallback(async (type: "hook" | "cta") => {
    if (!scriptData) return;
    const isHook = type === "hook";
    if (isHook) { setRegeneratingHook(true); setHookImageStatus("loading"); }
    else { setRegeneratingCta(true); setCtaImageStatus("loading"); }

    try {
      const prompt = isHook ? editHookImagePrompt : editCtaImagePrompt;
      const res = await fetch("/api/regenerate-scene-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vg_job_id: scriptData.vg_job_id,
          scene_index: isHook ? -1 : -2,
          image_prompt: prompt || (isHook ? editHook : editCta),
          art_style: "skeleton",
          style: "skeleton",
          image_type: type,
        }),
      });

      if (!res.ok) {
        if (isHook) setHookImageStatus("error"); else setCtaImageStatus("error");
        return;
      }

      const data = await res.json() as { image_url?: string };
      if (data.image_url) {
        if (isHook) { setHookImageUrl(data.image_url); setHookImageStatus("done"); }
        else { setCtaImageUrl(data.image_url); setCtaImageStatus("done"); }
      } else {
        if (isHook) setHookImageStatus("error"); else setCtaImageStatus("error");
      }
    } catch {
      if (isHook) setHookImageStatus("error"); else setCtaImageStatus("error");
    } finally {
      if (isHook) setRegeneratingHook(false); else setRegeneratingCta(false);
    }
  }, [scriptData, editHook, editCta, editHookImagePrompt, editCtaImagePrompt]);

  // ── Generate story script ──
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      // Determine topic value based on script mode
      let topicValue = "";
      let mode = scriptMode;

      if (scriptMode === "topic") {
        topicValue = customTopic || selectedTopic;
        if (!topicValue) {
          throw new Error("Select a topic or type your own");
        }
      } else if (scriptMode === "script") {
        topicValue = pastedScript;
        if (!topicValue.trim()) {
          throw new Error("Paste your script first");
        }
      } else if (scriptMode === "upload") {
        if (!uploadFile) {
          throw new Error("Upload a file first");
        }
        setUploadError(null);
        setUploadExtracting(true);
        try {
          const formData = new FormData();
          formData.append("file", uploadFile);
          const extractRes = await fetch("/api/extract-content", { method: "POST", body: formData });
          if (!extractRes.ok) {
            const errData = await extractRes.json().catch(() => ({}));
            setUploadError(errData.error || "Failed to extract content from file");
            return;
          }
          const extractData = await extractRes.json();
          topicValue = `Write a video script based on this source material:\n\n${extractData.text}`;
        } catch (err) {
          setUploadError("Something went wrong. Try again.");
          return;
        } finally {
          setUploadExtracting(false);
        }
        mode = "prompt";
      } else if (scriptMode === "prompt") {
        topicValue = customPrompt;
        if (!topicValue.trim()) {
          throw new Error("Write your prompt first");
        }
      }

      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicValue,
          customPrompt: mode === "prompt" ? (scriptMode === "upload" ? topicValue : customPrompt) : "",
          tone,
          artStyle: "skeleton",
          duration,
          language: videoLanguage,
          voiceId: selectedVoice?.fishAudioId || defaultVoice.fishAudioId,
          scene_mode: sceneMode,
          style: "skeleton",
          mode,
          niche,
          ...(scriptMode === "script" && { pastedScript }),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed (${res.status})`);
      }

      const data = (await res.json()) as { script_data?: ScriptData } & ScriptData;
      const sd = data.script_data || data;
      if (!sd.scenes || sd.scenes.length === 0) {
        throw new Error("No scenes returned from script generation");
      }

      setScriptData(sd);
      setEditHook(sd.hook || "");
      setEditScenes(sd.scenes.map((s) => ({ ...s, motion_prompt: (s as ScriptScene).motion_prompt || "" })));
      setEditCta(endScreenCta || sd.cta || "Follow for more!");
      setEditHookImagePrompt(sd.hook_image_prompt || "");
      setEditCtaImagePrompt(sd.cta_image_prompt || "");
      setEditHookMotionPrompt((sd as ScriptData).hook_motion_prompt || "");
      setEditCtaMotionPrompt((sd as ScriptData).cta_motion_prompt || "");
      setStep(1);

      generateSceneImages(sd);
    } catch (err) {
      console.error("Generate story error:", err);
      setGenerateError(err instanceof Error ? err.message : "Failed to generate story");
    } finally {
      setGenerating(false);
    }
  }, [scriptMode, customTopic, selectedTopic, pastedScript, uploadFile, customPrompt, tone, duration, videoLanguage, selectedVoice, endScreenCta, generateSceneImages, sceneMode, niche]);

  // ── Build the common aiStory settings object ──
  const buildAiStorySettings = () => ({
    vgJobId: scriptData!.vg_job_id,
    hook: editHook,
    scenes: editScenes.map((s, i) => ({
      text: s.text,
      image_prompt: getImagePrompt(s),
      ...(sceneMode === "animated" && animationStatus[i]?.video_url
        ? { visual_type: "pexels_clip" as const }
        : {}),
    })),
    cta: editCta,
    artStyle: "skeleton",
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

  // ── Animate scenes ──
  const startAnimationJob = useCallback(async (
    segments: { index: number; image_url: string | null; motion_prompt: string; duration: number }[],
    isRetry: boolean,
  ) => {
    if (animPollRef.current) { clearInterval(animPollRef.current); animPollRef.current = null; }

    const validSegments = segments.filter((seg) => seg.image_url);
    if (validSegments.length === 0) { setAnimating(false); return; }

    try {
      const res = await fetch("/api/animate-scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: validSegments }),
      });

      if (!res.ok) { setAnimating(false); return; }

      const data = await res.json();
      const jobId = data.job_id as string;
      setAnimationJobId(jobId);

      const interval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/animate-status/${jobId}`);
          if (pollRes.status === 404) { clearInterval(interval); animPollRef.current = null; setAnimating(false); return; }
          if (!pollRes.ok) return;
          const pollData = await pollRes.json();

          if (pollData.segments) {
            const statusMap: Record<number, { status: string; video_url: string | null; error: string | null }> = {};
            for (const [key, val] of Object.entries(pollData.segments)) {
              const v = val as { status: string; video_url: string | null; error: string | null };
              statusMap[Number(key)] = { status: v.status, video_url: v.video_url || null, error: v.error || null };
            }
            setAnimationStatus((prev) => ({ ...prev, ...statusMap }));
          }

          if (pollData.complete) {
            clearInterval(interval);
            animPollRef.current = null;

            if (!isRetry) {
              const failedSegments = validSegments.filter((seg) => {
                const latest = pollData.segments?.[String(seg.index)] as { status: string } | undefined;
                return latest?.status === "failed";
              });
              if (failedSegments.length > 0) { startAnimationJob(failedSegments, true); return; }
            }

            setAnimating(false);
          }
        } catch { /* keep polling */ }
      }, 3000);
      animPollRef.current = interval;
    } catch {
      setAnimating(false);
    }
  }, []);

  const handleAnimateScenes = useCallback(async () => {
    setAnimating(true);
    setAnimationStatus({});

    // ── Try TTS-based real durations ──
    let sceneTiming: { startSec: number; endSec: number; type: string }[] | null = null;
    try {
      const scriptHash = [editHook, ...editScenes.map((s) => s.text), editCta].join("|");

      let ttsResult = cachedTtsResult;
      if (!ttsResult || scriptHash !== cachedScriptHash) {
        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vg_job_id: scriptData?.vg_job_id,
            voice_id: selectedVoice?.fishAudioId || defaultVoice.fishAudioId,
            speed,
          }),
        });
        if (ttsRes.ok) {
          ttsResult = await ttsRes.json();
          setCachedTtsResult(ttsResult);
          setCachedScriptHash(scriptHash);
        } else {
          ttsResult = null;
        }
      }

      if (ttsResult) {
        const timingRes = await fetch("/api/scene-timing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenes: editScenes.map((s) => ({ text: s.text })),
            word_timestamps: ttsResult.word_timestamps,
            audio_duration_ms: ttsResult.audio_duration_ms,
            hook: editHook,
            cta: editCta,
          }),
        });
        if (timingRes.ok) {
          const timingData = await timingRes.json();
          sceneTiming = Array.isArray(timingData) ? timingData : timingData.scene_timings ?? timingData.timings ?? timingData.segments ?? null;

        }
      }
    } catch (err) {

    }

    // ── Build segments ──
    const segments = editScenes
      .map((s, i) => {
        let dur: number;
        if (sceneTiming && sceneTiming[i + (editHook ? 1 : 0)]) {
          const t = sceneTiming[i + (editHook ? 1 : 0)];
          dur = Math.min(12, Math.max(2, Math.ceil(t.endSec - t.startSec)));
        } else {
          const words = (s.text || "").split(/\s+/).filter(Boolean).length;
          const estimated = Math.ceil(words / 2.5) + 2;
          dur = Math.min(10, Math.max(5, estimated));
        }
        return { index: i, image_url: sceneImageUrls[i], motion_prompt: s.motion_prompt || "", duration: dur };
      })
      .filter((seg) => seg.image_url);

    const hookTiming = editHook && sceneTiming?.[0];
    const hookDur = hookTiming ? Math.min(12, Math.max(2, Math.ceil(hookTiming.endSec - hookTiming.startSec))) : 5;
    const ctaTiming = editCta && sceneTiming?.[sceneTiming.length - 1];
    const ctaDur = ctaTiming ? Math.min(12, Math.max(2, Math.ceil(ctaTiming.endSec - ctaTiming.startSec))) : 5;

    if (hookImageUrl) segments.unshift({ index: -1, image_url: hookImageUrl, motion_prompt: editHookMotionPrompt || "slow atmospheric zoom in", duration: hookDur });
    if (ctaImageUrl) segments.push({ index: -2, image_url: ctaImageUrl, motion_prompt: editCtaMotionPrompt || "gentle zoom out", duration: ctaDur });

    if (segments.length === 0) { setAnimating(false); return; }

    startAnimationJob(segments, false);
  }, [editScenes, editHook, editCta, sceneImageUrls, hookImageUrl, ctaImageUrl, editHookMotionPrompt, editCtaMotionPrompt, startAnimationJob, scriptData, selectedVoice, speed, cachedTtsResult, cachedScriptHash]);

  const handleRetryAnimation = useCallback((sceneIndex: number) => {
    const imgUrl = sceneIndex === -1 ? hookImageUrl : sceneIndex === -2 ? ctaImageUrl : sceneImageUrls[sceneIndex];
    if (!imgUrl) return;

    const motionPrompt = sceneIndex === -1 ? (editHookMotionPrompt || "slow atmospheric zoom in") : sceneIndex === -2 ? (editCtaMotionPrompt || "gentle zoom out") : (editScenes[sceneIndex]?.motion_prompt || "");
    const words = sceneIndex >= 0 ? (editScenes[sceneIndex]?.text || "").split(/\s+/).filter(Boolean).length : 0;
    const dur = sceneIndex >= 0 ? Math.min(10, Math.max(5, Math.ceil(words / 2.5) + 2)) : 5;

    setAnimationStatus((prev) => ({ ...prev, [sceneIndex]: { status: "uploading", video_url: null, error: null } }));
    startAnimationJob([{ index: sceneIndex, image_url: imgUrl, motion_prompt: motionPrompt, duration: dur }], true);
  }, [sceneImageUrls, hookImageUrl, ctaImageUrl, editScenes, editHookMotionPrompt, editCtaMotionPrompt, startAnimationJob]);

  // ── Preview video ──
  const handlePreviewVideo = async () => {
    if (!scriptData) return;
    setPrepareError(null);

    try {
      const fullScript = editScenes.map((s) => s.text).join(" ");
      const aiStorySettings = buildAiStorySettings();
      const title = editHook || scriptData.hook || "Skeleton Video";

      const jobId = `prepare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const thumbnailUrl = [hookImageUrl, ...sceneImageUrls].find(
        (url) => typeof url === "string" && url.startsWith("https://") && !url.endsWith(".mp4") && !url.endsWith(".webm")
      ) || null;
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
          ...(thumbnailUrl && { thumbnailUrl }),
        }),
      });

      if (!libRes.ok) throw new Error("Failed to create library item");
      const { item: libItem } = await libRes.json();

      const resolvedSceneUrls = sceneImageUrls.map((imgUrl, i) => {
        const animVideo = animationStatus[i]?.video_url;
        return sceneMode === "animated" && animVideo ? animVideo : imgUrl;
      });
      const resolvedHookUrl = sceneMode === "animated" && animationStatus[-1]?.video_url ? animationStatus[-1].video_url : hookImageUrl;
      const resolvedCtaUrl = sceneMode === "animated" && animationStatus[-2]?.video_url ? animationStatus[-2].video_url : ctaImageUrl;
      const allImageUrls: (string | null)[] = [
        ...(scriptData?.hook_image_prompt ? [resolvedHookUrl] : []),
        ...resolvedSceneUrls,
        ...(scriptData?.cta_image_prompt ? [resolvedCtaUrl] : []),
      ];
      const validImageUrls = allImageUrls.filter(
        (url): url is string => typeof url === "string" && url.startsWith("https://")
      );

      triggerPrepareAssets({
        title,
        script: fullScript,
        libraryItemId: libItem.id,
        ...(validImageUrls.length > 0 && { preGeneratedImageUrls: validImageUrls }),
        ...(cachedTtsResult?.audio_r2_url && { preGeneratedAudioUrl: cachedTtsResult.audio_r2_url }),
        settings: {
          voice: selectedVoice?.fishAudioId || defaultVoice.fishAudioId,
          speed,
          backgroundMode: "AI Images",
          aiStory: aiStorySettings,
        },
      }).catch((err) => {
        console.error("Failed to trigger prepare-assets:", err);
      });

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

        {prepareError && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-medium">
            {prepareError}
          </div>
        )}

        {/* Hook card */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">Hook</span>
          </div>
          <div className="flex gap-4">
            {scriptData?.hook_image_prompt && (
              <div className="relative w-[200px] h-[267px] flex-shrink-0 rounded-[12px] overflow-hidden bg-zinc-100">
                {animationStatus[-1]?.status === "done" && animationStatus[-1]?.video_url ? (
                  <video src={animationStatus[-1].video_url!} autoPlay loop muted controls className="w-full h-full object-cover" />
                ) : hookImageStatus === "loading" || regeneratingHook ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-50 to-slate-50">
                    <div className="w-8 h-8 border-3 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
                  </div>
                ) : hookImageStatus === "done" && hookImageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hookImageUrl} alt="Hook" className="w-full h-full object-cover" />
                    {(animationStatus[-1]?.status === "uploading" || animationStatus[-1]?.status === "animating") && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                        <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span className="text-[10px] text-white font-medium">Animating…</span>
                      </div>
                    )}
                    {animationStatus[-1]?.status === "failed" && (
                      <button onClick={(e) => { e.stopPropagation(); handleRetryAnimation(-1); }} className="absolute top-1.5 right-1.5 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/90 hover:bg-red-600 transition-colors" title="Retry animation">
                        <span className="material-symbols-outlined text-white text-sm">refresh</span>
                        <span className="text-[10px] text-white font-bold">Retry</span>
                      </button>
                    )}
                    <button onClick={() => handleRegenerateHookOrCta("hook")} className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors" title="Regenerate hook image">
                      <span className="material-symbols-outlined text-white text-sm">refresh</span>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 gap-1">
                    <button onClick={() => handleRegenerateHookOrCta("hook")} className="w-10 h-10 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-zinc-500 text-xl">refresh</span>
                    </button>
                    <span className="text-[10px] text-zinc-400">Retry</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">Hook text</label>
                <textarea value={editHook} onChange={(e) => setEditHook(e.target.value)} rows={3} className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface font-body text-sm resize-none" />
              </div>
              {scriptData?.hook_image_prompt && (
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">
                    Visual prompt
                    <span className="font-normal normal-case tracking-normal ml-1 text-on-surface-variant/50">— describes what AI generates for the hook</span>
                  </label>
                  <textarea value={editHookImagePrompt} onChange={(e) => setEditHookImagePrompt(e.target.value)} rows={2} className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface-variant font-body text-sm resize-none" />
                </div>
              )}
              {sceneMode === "animated" && (
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">
                    Motion prompt
                    <span className="font-normal normal-case tracking-normal ml-1 text-on-surface-variant/50">— camera movement and animation for the hook</span>
                  </label>
                  <textarea value={editHookMotionPrompt} onChange={(e) => setEditHookMotionPrompt(e.target.value)} rows={2} className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface-variant font-body text-sm resize-none" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scene cards */}
        <div className="space-y-6 mb-8">
          {editScenes.map((scene, i) => {
            const imgUrl = sceneImageUrls[i];
            const imgStatus = sceneImageStatus[i] || "loading";
            const isRegenerating = regeneratingScene === i;
            const anim = animationStatus[i];

            return (
              <div key={i} className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">Scene {i + 1} of {editScenes.length}</span>
                </div>

                <div className="flex gap-4">
                  <div className="relative w-[200px] h-[267px] flex-shrink-0 rounded-[12px] overflow-hidden bg-zinc-100">
                    {anim?.status === "done" && anim.video_url ? (
                      <video src={anim.video_url} autoPlay loop muted controls className="w-full h-full object-cover" />
                    ) : imgStatus === "loading" || isRegenerating ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-50 to-slate-50">
                        <div className="w-8 h-8 border-3 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
                      </div>
                    ) : imgStatus === "done" && imgUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgUrl} alt={`Scene ${i + 1}`} className="w-full h-full object-cover" />
                        {(anim?.status === "uploading" || anim?.status === "animating") && (
                          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                            <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span className="text-[10px] text-white font-medium">Animating…</span>
                          </div>
                        )}
                        {anim?.status === "failed" && (
                          <button onClick={(e) => { e.stopPropagation(); handleRetryAnimation(i); }} className="absolute top-1.5 right-1.5 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/90 hover:bg-red-600 transition-colors" title="Retry animation">
                            <span className="material-symbols-outlined text-white text-sm">refresh</span>
                            <span className="text-[10px] text-white font-bold">Retry</span>
                          </button>
                        )}
                        <button onClick={() => handleRegenerateImage(i)} className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors" title="Regenerate image">
                          <span className="material-symbols-outlined text-white text-sm">refresh</span>
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 gap-1">
                        <button onClick={() => handleRegenerateImage(i)} className="w-10 h-10 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center transition-colors">
                          <span className="material-symbols-outlined text-zinc-500 text-xl">refresh</span>
                        </button>
                        <span className="text-[10px] text-zinc-400">Retry</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <div>
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">Narration</label>
                      <textarea
                        value={scene.text}
                        onChange={(e) => { setEditScenes((prev) => { const next = [...prev]; next[i] = { ...next[i], text: e.target.value }; return next; }); }}
                        rows={3}
                        className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface font-body text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">
                        Visual prompt
                        <span className="font-normal normal-case tracking-normal ml-1 text-on-surface-variant/50">— describes what AI generates for this scene</span>
                      </label>
                      <textarea
                        value={getImagePrompt(scene)}
                        onChange={(e) => { setEditScenes((prev) => { const next = [...prev]; next[i] = { ...next[i], image_prompt: e.target.value }; return next; }); }}
                        rows={2}
                        className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface-variant font-body text-sm resize-none"
                      />
                    </div>
                    {sceneMode === "animated" && (
                      <div>
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">
                          Motion prompt
                          <span className="font-normal normal-case tracking-normal ml-1 text-on-surface-variant/50">— camera movement and animation for this scene</span>
                        </label>
                        <textarea
                          value={scene.motion_prompt || ""}
                          onChange={(e) => { setEditScenes((prev) => { const next = [...prev]; next[i] = { ...next[i], motion_prompt: e.target.value }; return next; }); }}
                          rows={2}
                          className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface-variant font-body text-sm resize-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA card */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 mb-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">CTA</span>
          </div>
          <div className="flex gap-4">
            {scriptData?.cta_image_prompt && (
              <div className="relative w-[200px] h-[267px] flex-shrink-0 rounded-[12px] overflow-hidden bg-zinc-100">
                {animationStatus[-2]?.status === "done" && animationStatus[-2]?.video_url ? (
                  <video src={animationStatus[-2].video_url!} autoPlay loop muted controls className="w-full h-full object-cover" />
                ) : ctaImageStatus === "loading" || regeneratingCta ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-50 to-slate-50">
                    <div className="w-8 h-8 border-3 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
                  </div>
                ) : ctaImageStatus === "done" && ctaImageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ctaImageUrl} alt="CTA" className="w-full h-full object-cover" />
                    {(animationStatus[-2]?.status === "uploading" || animationStatus[-2]?.status === "animating") && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                        <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span className="text-[10px] text-white font-medium">Animating…</span>
                      </div>
                    )}
                    {animationStatus[-2]?.status === "failed" && (
                      <button onClick={(e) => { e.stopPropagation(); handleRetryAnimation(-2); }} className="absolute top-1.5 right-1.5 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/90 hover:bg-red-600 transition-colors" title="Retry animation">
                        <span className="material-symbols-outlined text-white text-sm">refresh</span>
                        <span className="text-[10px] text-white font-bold">Retry</span>
                      </button>
                    )}
                    <button onClick={() => handleRegenerateHookOrCta("cta")} className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors" title="Regenerate CTA image">
                      <span className="material-symbols-outlined text-white text-sm">refresh</span>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 gap-1">
                    <button onClick={() => handleRegenerateHookOrCta("cta")} className="w-10 h-10 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-zinc-500 text-xl">refresh</span>
                    </button>
                    <span className="text-[10px] text-zinc-400">Retry</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">End screen CTA</label>
                <input type="text" value={editCta} onChange={(e) => setEditCta(e.target.value)} className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface font-body text-sm" />
              </div>
              {scriptData?.cta_image_prompt && (
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">
                    Visual prompt
                    <span className="font-normal normal-case tracking-normal ml-1 text-on-surface-variant/50">— describes what AI generates for the CTA</span>
                  </label>
                  <textarea value={editCtaImagePrompt} onChange={(e) => setEditCtaImagePrompt(e.target.value)} rows={2} className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface-variant font-body text-sm resize-none" />
                </div>
              )}
              {sceneMode === "animated" && (
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 block font-headline">
                    Motion prompt
                    <span className="font-normal normal-case tracking-normal ml-1 text-on-surface-variant/50">— camera movement and animation for the CTA</span>
                  </label>
                  <textarea value={editCtaMotionPrompt} onChange={(e) => setEditCtaMotionPrompt(e.target.value)} rows={2} className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 text-on-surface-variant font-body text-sm resize-none" />
                </div>
              )}
            </div>
          </div>
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
            ) : "Regenerate"}
          </button>

          {sceneMode === "animated" && sceneImageStatus.length > 0 && sceneImageStatus.every((s) => s !== "loading") && (
            <button
              onClick={handleAnimateScenes}
              disabled={animating || Object.values(animationStatus).length > 0 && Object.values(animationStatus).every((s) => s.status === "done")}
              className="flex-1 max-w-md py-4 rounded-xl text-base font-bold font-headline flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 bg-secondary-container text-on-secondary-container shadow-secondary-container/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {animating ? (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Animating… {Object.values(animationStatus).filter((s) => s.status === "done").length}/{editScenes.length}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  Animate Scenes
                </span>
              )}
            </button>
          )}

          <button
            onClick={handlePreviewVideo}
            disabled={sceneMode === "animated" && (animating || !Object.values(animationStatus).some((s) => s.status === "done"))}
            className="flex-1 max-w-md py-4 rounded-xl text-base font-bold font-headline flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 bg-primary text-on-primary shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview video
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          </button>
        </footer>

        <VoicePickerModal open={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} onSelect={handleVoiceSelect} currentVoiceId={selectedVoice?.fishAudioId || defaultVoice.fishAudioId} />
      </main>
    );
  }

  // ── STEP 0: Setup ──
  return (
    <main className="min-h-screen bg-surface pb-48 px-6 max-w-4xl mx-auto pt-8">
      <Link
        href="/create/video-styles"
        className="mb-6 inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-1">
          Skeleton videos
        </h1>
        <p className="text-on-surface-variant text-sm">
          3D X-ray skeleton explainers trending on TikTok, Reels, and Shorts
        </p>
      </div>

      <StepPills current={0} />

      {/* ── Skeleton Style Picker ── */}
      <section className="mb-10">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 block font-headline">Skeleton Style</label>
        <div className="grid grid-cols-3 gap-4">
          {skeletonStyleOptions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSkeletonStyle(s.id)}
              className={`relative rounded-2xl overflow-hidden border-2 transition-all ${skeletonStyle === s.id ? "border-primary ring-2 ring-primary/30 scale-[1.02]" : "border-outline-variant/20 hover:border-outline-variant/50"}`}
            >
              <img src={s.thumbnail} alt={s.label} className="w-full h-auto object-contain" />
              <span className={`absolute bottom-0 inset-x-0 text-center text-sm font-bold py-2 ${skeletonStyle === s.id ? "bg-primary text-on-primary" : "bg-black/60 text-white"}`}>{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Niche Input ── */}
      <section className="mb-10">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">
          Your niche
        </label>
        <input
          type="text"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. fitness, health, science, food, energy drinks..."
          className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body text-sm"
        />
      </section>

      {/* ── Script Source (accordion) ── */}
      <section className="mb-10">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 block font-headline">
          Script source
        </label>
        <div className="space-y-2">
          {scriptModes.map((mode) => {
            const isActive = scriptMode === mode.id;
            return (
              <div key={mode.id}>
                <button
                  onClick={() => setScriptMode(mode.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${
                    isActive
                      ? "bg-primary/5 border-2 border-primary"
                      : "bg-surface-container-lowest border border-outline-variant/20 hover:border-outline-variant"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg text-primary">{mode.icon}</span>
                  <div className="flex-grow">
                    <span className="text-sm font-bold font-headline text-on-surface block">{mode.label}</span>
                    <span className="text-xs text-on-surface-variant">{mode.description}</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    {isActive ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {/* Accordion content */}
                {isActive && mode.id === "topic" && (
                  <div className="mt-2 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                    {/* Tab pills */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => { setTopicTab("viral"); setSuggestedTopics([]); setSelectedTopic(""); }}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${topicTab === "viral" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-highest"}`}
                      >
                        Viral Ideas
                      </button>
                      <button
                        onClick={() => { setTopicTab("proven"); setSuggestedTopics([]); setSelectedTopic(""); }}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${topicTab === "proven" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-highest"}`}
                      >
                        Proven Winners
                      </button>
                    </div>

                    {/* Viral Ideas tab */}
                    {topicTab === "viral" && (
                      <>
                        <button
                          onClick={() => fetchTopics("viral")}
                          disabled={loadingTopics}
                          className="w-full mb-4 py-3 rounded-xl bg-secondary-container text-on-secondary-container font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingTopics ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                              Generating viral ideas...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                              Generate 10 viral ideas
                            </>
                          )}
                        </button>

                        {loadingTopics ? (
                          <div className="flex items-center gap-2 py-4">
                            <span className="material-symbols-outlined animate-spin text-primary text-sm">progress_activity</span>
                            <span className="text-xs text-on-surface-variant">Generating viral ideas...</span>
                          </div>
                        ) : suggestedTopics.length > 0 ? (
                          <div className="flex flex-col gap-2 mb-3">
                            {suggestedTopics.map((t) => (
                              <button
                                key={t}
                                onClick={() => { setSelectedTopic(t); setCustomTopic(""); }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                  selectedTopic === t && !customTopic
                                    ? "bg-primary text-on-primary"
                                    : "bg-surface-container-lowest border border-outline-variant/20 text-on-surface hover:border-outline-variant"
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}

                    {/* Proven Winners tab */}
                    {topicTab === "proven" && (
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {provenFormats.map((f) => {
                            const isSelected = selectedFormat === f.id;
                            return (
                              <button
                                key={f.id}
                                onClick={() => setSelectedFormat(isSelected ? null : f.id)}
                                className={`group relative flex flex-col p-4 rounded-2xl text-left transition-all active:scale-[0.98] ${
                                  isSelected
                                    ? "border-2 border-primary bg-surface-container-lowest shadow-[0px_20px_40px_rgba(111,51,213,0.12)]"
                                    : "border border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant"
                                }`}
                              >
                                <div className={`w-9 h-9 mb-3 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary-container/20 text-primary" : "bg-surface-container-low text-on-surface-variant group-hover:bg-primary-container/10 group-hover:text-primary transition-colors"}`}>
                                  <span className="material-symbols-outlined text-xl" style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}>{f.icon}</span>
                                </div>
                                <h3 className="font-bold text-sm font-headline text-on-surface mb-0.5">{f.label}</h3>
                                <p className="text-xs text-on-surface-variant italic leading-relaxed">{f.description}</p>
                                {isSelected ? (
                                  <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[14px] text-white font-bold">check</span>
                                  </div>
                                ) : (
                                  <span className="absolute top-2.5 right-2.5 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-bold">{f.tier}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => selectedFormat && fetchTopics("proven", selectedFormat)}
                          disabled={loadingTopics || !selectedFormat}
                          className="w-full mb-4 py-3 rounded-xl bg-secondary-container text-on-secondary-container font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingTopics ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                              Generating proven ideas...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                              Generate 10 proven ideas
                            </>
                          )}
                        </button>

                        {loadingTopics ? (
                          <div className="flex items-center gap-2 py-4">
                            <span className="material-symbols-outlined animate-spin text-primary text-sm">progress_activity</span>
                            <span className="text-xs text-on-surface-variant">Generating proven ideas...</span>
                          </div>
                        ) : suggestedTopics.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {suggestedTopics.map((t) => (
                              <button
                                key={t}
                                onClick={() => { setSelectedTopic(t); setCustomTopic(""); }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                  selectedTopic === t && !customTopic
                                    ? "bg-primary text-on-primary"
                                    : "bg-surface-container-lowest border border-outline-variant/20 text-on-surface hover:border-outline-variant"
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}

                    <input
                      type="text"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="Or type your own topic..."
                      className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                )}

                {isActive && mode.id === "script" && (
                  <div className="mt-2 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                    <p className="text-xs text-on-surface-variant mb-2">Paste your narration script directly.</p>
                    <textarea
                      value={pastedScript}
                      onChange={(e) => setPastedScript(e.target.value)}
                      rows={8}
                      placeholder="Paste your narration text here..."
                      className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/40 resize-none"
                    />
                  </div>
                )}

                {isActive && mode.id === "upload" && (
                  <div className="mt-2 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                    <label
                      className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                        isDragging
                          ? "border-primary bg-primary/10"
                          : "border-outline-variant/40 hover:border-primary/40 hover:bg-primary/5"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); validateAndSetFile(e.dataTransfer.files?.[0] || null); }}
                    >
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant">cloud_upload</span>
                      <span className="text-sm text-on-surface-variant font-medium">
                        {uploadFile ? uploadFile.name : "Click to upload or drag and drop"}
                      </span>
                      <span className="text-xs text-on-surface-variant/60">PDF, DOCX, TXT, or MD · max 25MB</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => validateAndSetFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    {uploadError && (
                      <p className="mt-3 text-sm text-red-500 font-medium">{uploadError}</p>
                    )}
                  </div>
                )}

                {isActive && mode.id === "prompt" && (
                  <div className="mt-2 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      rows={5}
                      placeholder="Write your own prompt for the skeleton video..."
                      className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/40 resize-none"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Scene Mode ── */}
      <section className="mb-10">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 block font-headline">
          Scene mode
        </label>
        <p className="text-xs text-on-surface-variant/70 mb-3">How your scenes look and feel</p>

        <div className="grid grid-cols-2 gap-3">
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
              <p className="text-xs text-on-surface-variant leading-relaxed">AI images with smooth Ken Burns zoom and pan</p>
            </div>
          </button>

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
              <p className="text-xs text-on-surface-variant leading-relaxed">Each scene becomes a 3-5s AI animated clip</p>
            </div>
          </button>
        </div>
      </section>

      {/* ── Caption Style ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-headline">Caption style</label>
          <button
            onClick={() => setCaptionsEnabled((prev) => !prev)}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${captionsEnabled ? "bg-primary" : "bg-outline-variant/40"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${captionsEnabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
          </button>
        </div>

        {!captionsEnabled ? (
          <p className="text-xs text-on-surface-variant/60 italic">Captions are disabled. Your video will have no text overlay.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {captionStyles.map((cs) => {
                const isSelected = captionStyle === cs.id;
                return (
                  <button
                    key={cs.id}
                    onClick={() => setCaptionStyle(cs.id)}
                    className={`rounded-xl overflow-hidden transition-all border ${isSelected ? "border-2 border-primary" : "border-outline-variant/30 hover:border-outline-variant"}`}
                  >
                    <div className="h-20 bg-[#1a1a1a] flex items-center justify-center px-3" style={cs.containerStyle}>
                      <span style={cs.baseStyle}>Sample{" "}<span style={{ ...cs.baseStyle, ...cs.activeStyle }}>text</span></span>
                    </div>
                    <div className={`py-2 text-center text-[11px] font-bold font-headline ${isSelected ? "text-primary" : "text-on-surface-variant"}`}>{cs.label}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">Font size</label>
                <div className="flex gap-2">
                  {(["small", "medium", "large"] as const).map((size) => (
                    <button key={size} onClick={() => setCaptionFontSize(size)} className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize transition-all ${captionFontSize === size ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-highest"}`}>{size}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">Text transform</label>
                <div className="flex flex-wrap gap-2">
                  {([{ id: "normal", label: "Normal" }, { id: "uppercase", label: "UPPERCASE" }, { id: "capitalize", label: "Capitalize" }, { id: "lowercase", label: "lowercase" }] as const).map((opt) => (
                    <button key={opt.id} onClick={() => setCaptionTransform(opt.id)} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${captionTransform === opt.id ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-highest"}`}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">Position</label>
                <div className="flex flex-wrap gap-2">
                  {([{ id: "top", label: "Top" }, { id: "middle", label: "Middle" }, { id: "bottom", label: "Bottom" }] as const).map((opt) => (
                    <button key={opt.id} onClick={() => setCaptionPosition(opt.id)} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${captionPosition === opt.id ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-highest"}`}>{opt.label}</button>
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
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-headline">Background music</label>
          <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold">Optional</span>
        </div>

        <div className="space-y-2">
          {musicTracks.map((track) => {
            const isSelected = music === track.id;
            const isPlaying = playingTrackId === track.id;
            return (
              <div
                key={track.id}
                onClick={() => setMusic(track.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left cursor-pointer ${isSelected ? "bg-primary/5 border-2 border-primary" : "bg-surface-container-lowest border border-outline-variant/20 hover:border-outline-variant"}`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${track.gradient} flex-shrink-0`} />
                <div className="flex-grow min-w-0">
                  <span className="text-sm font-bold font-headline text-on-surface block">{track.name}</span>
                  <span className="text-xs text-on-surface-variant">{track.description}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); if (isPlaying) { stopPreview(); } else { playPreview(track); } }}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-on-surface-variant text-xl">{isPlaying ? "pause_circle" : "play_circle"}</span>
                </button>
              </div>
            );
          })}

          <button
            onClick={() => setMusic(null)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${music === null ? "bg-primary/5 border-2 border-primary" : "bg-surface-container-lowest border border-outline-variant/20 hover:border-outline-variant"}`}
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">music_off</span>
            </div>
            <span className="text-sm font-bold font-headline text-on-surface">No music</span>
          </button>
        </div>
      </section>

      {/* ── Creative Settings ── */}
      <section className="mb-10">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 block font-headline">Creative settings</label>
        <p className="text-xs text-on-surface-variant/70 mb-3">Using your defaults. Tap any to change.</p>

        <div className="flex flex-wrap gap-3 items-start">
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold font-headline text-sm transition-all bg-surface-container text-on-surface hover:bg-surface-container-highest"
          >
            <span className="material-symbols-outlined text-base">mic</span>
            <span>{selectedVoice ? selectedVoice.name : "Male voice"}</span>
            <span className="material-symbols-outlined text-base">expand_more</span>
          </button>

          <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-surface-container">
            <span className="material-symbols-outlined text-base text-on-surface">speed</span>
            <span className="font-bold font-headline text-sm text-on-surface whitespace-nowrap">Speed: {speed.toFixed(1)}x</span>
            <input type="range" min={0.5} max={2.0} step={0.1} value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-28 h-1.5 rounded-full appearance-none cursor-pointer bg-outline-variant/30 accent-primary" />
          </div>

          <div className="relative" ref={durationPopRef}>
            <button
              onClick={() => setDurationPopoverOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold font-headline text-sm transition-all ${durationPopoverOpen ? "bg-secondary-container text-on-secondary-container ring-2 ring-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-highest"}`}
            >
              <span className="material-symbols-outlined text-base">timer</span>
              <span>{duration} seconds</span>
              <span className="material-symbols-outlined text-base">{durationPopoverOpen ? "expand_less" : "expand_more"}</span>
            </button>

            {durationPopoverOpen && (
              <div className="absolute top-full left-0 mt-2 bg-surface-container-lowest rounded-2xl shadow-[0px_30px_60px_rgba(111,51,213,0.15)] border border-outline-variant/15 p-4 z-40 min-w-[200px]">
                <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 font-headline">Duration</div>
                <div className="flex flex-wrap gap-2">
                  {durations.map((d) => (
                    <button key={d.value} onClick={() => { setDuration(d.value); setDurationPopoverOpen(false); }} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${duration === d.value ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"}`}>{d.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tone pills */}
        <div className="mt-4">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">Tone</label>
          <div className="flex flex-wrap gap-2">
            {toneOptions.map((t) => (
              <button key={t.id} onClick={() => setTone(t.id)} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${tone === t.id ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-highest"}`}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Video language */}
        <div className="mt-4">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">Video language</label>
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen((prev) => !prev)}
              className="w-full flex items-center justify-between bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3.5 text-sm font-body text-on-surface hover:border-outline-variant transition-all"
            >
              <span>{videoLanguage}</span>
              <span className="material-symbols-outlined text-on-surface-variant text-base">{langOpen ? "expand_less" : "expand_more"}</span>
            </button>

            {langOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest rounded-xl shadow-[0px_30px_60px_rgba(0,0,0,0.12)] border border-outline-variant/15 z-50 max-h-60 overflow-y-auto">
                {videoLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { setVideoLanguage(lang); setLangOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors ${videoLanguage === lang ? "bg-primary/5 text-primary font-semibold" : "text-on-surface hover:bg-surface-container-low"}`}
                  >
                    <span>{lang}</span>
                    {videoLanguage === lang && <span className="material-symbols-outlined text-primary text-sm">check</span>}
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
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-headline">Effects</label>
          <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold">Optional</span>
        </div>

        <div className="space-y-3">
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
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${filmGrain ? "bg-primary" : "bg-outline-variant/40"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${filmGrain ? "translate-x-[22px]" : "translate-x-0.5"}`} />
            </button>
          </div>

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
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${shake ? "bg-primary" : "bg-outline-variant/40"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${shake ? "translate-x-[22px]" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ── End Screen CTA ── */}
      <section className="mb-10">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">End screen CTA</label>
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
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </>
          )}
        </button>
      </footer>

      <VoicePickerModal open={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} onSelect={handleVoiceSelect} currentVoiceId={selectedVoice?.fishAudioId || defaultVoice.fishAudioId} />
    </main>
  );
}
