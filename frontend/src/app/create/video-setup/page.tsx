"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { triggerVideoRenders } from "@/app/actions/create-videos";
import { defaultVoice } from "@/lib/voices";
import type { Voice } from "@/lib/voices";
import VoicePickerModal from "@/components/create/VoicePickerModal";
import CharacterPickerModal from "@/components/create/CharacterPickerModal";
import AIStorySetup from "@/components/create/AIStorySetup";
import { ART_STYLES as artStyles, type ArtStyle, artPreviewSrc } from "@/lib/artStyles";

// ── Characters ──

const characters = [
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
];

// ── Video templates ──

const videoTemplates = [
  { name: "Viral Ideas", icon: "trending_up", example: "AI picks the best viral topics for your niche", badge: "Popular" },
  { name: "Did You Know", icon: "lightbulb", example: '"Octopuses have 3 hearts"' },
  { name: "Myth Buster", icon: "verified", example: '"Knuckle cracking is harmless"' },
  { name: "X vs Y", icon: "compare_arrows", example: '"Coffee vs Green Tea"' },
  { name: "Story Time", icon: "auto_stories", example: '"The man who vanished with $200K"' },
  { name: "Top 5", icon: "format_list_numbered", example: '"5 foods killing your gut"' },
  { name: "How-To", icon: "construction", example: '"Fall asleep in 2 minutes"' },
  { name: "Hot Take", icon: "bolt", example: '"Stretching is useless"' },
  { name: "What Happens If", icon: "quiz", example: '"No sugar for 30 days"' },
  { name: "Before & After", icon: "swap_horiz", example: '"30 days without sugar"' },
  { name: "Problem \u2192 Solution", icon: "healing", example: '"Stop stretching cold muscles"' },
  { name: "Ranking / Tier List", icon: "emoji_events", example: '"Rating every protein source"' },
  { name: "Mini Series", icon: "library_books", example: '"Part 1: Why planes dim lights"' },
];

// ── Tones ──

const tones = [
  { label: "Regular", emoji: "\u{1F642}" },
  { label: "Funny", emoji: "\u{1F604}" },
  { label: "Serious", emoji: "\u{1F3AF}" },
  { label: "Cursing", emoji: "\u{1F92C}" },
  { label: "Edgy", emoji: "\u{1F525}" },
  { label: "Motivational", emoji: "\u{1F4AA}" },
  { label: "Storytelling", emoji: "\u{1F4D6}" },
  { label: "Sarcastic", emoji: "\u{1F644}" },
  { label: "Shocked", emoji: "\u{1F92F}" },
  { label: "Conspiracy", emoji: "\u{1F575}\uFE0F" },
  { label: "Friendly", emoji: "\u2615" },
];

// ── Background mode options ──

const backgroundModes = [
  { label: "Smart Mix", emoji: "\u2728", desc: "AI picks the best visuals for each moment" },
  { label: "Stock Footage", emoji: "\u{1F4F9}", desc: "Real video clips from Pexels" },
  { label: "AI Images", emoji: "\u{1F3A8}", desc: "Custom AI-generated images" },
  { label: "Animated AI", emoji: "\u{1F3AC}", desc: "AI images with motion" },
  { label: "Motion Graphics", emoji: "\u2728", icon: "animation", desc: "Animated data visualizations and graphics" },
  { label: "Green Screen", emoji: "🟢", desc: "Solid green background for chroma key removal in your own editor" },
];

// ── Art styles ──

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
  "Auto Detect", "English", "Chinese", "Japanese", "German", "French",
  "Spanish", "Korean", "Portuguese",
];

// ── Script creation modes ──

const scriptModes = [
  { id: "template", name: "Pick a template", icon: "dashboard", desc: "Choose from proven viral formats" },
  { id: "paste", name: "Paste your own script", icon: "content_paste", desc: "Already have a script ready" },
  { id: "upload", name: "Upload content", icon: "upload_file", desc: "Upload a file as source material" },
  { id: "revoice", name: "Revoice a video", icon: "graphic_eq", desc: "Upload a video, character reads it in their voice" },
  { id: "prompt", name: "Write your own prompt", icon: "draw", desc: "Tell AI exactly what to make" },
] as const;

type ScriptMode = typeof scriptModes[number]["id"];

// ── Interfaces ──

interface VideoIdea {
  title: string;
  tag: string;
}

interface Script {
  title: string;
  script: string;
}

// ── Step dots ──

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i === current
              ? "w-8 bg-primary"
              : i < current
                ? "w-2 bg-primary/40"
                : "w-2 bg-outline-variant/30"
          }`}
        />
      ))}
    </div>
  );
}

// ── Main content ──

function VideoSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const style = searchParams.get("style") || "character";

  // ── Route to AI Story setup if style=ai-story ──
  if (style === "ai-story") {
    return <AIStorySetup />;
  }

  // ── Step: 0 = setup, 1 = review scripts, 2 = creating ──
  const [step, setStep] = useState(0);

  // ── Creative settings ──
  const [selectedCharacter, setSelectedCharacter] = useState(characters[0]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState(1.0);
  const [backgroundMode, setBackgroundMode] = useState("Smart Mix");
  const [artStyle, setArtStyle] = useState("realism");
  const [characterModalOpen, setCharacterModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [bgModeOpen, setBgModeOpen] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const speedRef = useRef<HTMLDivElement>(null);
  const bgModeRef = useRef<HTMLDivElement>(null);
  const toneRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<HTMLDivElement>(null);
  const ideasRef = useRef<HTMLDivElement>(null);

  // ── Script creation mode ──
  const [activeMode, setActiveMode] = useState<ScriptMode | null>(null);

  // ── Template mode state ──
  const [niche, setNiche] = useState("health and wellness");
  const [tone, setTone] = useState("Funny");
  const [duration, setDuration] = useState("30s");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // ── Idea generation ──
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [showIdeas, setShowIdeas] = useState(false);

  // ── Other mode inputs ──
  const [pastedScript, setPastedScript] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExtracting, setUploadExtracting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // ── Revoice mode state ──
  const [revoiceFile, setRevoiceFile] = useState<File | null>(null);
  const [revoiceTranscribing, setRevoiceTranscribing] = useState(false);
  const [revoiceTranscript, setRevoiceTranscript] = useState("");
  const [revoiceKeepOriginal, setRevoiceKeepOriginal] = useState(false);
  const [revoiceError, setRevoiceError] = useState<string | null>(null);
  const [revoiceIsDragging, setRevoiceIsDragging] = useState(false);
  const [revoiceVideoUrl, setRevoiceVideoUrl] = useState<string>("");
  const [revoiceBlurSubtitles, setRevoiceBlurSubtitles] = useState<boolean>(true);

  const validateAndSetRevoiceFile = async (file: File | null) => {
    if (!file) { setRevoiceFile(null); return; }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["mp4", "mov", "webm"].includes(ext)) {
      setRevoiceError("Unsupported file type. Use MP4, MOV, or WEBM.");
      setRevoiceFile(null);
      return;
    }
    if (file.size > 300 * 1024 * 1024) {
      setRevoiceError("File is too large. Max 300MB.");
      setRevoiceFile(null);
      return;
    }
    setRevoiceError(null);
    setRevoiceFile(file);
    setRevoiceTranscript("");
    setRevoiceTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const res = await fetch("/api/revoice/transcribe", { method: "POST", body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setRevoiceError(errData.error || "Failed to transcribe video");
        return;
      }
      const data = await res.json();
      if (data.transcript) {
        setRevoiceTranscript(data.transcript);
        setRevoiceVideoUrl(data.video_url || "");
      } else {
        setRevoiceError("No speech detected in video");
      }
    } catch {
      setRevoiceError("Something went wrong. Try again.");
    } finally {
      setRevoiceTranscribing(false);
    }
  };

  const [customPrompt, setCustomPrompt] = useState("");

  // ── Script review state ──
  const [scripts, setScripts] = useState<Script[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // ── Creating state ──
  const [creating, setCreating] = useState(false);

  // ── Creative settings (captions, music, effects) ──
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState("regular");
  const [captionFontSize, setCaptionFontSize] = useState<"small" | "medium" | "large">("medium");
  const [captionTransform, setCaptionTransform] = useState<"normal" | "uppercase" | "capitalize" | "lowercase">("uppercase");
  const [captionPosition, setCaptionPosition] = useState<"top" | "middle" | "bottom">("bottom");
  const [music, setMusic] = useState<string | null>(null);
  const [videoLanguage, setVideoLanguage] = useState("Auto Detect");
  const [filmGrain, setFilmGrain] = useState(false);
  const [shake, setShake] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (speedRef.current && !speedRef.current.contains(e.target as Node)) {
        setSpeedOpen(false);
      }
      if (bgModeRef.current && !bgModeRef.current.contains(e.target as Node)) {
        setBgModeOpen(false);
      }
      if (toneRef.current && !toneRef.current.contains(e.target as Node)) {
        setToneOpen(false);
      }
      if (durationRef.current && !durationRef.current.contains(e.target as Node)) {
        setDurationOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Music preview ──
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

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  // ── Handlers ──

  const handleVoiceSelect = (voice: Voice) => {
    setSelectedVoice(voice);
    fetch("/api/user/defaults", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultVoiceId: voice.fishAudioId }),
    }).catch(() => {});
  };

  const handleCharacterSelect = (char: typeof characters[number]) => {
    setSelectedCharacter(char);
  };

  const toggleMode = (mode: ScriptMode) => {
    setActiveMode((prev) => (prev === mode ? null : mode));
  };

  const fetchIdeas = useCallback(async () => {
    setIdeasLoading(true);
    setIdeas([]);
    setSelectedIdeas(new Set());
    setShowIdeas(true);
    setIdeasError(null);
    ideasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const res = await fetch("/api/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: selectedTemplate || "Did You Know",
          niche,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `API returned ${res.status}`);
      }
      const data = await res.json();
      if (data.ideas && data.ideas.length > 0) {
        setIdeas(data.ideas);
      } else {
        setIdeasError("No ideas returned. Try a different niche or template");
      }
    } catch (err) {
      console.error("Failed to fetch ideas:", err);
      setIdeasError(err instanceof Error ? err.message : "Failed to generate ideas");
    } finally {
      setIdeasLoading(false);
    }
  }, [niche, selectedTemplate]);

  const toggleIdea = (index: number) => {
    setSelectedIdeas((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else if (next.size < 5) next.add(index);
      return next;
    });
  };

  const fetchScripts = useCallback(async (ideaTitles: string[], template: string, prompt?: string, overrideDuration?: string) => {
    setScriptsLoading(true);
    setScripts([]);
    setStep(1);

    try {
      const res = await fetch("/api/generate-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          ideas: prompt ? [] : ideaTitles,
          tone,
          duration: overrideDuration ?? duration,
          ...(prompt ? { customPrompt: prompt } : {}),
        }),
      });
      const data = await res.json();
      if (data.scripts) {
        setScripts(data.scripts);
      }
    } catch (err) {
      console.error("Failed to fetch scripts:", err);
    } finally {
      setScriptsLoading(false);
    }
  }, [tone, duration]);

  const regenerateScript = async (index: number) => {
    setRegeneratingIndex(index);
    try {
      const res = await fetch("/api/generate-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: selectedTemplate || "Did You Know",
          ideas: [scripts[index].title],
          tone,
          duration,
        }),
      });
      const data = await res.json();
      if (data.scripts?.[0]) {
        setScripts((prev) => {
          const next = [...prev];
          next[index] = data.scripts[0];
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to regenerate script:", err);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleContinueToScripts = async () => {
    if (activeMode === "template") {
      const selected = Array.from(selectedIdeas).map((i) => ideas[i].title);
      fetchScripts(selected, selectedTemplate || "Did You Know");
    } else if (activeMode === "paste") {
      setScripts([{ title: "My Script", script: pastedScript }]);
      setStep(1);
    } else if (activeMode === "upload" && uploadFile) {
      setUploadError(null);
      setUploadExtracting(true);
      try {
        const formData = new FormData();
        formData.append("file", uploadFile);
        const res = await fetch("/api/extract-content", { method: "POST", body: formData });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setUploadError(errData.error || "Failed to extract content from file");
          return;
        }
        const data = await res.json();
        const prompt = `Write a video script based on this source material:\n\n${data.text}`;
        fetchScripts([], "Upload", prompt);
      } catch (err) {
        console.error("Upload extraction failed:", err);
        setUploadError("Something went wrong. Try again.");
      } finally {
        setUploadExtracting(false);
      }
    } else if (activeMode === "revoice" && revoiceTranscript.trim()) {
      if (revoiceKeepOriginal) {
        setScripts([{ title: "Revoice", script: revoiceTranscript }]);
        setStep(1);
      } else {
        const prompt = `Rewrite the following transcript in the selected tone. CRITICAL: the rewritten script must match the original transcript's length — roughly the same word count, so it takes the same time to speak. Do NOT shorten. Do NOT summarize. Keep every key point from the original.\n\nOriginal transcript:\n${revoiceTranscript}`;
        fetchScripts([], "Revoice", prompt, "90s");
      }
    } else if (activeMode === "prompt") {
      fetchScripts([], "Custom", customPrompt);
    }
  };

  const handleAcceptAndCreate = async () => {
    if (scripts.length === 0) return;

    // Animated AI: redirect to animated character review page
    if (backgroundMode === "Animated AI") {
      sessionStorage.setItem("animated-character-setup", JSON.stringify({
        scripts,
        template: selectedTemplate || "Custom",
        tone,
        character: selectedCharacter.name,
        voice: selectedVoice?.fishAudioId || defaultVoice.fishAudioId,
        duration,
        speed: selectedSpeed,
        backgroundMode,
        artStyle,
      }));
      router.push("/create/animated-character-review");
      return;
    }

    setCreating(true);
    setStep(2);

    console.log("[video-setup] activeMode:", activeMode, "revoiceMode:", activeMode === "revoice", "revoiceVideoUrl:", revoiceVideoUrl);
    try {
      const handles = await triggerVideoRenders(
        scripts.map((s) => ({
          title: s.title,
          script: s.script,
          template: selectedTemplate || "Custom",
          settings: {
            tone,
            presenter: selectedCharacter.name,
            voice: selectedVoice?.fishAudioId || defaultVoice.fishAudioId,
            background: "Stock footage",
            backgroundMode,
            duration,
            layout: "Standard",
            speed: selectedSpeed,
            animate: backgroundMode === "Animated AI",
            ...(backgroundMode === "AI Images" && { artStyle }),
            revoiceMode: activeMode === "revoice",
            revoiceVideoUrl: activeMode === "revoice" ? revoiceVideoUrl : undefined,
            revoiceBlurSubtitles: activeMode === "revoice" ? revoiceBlurSubtitles : undefined,
            captionStyle: captionsEnabled ? captionStyle : null,
            captionFontSize: captionsEnabled ? captionFontSize : null,
            captionTransform: captionsEnabled ? captionTransform : null,
            captionPosition: captionsEnabled ? captionPosition : null,
            music: music ? (musicTracks.find((t) => t.id === music)?.backendFile ?? music) : null,
            language: videoLanguage,
            filmGrain,
            shakeEffect: shake,
          },
        }))
      );

      await Promise.all(
        handles.map(async (h) => {
          const script = scripts.find((s) => s.title === h.title)?.script ?? null;
          await fetch("/api/library", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: h.runId,
              title: h.title,
              format: "video",
              backgroundMode: backgroundMode ?? null,
              script,
              durationSec: parseInt(duration) || null,
              ...(h.directResult && {
                status: h.directResult.status,
                videoUrl: h.directResult.videoUrl ?? null,
                thumbnailUrl: h.directResult.videoUrl ?? null,
              }),
            }),
          });
        })
      );

      sessionStorage.setItem("pending-renders", JSON.stringify(handles));
      sessionStorage.setItem("pending-format", "video");
      router.push("/library");
    } catch (err) {
      console.error("Failed to trigger video renders:", err);
      setCreating(false);
      setStep(1);
    }
  };

  // ── Can proceed? ──
  const canProceed =
    (activeMode === "template" && selectedIdeas.size > 0) ||
    (activeMode === "paste" && pastedScript.trim().length > 0) ||
    (activeMode === "upload" && uploadFile !== null) ||
    (activeMode === "revoice" && revoiceTranscript.trim().length > 0) ||
    (activeMode === "prompt" && customPrompt.trim().length > 0);

  const actionLabel =
    revoiceTranscribing
      ? "Transcribing audio..."
      : uploadExtracting
        ? "Extracting content..."
        : activeMode === "template" && !showIdeas
        ? "Generate viral ideas"
        : activeMode === "template" && showIdeas && selectedIdeas.size > 0
          ? `Continue with ${selectedIdeas.size} idea${selectedIdeas.size !== 1 ? "s" : ""}`
          : "Create video";

  const handleBottomAction = () => {
    if (activeMode === "template" && !showIdeas) {
      fetchIdeas();
    } else if (canProceed) {
      handleContinueToScripts();
    }
  };

  const bottomDisabled =
    uploadExtracting ||
    revoiceTranscribing ||
    (activeMode === "template" && !showIdeas
      ? ideasLoading
      : !canProceed);

  // ── STEP 1: Script review ──
  if (step >= 1) {
    return (
      <main className="min-h-screen bg-surface pt-24 pb-48 px-6 max-w-4xl mx-auto">
        <StepDots current={step >= 2 ? 2 : 1} />

        {/* Back to setup */}
        <button
          onClick={() => { setStep(0); setScripts([]); }}
          className="mb-8 inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to setup
        </button>

        <h1 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-2">
          Review scripts
        </h1>
        <p className="text-on-surface-variant text-sm mb-10">
          Edit, regenerate, or accept your scripts
        </p>

        {/* Loading skeleton */}
        {scriptsLoading && (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-2">
                    <div className="h-4 w-24 shimmer rounded-full" />
                    <div className="h-6 w-64 shimmer rounded-full" />
                  </div>
                  <div className="h-9 w-28 shimmer rounded-full" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-full shimmer rounded-full" />
                  <div className="h-4 w-full shimmer rounded-full" />
                  <div className="h-4 w-3/4 shimmer rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Script cards */}
        {!scriptsLoading && scripts.length > 0 && (
          <div className="space-y-6">
            {scripts.map((s, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">
                      Video {i + 1} of {scripts.length}
                    </span>
                    <h3 className="text-xl font-bold font-headline text-on-surface">
                      {s.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => regenerateScript(i)}
                    disabled={regeneratingIndex === i}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-container-low hover:bg-surface-container-highest text-on-surface-variant text-sm font-semibold rounded-full transition-all active:scale-95 disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-sm ${regeneratingIndex === i ? "animate-spin" : ""}`}>
                      refresh
                    </span>
                    {regeneratingIndex === i ? "Regenerating..." : "Regenerate"}
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    value={s.script}
                    onChange={(e) => {
                      setScripts((prev) => {
                        const next = [...prev];
                        next[i] = { ...next[i], script: e.target.value };
                        return next;
                      });
                    }}
                    className="w-full min-h-[200px] bg-surface text-on-surface-variant font-body leading-relaxed p-6 rounded-xl border-none focus:ring-2 focus:ring-primary/40 resize-none"
                    placeholder="Enter script here..."
                  />
                  <div className="absolute bottom-4 right-4 text-[10px] font-bold text-outline-variant uppercase tracking-tighter">
                    AI Generated
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom bar */}
        {!scriptsLoading && scripts.length > 0 && (
          <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl px-8 py-6 shadow-[0px_-10px_30px_rgba(0,0,0,0.03)] flex justify-center">
            <button
              onClick={handleAcceptAndCreate}
              disabled={creating}
              className={`w-full max-w-xl py-5 rounded-xl text-xl font-bold font-headline flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${
                creating
                  ? "bg-primary/80 text-on-primary cursor-wait"
                  : "bg-primary text-on-primary shadow-primary/30"
              }`}
            >
              {creating ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Launching render jobs...
                </>
              ) : (
                <>
                  Accept and create
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome
                  </span>
                </>
              )}
            </button>
          </footer>
        )}
      </main>
    );
  }

  // ── STEP 0: Setup ──
  return (
    <main className="min-h-screen bg-surface pt-24 pb-48 px-6 max-w-4xl mx-auto">
      <StepDots current={0} />

      {/* Back */}
      <Link
        href="/create/video-styles"
        className="mb-8 inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-2">
          Character video
        </h1>
        <p className="text-on-surface-variant text-sm">
          AI animated character with voice, lip sync, and custom backgrounds
        </p>
      </div>

      {/* ── Your Niche (always visible) ── */}
      <div className="mb-8">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block font-headline">
          Your niche
        </label>
        <input
          type="text"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g., fitness tips, medical facts, personal finance"
          className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body text-sm"
        />
      </div>

      {/* ── Creative Settings ── */}
      <section className="mb-12">
        <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 font-headline">
          Creative Settings
        </h2>
        <div className="flex flex-wrap gap-3 items-start">
          {/* Character pill */}
          <button
            onClick={() => setCharacterModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold font-headline text-sm transition-all bg-surface-container text-on-surface hover:bg-surface-container-highest"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedCharacter.image} alt={selectedCharacter.name} className="w-5 h-5 object-contain" />
            <span>{selectedCharacter.name}</span>
            <span className="material-symbols-outlined text-base">expand_more</span>
          </button>

          {/* Voice pill */}
          <button
            onClick={() => setVoiceModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold font-headline text-sm transition-all bg-surface-container text-on-surface hover:bg-surface-container-highest"
          >
            <span className="material-symbols-outlined text-base">mic</span>
            <span>{selectedVoice ? selectedVoice.name : "Choose Voice"}</span>
            <span className="material-symbols-outlined text-base">expand_more</span>
          </button>

          {/* Speed pill */}
          <div className="relative" ref={speedRef}>
            <button
              onClick={() => setSpeedOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold font-headline text-sm transition-all ${
                speedOpen
                  ? "bg-secondary-container text-on-secondary-container ring-2 ring-primary"
                  : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              <span className="material-symbols-outlined text-base">speed</span>
              <span>{selectedSpeed === 1.0 ? "Normal" : selectedSpeed < 1 ? "Slow" : "Fast"}</span>
              <span className="material-symbols-outlined text-base">
                {speedOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {speedOpen && (
              <div className="absolute top-full left-0 mt-2 bg-surface-container-lowest rounded-2xl shadow-[0px_30px_60px_rgba(111,51,213,0.15)] border border-outline-variant/15 p-6 z-40 min-w-[260px]">
                <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 font-headline">
                  Speed
                </div>
                <div className="space-y-4">
                  <div className="text-center text-2xl font-bold text-on-surface font-headline">
                    {selectedSpeed === 1.0 ? "Normal" : `${selectedSpeed}x`}
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={selectedSpeed}
                    onChange={(e) => setSelectedSpeed(Math.round(parseFloat(e.target.value) * 10) / 10)}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-on-surface-variant font-medium">
                    <span>0.5x</span>
                    <span>1.0x</span>
                    <span>2.0x</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Background mode pill */}
          <div className="relative" ref={bgModeRef}>
            <button
              onClick={() => setBgModeOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold font-headline text-sm transition-all ${
                bgModeOpen
                  ? "bg-secondary-container text-on-secondary-container ring-2 ring-primary"
                  : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              <span>{backgroundModes.find((m) => m.label === backgroundMode)?.emoji || "\u2728"}</span>
              <span>{backgroundMode}</span>
              <span className="material-symbols-outlined text-base">
                {bgModeOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {bgModeOpen && (
              <div className="absolute top-full left-0 mt-2 bg-surface-container-lowest rounded-2xl shadow-[0px_30px_60px_rgba(111,51,213,0.15)] border border-outline-variant/15 p-6 z-40 min-w-[280px]">
                <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 font-headline">
                  Background Mode
                </div>
                <div className="space-y-2">
                  {backgroundModes.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => { setBackgroundMode(opt.label); setBgModeOpen(false); }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
                        backgroundMode === opt.label
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : "bg-surface-container-low hover:bg-surface-container-high"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span>{opt.emoji}</span>
                        <div>
                          <span className="text-sm font-semibold block">{opt.label}</span>
                          <span className="text-xs text-on-surface-variant/60 block">{opt.desc}</span>
                        </div>
                      </div>
                      {backgroundMode === opt.label && (
                        <span className="material-symbols-outlined text-primary text-sm">check</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tone pill */}
          <div className="relative" ref={toneRef}>
            <button
              onClick={() => setToneOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold font-headline text-sm transition-all ${
                toneOpen
                  ? "bg-secondary-container text-on-secondary-container ring-2 ring-primary"
                  : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              <span>{tones.find((t) => t.label === tone)?.emoji || "\u{1F604}"}</span>
              <span>{tone}</span>
              <span className="material-symbols-outlined text-base">
                {toneOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {toneOpen && (
              <div className="absolute top-full left-0 mt-2 bg-surface-container-lowest rounded-2xl shadow-[0px_30px_60px_rgba(111,51,213,0.15)] border border-outline-variant/15 p-6 z-40 min-w-[280px]">
                <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 font-headline">
                  Tone
                </div>
                <div className="flex flex-wrap gap-2">
                  {tones.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => { setTone(t.label); setToneOpen(false); }}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-all ${
                        tone === t.label
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Duration pill */}
          <div className="relative" ref={durationRef}>
            <button
              onClick={() => setDurationOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold font-headline text-sm transition-all ${
                durationOpen
                  ? "bg-secondary-container text-on-secondary-container ring-2 ring-primary"
                  : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              <span className="material-symbols-outlined text-base">timer</span>
              <span>{duration}</span>
              <span className="material-symbols-outlined text-base">
                {durationOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {durationOpen && (
              <div className="absolute top-full left-0 mt-2 bg-surface-container-lowest rounded-2xl shadow-[0px_30px_60px_rgba(111,51,213,0.15)] border border-outline-variant/15 p-6 z-40 min-w-[200px]">
                <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 font-headline">
                  Duration
                </div>
                <div className="flex flex-wrap gap-2">
                  {["15s", "30s", "60s", "90s"].map((d) => (
                    <button
                      key={d}
                      onClick={() => { setDuration(d); setDurationOpen(false); }}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                        duration === d
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
        <p className="mt-4 text-sm text-on-surface-variant">
          Using your defaults &middot; Tap any to change
        </p>

        {/* Art style picker (AI Images / Animated AI only) */}
        {(backgroundMode === "Animated AI" || backgroundMode === "AI Images") && (
          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 font-headline">
              Art Style
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
              {artStyles.map((s) => {
                const isSelected = artStyle === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setArtStyle(s.id)}
                    className={`relative flex-shrink-0 w-[220px] rounded-2xl overflow-hidden transition-all aspect-[3/4] ${
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                        : "hover:opacity-90"
                    }`}
                  >
                    {artPreviewSrc(s.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artPreviewSrc(s.id)!}
                        alt={s.label}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`} />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-6 pb-2 px-1.5">
                      <span className="block text-center text-sm font-bold font-headline truncate text-white">
                        {s.label}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── Script creation modes ── */}
      <section className="mb-12">
        <h2 className="text-lg font-bold font-headline text-on-surface mb-4">
          How do you want to create your script?
        </h2>

        <div className="space-y-3">
          {scriptModes.map((mode) => {
            const isOpen = activeMode === mode.id;

            return (
              <div
                key={mode.id}
                className={`rounded-2xl transition-all overflow-hidden ${
                  isOpen
                    ? "border-2 border-primary bg-surface-container-lowest"
                    : "border border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant"
                }`}
              >
                {/* Card header */}
                <button
                  onClick={() => toggleMode(mode.id)}
                  className="w-full flex items-center gap-4 p-5 text-left"
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${
                      isOpen ? "text-primary" : "text-on-surface-variant"
                    }`}
                    style={isOpen ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {mode.icon}
                  </span>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-bold font-headline text-on-surface">
                      {mode.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant">{mode.desc}</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    {isOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {/* ── Expanded content ── */}
                {isOpen && (
                  <div className="px-5 pb-5">
                    {/* Template mode */}
                    {mode.id === "template" && (
                      <div className="space-y-6">
                        {/* Template grid */}
                        <div>
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 block">
                            Template
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {videoTemplates.map((t) => {
                              const isSelected = selectedTemplate === t.name;
                              return (
                                <button
                                  key={t.name}
                                  onClick={() => setSelectedTemplate(isSelected ? null : t.name)}
                                  className={`group relative flex flex-col p-4 rounded-2xl text-left transition-all active:scale-[0.98] ${
                                    isSelected
                                      ? "border-2 border-primary bg-surface-container-lowest shadow-[0px_20px_40px_rgba(111,51,213,0.12)]"
                                      : "border border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant"
                                  }`}
                                >
                                  <div
                                    className={`w-9 h-9 mb-3 rounded-lg flex items-center justify-center ${
                                      isSelected
                                        ? "bg-primary-container/20 text-primary"
                                        : "bg-surface-container-low text-on-surface-variant group-hover:bg-primary-container/10 group-hover:text-primary transition-colors"
                                    }`}
                                  >
                                    <span
                                      className="material-symbols-outlined text-xl"
                                      style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                    >
                                      {t.icon}
                                    </span>
                                  </div>
                                  <h3 className="font-bold text-sm font-headline text-on-surface mb-0.5">
                                    {t.name}
                                  </h3>
                                  <p className="text-xs text-on-surface-variant italic leading-relaxed">
                                    {t.example}
                                  </p>
                                  {isSelected ? (
                                    <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                      <span className="material-symbols-outlined text-[14px] text-white font-bold">check</span>
                                    </div>
                                  ) : ("badge" in t && t.badge) ? (
                                    <span className="absolute top-2.5 right-2.5 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-bold">
                                      {t.badge}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Ideas list */}
                        {showIdeas && (
                          <div className="mt-4" ref={ideasRef}>
                            <div className="flex items-end justify-between mb-4">
                              <h3 className="text-lg font-bold font-headline text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                {selectedTemplate ? `"${selectedTemplate}" ideas` : "Viral ideas for you"}
                              </h3>
                              <button
                                onClick={fetchIdeas}
                                disabled={ideasLoading}
                                className="flex items-center gap-1.5 text-primary text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
                              >
                                <span className={`material-symbols-outlined text-sm ${ideasLoading ? "animate-spin" : ""}`}>refresh</span>
                                Refresh
                              </button>
                            </div>

                            {/* Error */}
                            {!ideasLoading && ideasError && (
                              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                                {ideasError}
                              </div>
                            )}

                            {/* Loading */}
                            {ideasLoading && (
                              <div className="space-y-2">
                                {Array.from({ length: 6 }).map((_, i) => (
                                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-surface-container-low/50">
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-outline-variant shimmer" />
                                    <div className="flex-grow h-4 shimmer rounded-full" />
                                    <div className="w-14 h-4 shimmer rounded-full" />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Idea list */}
                            {!ideasLoading && ideas.length > 0 && (
                              <>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                                  {ideas.map((idea, i) => {
                                    const isChecked = selectedIdeas.has(i);
                                    return (
                                      <div
                                        key={i}
                                        onClick={() => toggleIdea(i)}
                                        className={`group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                          isChecked
                                            ? "bg-surface-container-lowest border-l-4 border-primary"
                                            : "bg-surface-container-low/50 hover:bg-surface-container-lowest"
                                        }`}
                                      >
                                        <div
                                          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 ${
                                            isChecked
                                              ? "border-primary bg-primary"
                                              : "border-outline-variant group-hover:border-primary"
                                          }`}
                                        >
                                          {isChecked && (
                                            <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                                          )}
                                        </div>
                                        <p className={`flex-grow font-headline text-sm leading-tight ${
                                          isChecked ? "font-semibold text-on-surface" : "font-medium text-on-surface-variant group-hover:text-on-surface"
                                        }`}>
                                          {idea.title}
                                        </p>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase flex-shrink-0 ${
                                          isChecked ? "bg-surface-container-low text-on-surface-variant" : "bg-surface-container-high/30 text-outline"
                                        }`}>
                                          {idea.tag}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-on-surface-variant text-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                  Select up to 5 ideas &middot; <span className="text-on-surface font-bold">{selectedIdeas.size} selected</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Paste mode */}
                    {mode.id === "paste" && (
                      <textarea
                        value={pastedScript}
                        onChange={(e) => setPastedScript(e.target.value)}
                        placeholder="Paste your script here..."
                        className="w-full min-h-[160px] bg-surface border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body text-sm resize-none"
                      />
                    )}

                    {/* Upload mode */}
                    {mode.id === "upload" && (
                      <>
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
                      </>
                    )}

                    {/* Revoice mode */}
                    {mode.id === "revoice" && (
                      <>
                        {!revoiceTranscript && !revoiceTranscribing && (
                          <label
                            className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                              revoiceIsDragging
                                ? "border-primary bg-primary/10"
                                : "border-outline-variant/40 hover:border-primary/40 hover:bg-primary/5"
                            }`}
                            onDragOver={(e) => { e.preventDefault(); setRevoiceIsDragging(true); }}
                            onDragLeave={() => setRevoiceIsDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setRevoiceIsDragging(false); validateAndSetRevoiceFile(e.dataTransfer.files?.[0] || null); }}
                          >
                            <span className="material-symbols-outlined text-4xl text-on-surface-variant">cloud_upload</span>
                            <span className="text-sm text-on-surface-variant font-medium">
                              {revoiceFile ? revoiceFile.name : "Click to upload or drag and drop"}
                            </span>
                            <span className="text-xs text-on-surface-variant/60">MP4, MOV, or WEBM · max 300MB · 3 minutes max</span>
                            <input
                              type="file"
                              accept=".mp4,.mov,.webm"
                              className="hidden"
                              onChange={(e) => validateAndSetRevoiceFile(e.target.files?.[0] || null)}
                            />
                          </label>
                        )}

                        {revoiceTranscribing && (
                          <div className="flex items-center justify-center gap-3 p-8 border-2 border-dashed border-outline-variant/40 rounded-2xl">
                            <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                            <span className="text-sm text-on-surface-variant font-medium">Transcribing audio...</span>
                          </div>
                        )}

                        {revoiceTranscript && !revoiceTranscribing && (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Transcript from {revoiceFile?.name}</span>
                            </div>
                            <textarea
                              value={revoiceTranscript}
                              onChange={(e) => setRevoiceTranscript(e.target.value)}
                              className="w-full min-h-[160px] bg-surface border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body text-sm resize-none"
                            />
                            <label className="mt-3 flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={revoiceKeepOriginal}
                                onChange={(e) => setRevoiceKeepOriginal(e.target.checked)}
                                className="w-4 h-4 rounded border-outline-variant accent-primary"
                              />
                              <span className="text-sm text-on-surface-variant">Keep my exact words (don&apos;t rewrite with selected tone)</span>
                            </label>
                            <label className="mt-2 flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={revoiceBlurSubtitles}
                                onChange={(e) => setRevoiceBlurSubtitles(e.target.checked)}
                                className="w-4 h-4 rounded border-outline-variant accent-primary"
                              />
                              <span className="text-sm text-on-surface-variant">Blur original subtitles</span>
                            </label>
                          </>
                        )}

                        {revoiceError && (
                          <p className="mt-3 text-sm text-red-500 font-medium">{revoiceError}</p>
                        )}
                      </>
                    )}

                    {/* Prompt mode */}
                    {mode.id === "prompt" && (
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Describe the video you want..."
                        className="w-full min-h-[160px] bg-surface border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body text-sm resize-none"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Caption Style ── */}
      <div className="max-w-4xl mx-auto px-8 pb-24">
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

      {/* ── Video Language ── */}
      <section className="mb-10">
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
      </div>

      {/* ── Modals ── */}
      <CharacterPickerModal
        open={characterModalOpen}
        onClose={() => setCharacterModalOpen(false)}
        onSelect={handleCharacterSelect}
        characters={characters}
        currentName={selectedCharacter.name}
      />

      <VoicePickerModal
        open={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onSelect={handleVoiceSelect}
        currentVoiceId={selectedVoice?.fishAudioId}
      />

      {/* ── Bottom action bar ── */}
      {activeMode && (
        <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl px-8 py-6 shadow-[0px_-10px_30px_rgba(0,0,0,0.03)] flex justify-center">
          <button
            onClick={handleBottomAction}
            disabled={bottomDisabled}
            className="w-full max-w-xl py-5 rounded-xl text-lg font-bold font-headline flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 bg-primary text-on-primary shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ideasLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Generating ideas...
              </>
            ) : (
              <>
                {actionLabel}
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {activeMode === "template" && !showIdeas ? "auto_awesome" : "arrow_forward"}
                </span>
              </>
            )}
          </button>
        </footer>
      )}
    </main>
  );
}

export default function VideoSetupPage() {
  return (
    <Suspense>
      <VideoSetupContent />
    </Suspense>
  );
}
