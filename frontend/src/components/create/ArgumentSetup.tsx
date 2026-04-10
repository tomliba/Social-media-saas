"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Tone options (shared with AIStorySetup) ──

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

// ── Duration options ──

const durations = [
  { label: "30 seconds", value: 30 },
  { label: "45 seconds", value: 45 },
  { label: "60 seconds", value: 60 },
  { label: "90 seconds", value: 90 },
];

// ── Script source modes ──

const scriptModes = [
  { id: "topic" as const, label: "Viral ideas", icon: "local_fire_department", description: "AI generates 10 viral debate ideas for your niche" },
  { id: "script" as const, label: "Paste your own script", icon: "content_paste", description: "Use A: and B: to mark speakers" },
  { id: "remix" as const, label: "Remix a viral video", icon: "recycling", description: "Paste a URL to extract and remix" },
  { id: "prompt" as const, label: "Write your own prompt", icon: "edit_note", description: "Freeform instructions to AI" },
];

// ── Speaker colors ──

const SPEAKER_A_COLOR = "#F0997B";
const SPEAKER_B_COLOR = "#85B7EB";

// ── Step pills ──

function StepPills({ current }: { current: number }) {
  const steps = ["Setup", "Script", "Settings"];
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

// ── Types ──

interface Character {
  id: string;
  name: string;
  avatar_url?: string;
  description?: string;
}

interface BackgroundVideo {
  id: string;
  name: string;
  url?: string;
  thumbnail_url?: string;
  category?: string;
  duration?: number;
}

interface Line {
  speaker: string;
  text: string;
}

// ── Main Component ──

export default function ArgumentSetup() {
  const router = useRouter();

  // Step: 0=setup, 1=script, 2=settings
  const [step, setStep] = useState(0);

  // Characters
  const [characters, setCharacters] = useState<Record<string, Character>>({});
  const [characterA, setCharacterA] = useState("peter");
  const [characterB, setCharacterB] = useState("stewie");

  // Script source
  const [niche, setNiche] = useState("");
  const [formats, setFormats] = useState<{ id: string; label: string; icon: string; description: string }[]>([]);
  const [selectedFormat, setSelectedFormat] = useState("debate");
  const [scriptMode, setScriptMode] = useState<"topic" | "script" | "prompt" | "remix" | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [pastedScript, setPastedScript] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [remixUrl, setRemixUrl] = useState("");
  const [fetchingTranscript, setFetchingTranscript] = useState(false);

  // Background
  const [backgrounds, setBackgrounds] = useState<BackgroundVideo[]>([]);
  const [selectedBg, setSelectedBg] = useState<BackgroundVideo | null>(null);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [bgCategory, setBgCategory] = useState("All");
  const [uploadingBg, setUploadingBg] = useState(false);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [charPickerOpen, setCharPickerOpen] = useState<"a" | "b" | null>(null);

  // Script (step 1)
  const [lines, setLines] = useState<Line[]>([]);

  const [vgJobId, setVgJobId] = useState("");

  // Creative settings (step 2)
  const [tone, setTone] = useState("Regular");
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState("regular");
  const [captionFontSize, setCaptionFontSize] = useState<"small" | "medium" | "large">("medium");
  const [captionTransform, setCaptionTransform] = useState<"normal" | "uppercase" | "capitalize" | "lowercase">("uppercase");
  const [captionPosition, setCaptionPosition] = useState<"top" | "middle" | "bottom">("bottom");
  const [music, setMusic] = useState<string | null>("shadows");
  const [speed, setSpeed] = useState(1.0);
  const [duration, setDuration] = useState(45);
  const [filmGrain, setFilmGrain] = useState(false);
  const [shake, setShake] = useState(false);
  const [durationPopoverOpen, setDurationPopoverOpen] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  // Music preview playback
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationPopRef = useRef<HTMLDivElement>(null);

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
    return () => { stopPreview(); };
  }, [stopPreview]);

  // Close duration popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (durationPopRef.current && !durationPopRef.current.contains(e.target as Node)) {
        setDurationPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch characters on mount
  useEffect(() => {
    fetch("/api/argument/characters")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        if (data.characters) setCharacters(data.characters);
      })
      .catch(() => {});
  }, []);

  // Fetch formats on mount
  useEffect(() => {
    fetch("/api/argument/formats")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        if (data.formats) setFormats(data.formats);
      })
      .catch(() => {});
  }, []);

  // Fetch backgrounds on mount
  useEffect(() => {
    fetch("/api/argument/backgrounds")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        if (data.backgrounds) {
          setBackgrounds(data.backgrounds);
          if (data.backgrounds.length > 0 && !selectedBg) {
            setSelectedBg(data.backgrounds[0]);
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Upload custom background video
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const form = new FormData();
      form.append("video", file);
      const res = await fetch("/api/argument/upload-bg", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Upload failed");
        return;
      }
      const bg: BackgroundVideo = await res.json();
      setBackgrounds((prev) => [bg, ...prev]);
      setSelectedBg(bg);
      setBgModalOpen(false);
    } catch {
      alert("Failed to upload background video");
    } finally {
      setUploadingBg(false);
      if (bgFileRef.current) bgFileRef.current.value = "";
    }
  };

  // Fetch dynamic topics from Gemini
  const fetchTopics = useCallback(async () => {
    setLoadingTopics(true);
    try {
      const res = await fetch("/api/argument/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character_a: characterA, character_b: characterB, niche, format_id: selectedFormat }),
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
  }, [characterA, characterB, niche, selectedFormat]);

  // Reset topics when format, characters, or niche change
  useEffect(() => {
    setSuggestedTopics([]);
    setSelectedTopic("");
  }, [selectedFormat, characterA, characterB, niche]);

  // ── Fetch transcript for remix ──
  const handleFetchTranscript = useCallback(async () => {
    if (!remixUrl.trim()) return;
    setFetchingTranscript(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: remixUrl }),
      });
      if (!res.ok) throw new Error("Failed to fetch transcript");
      const data = await res.json();
      if (data.transcript) {
        setPastedScript(data.transcript);
        setScriptMode("script");
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to fetch transcript");
    } finally {
      setFetchingTranscript(false);
    }
  }, [remixUrl]);

  // ── Determine if line is speaker A ──
  const isSpeakerA = useCallback((speaker: string) => {
    const s = speaker.toLowerCase();
    return s.includes(characterA.toLowerCase()) || s === "a" || s.startsWith("a:");
  }, [characterA]);

  // ── Generate script ──
  const handleGenerateScript = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      const body: Record<string, unknown> = {
        character_a: characterA,
        character_b: characterB,
        tone,
        duration,
        language: "Auto Detect",
        niche: niche || undefined,
        format_id: selectedFormat,
      };

      if (scriptMode === "topic") {
        body.mode = "topic";
        body.topic = customTopic.trim() || selectedTopic;
      } else if (scriptMode === "script") {
        body.mode = "script";
        body.transcript = pastedScript;
      } else if (scriptMode === "prompt") {
        body.mode = "prompt";
        body.custom_prompt = customPrompt;
      } else if (scriptMode === "remix") {
        body.mode = "remix";
        body.transcript = remixUrl;
      }

      const res = await fetch("/api/argument/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Generation failed (${res.status})`);
      }

      const data = await res.json();
      setVgJobId(data.vg_job_id || "");
      const newLines: Line[] = (data.lines || []).map((l: { speaker?: string; text?: string }) => ({
        speaker: l.speaker || "",
        text: l.text || "",
      }));
      setLines(newLines);

      setStep(1);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate script");
    } finally {
      setGenerating(false);
    }
  }, [characterA, characterB, tone, duration, scriptMode, customTopic, selectedTopic, pastedScript, customPrompt, remixUrl]);

  // ── Add line ──
  const handleAddLine = useCallback(() => {
    const lastSpeaker = lines.length > 0 ? lines[lines.length - 1].speaker : "";
    const nextSpeaker = isSpeakerA(lastSpeaker) ? characterB : characterA;
    setLines((prev) => [...prev, { speaker: nextSpeaker, text: "" }]);
  }, [lines, isSpeakerA, characterA, characterB]);

  // ── Delete line ──
  const handleDeleteLine = useCallback((index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Start render → redirect to library ──
  const handleStartRender = useCallback(async () => {
    setRendering(true);
    setGenerateError(null);

    try {
      // 1. Create library item
      const libRes = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: vgJobId,
          title: selectedTopic || "AI Argument",
          format: "video",
          templateId: "Argument",
          backgroundMode: "Gameplay",
          status: "preparing",
          script: lines.map((l) => `${l.speaker}: ${l.text}`).join("\n"),
          durationSec: duration,
        }),
      });

      if (!libRes.ok) throw new Error("Failed to create library item");
      const { item: libItem } = await libRes.json();

      // 2. Start render (fire and forget)
      const selectedMusic = musicTracks.find((t) => t.id === music);

      const res = await fetch("/api/argument/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vg_job_id: vgJobId,
          lines,
          background_video: selectedBg?.url || selectedBg?.id,
          speed,
          caption_style: captionsEnabled ? captionStyle : "none",
          caption_font_size: captionFontSize,
          caption_text_transform: captionTransform,
          caption_position: "middle",
          music: selectedMusic ? selectedMusic.backendFile : music,
          film_grain: filmGrain,
          shake_effect: shake,
          preview: true,
          library_item_id: libItem.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Render failed (${res.status})`);
      }

      // 3. Redirect to library
      router.push("/library");
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to start render");
      setRendering(false);
    }
  }, [vgJobId, lines, selectedBg, speed, captionsEnabled, captionStyle, captionFontSize, captionTransform, music, filmGrain, shake, selectedTopic, duration, router]);

  // ── Derived ──
  const characterList = Object.values(characters);
  const charAObj = characters[characterA];
  const charBObj = characters[characterB];
  const bgCategories = ["All", ...new Set(backgrounds.map((b) => b.category).filter(Boolean) as string[])];
  const filteredBgs = bgCategory === "All" ? backgrounds : backgrounds.filter((b) => b.category === bgCategory);

  return (
    <main className="pt-24 pb-64 px-6 md:px-12 lg:px-16 max-w-screen-xl mx-auto">
      {/* Header */}
      <header className="mb-6 flex items-center gap-4">
        <Link
          href="/create"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-lowest hover:bg-surface-container-high transition-all active:scale-90 shadow-sm text-primary"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
            AI Argument
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Two characters debate any topic you choose
          </p>
        </div>
      </header>

      <StepPills current={step} />

      {/* Error banner */}
      {generateError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          {generateError}
          <button onClick={() => setGenerateError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STEP 0: Setup
         ═══════════════════════════════════════════════ */}
      {step === 0 && (
        <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* ── Niche ── */}
          <section className="mb-10">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 block font-headline">
              Your niche
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. fitness, history, finance, gaming, cooking..."
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/40"
            />
          </section>

          {/* ── Character Picker with VS ── */}
          <section className="mb-10">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4 block font-headline">
              Characters
            </label>
            <div className="flex items-center gap-4">
              {/* Character A button */}
              <button
                onClick={() => setCharPickerOpen("a")}
                className="flex-1 flex flex-col items-center gap-2 rounded-2xl p-4 transition-all border-2 hover:shadow-lg bg-surface-container-lowest"
                style={{ borderColor: SPEAKER_A_COLOR, backgroundColor: `${SPEAKER_A_COLOR}08` }}
              >
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Explainer (left)</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/argument-characters/${characterA}.png`}
                  alt={characters[characterA]?.name ?? characterA}
                  className="w-full h-28 object-contain object-bottom"
                />
                <span className="text-sm font-bold text-on-surface font-headline">{characters[characterA]?.name ?? characterA}</span>
                <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">swap_horiz</span>
                  Tap to change
                </span>
              </button>

              {/* VS divider */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F0997B] to-[#85B7EB] flex items-center justify-center shadow-lg">
                  <span className="text-white font-black font-headline text-sm">VS</span>
                </div>
              </div>

              {/* Character B button */}
              <button
                onClick={() => setCharPickerOpen("b")}
                className="flex-1 flex flex-col items-center gap-2 rounded-2xl p-4 transition-all border-2 hover:shadow-lg bg-surface-container-lowest"
                style={{ borderColor: SPEAKER_B_COLOR, backgroundColor: `${SPEAKER_B_COLOR}08` }}
              >
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Asker (right)</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/argument-characters/${characterB}.png`}
                  alt={characters[characterB]?.name ?? characterB}
                  className="w-full h-28 object-contain object-bottom"
                />
                <span className="text-sm font-bold text-on-surface font-headline">{characters[characterB]?.name ?? characterB}</span>
                <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">swap_horiz</span>
                  Tap to change
                </span>
              </button>
            </div>
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
                        {/* Format grid */}
                        {formats.length > 0 && (
                          <div className="mb-4">
                            <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                              Conversation format
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {formats.map((f) => (
                                <button
                                  key={f.id}
                                  onClick={() => setSelectedFormat(f.id)}
                                  className={`flex items-start gap-2.5 p-3 rounded-xl text-left transition-all border ${
                                    selectedFormat === f.id
                                      ? "border-2 border-primary bg-primary/5"
                                      : "border-outline-variant/20 hover:border-outline-variant bg-white"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-primary text-lg mt-0.5">{f.icon}</span>
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold font-headline text-on-surface block">{f.label}</span>
                                    <span className="text-[10px] text-on-surface-variant leading-tight block">{f.description}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Generate button */}
                        <button
                          onClick={fetchTopics}
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

                        {/* Topic pills */}
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
                        <p className="text-xs text-on-surface-variant mb-2">
                          Use <strong>A:</strong> and <strong>B:</strong> (or character names) to mark speakers.
                        </p>
                        <textarea
                          value={pastedScript}
                          onChange={(e) => setPastedScript(e.target.value)}
                          rows={8}
                          placeholder={`${charAObj?.name || characterA}: Is cereal a soup?\n${charBObj?.name || characterB}: Absolutely not, you fool!\n${charAObj?.name || characterA}: But it's liquid with stuff in it!\n${charBObj?.name || characterB}: By that logic, a fish tank is a soup.`}
                          className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/40 resize-none font-mono"
                        />
                      </div>
                    )}

                    {isActive && mode.id === "remix" && (
                      <div className="mt-2 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={remixUrl}
                            onChange={(e) => setRemixUrl(e.target.value)}
                            placeholder="Paste a YouTube or TikTok URL..."
                            className="flex-1 bg-surface border border-outline-variant/15 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/40"
                          />
                          <button
                            onClick={handleFetchTranscript}
                            disabled={!remixUrl.trim() || fetchingTranscript}
                            className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
                          >
                            {fetchingTranscript ? (
                              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-sm">download</span>
                            )}
                            Fetch
                          </button>
                        </div>
                      </div>
                    )}

                    {isActive && mode.id === "prompt" && (
                      <div className="mt-2 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
                        <textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          rows={5}
                          placeholder="Write a heated argument between the two characters about..."
                          className="w-full bg-surface border border-outline-variant/15 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/40 resize-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Background Video ── */}
          <section className="mb-10">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 block font-headline">
              Background video
            </label>

            <button
              onClick={() => setBgModalOpen(true)}
              className="w-full flex items-center gap-4 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:border-outline-variant transition-all text-left"
            >
              {selectedBg?.id === "green_screen" ? (
                <div className="w-20 h-12 rounded-lg flex-shrink-0" style={{ backgroundColor: "#00FF00" }} />
              ) : selectedBg?.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/argument/bg-thumb/${selectedBg.id}.jpg`} alt={selectedBg.name} className="w-20 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-12 rounded-lg bg-surface-container-low flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant">videocam</span>
                </div>
              )}
              <div className="flex-grow min-w-0">
                <span className="text-sm font-bold font-headline text-on-surface block truncate">
                  {selectedBg?.name || "Select a background"}
                </span>
                <span className="text-xs text-on-surface-variant">Tap to change</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
          </section>

          {/* ── Tone ── */}
          <section className="mb-10">
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
          </section>

          {/* ── Duration & Speed ── */}
          <section className="mb-32">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 block font-headline">
              Duration & Speed
            </label>
            <div className="flex flex-wrap gap-3 items-start">
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
            </div>
          </section>

          {/* ── Generate button ── */}
          <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md px-6 py-6 md:px-12 flex justify-center items-center z-40">
            <button
              onClick={handleGenerateScript}
              disabled={generating}
              className="px-10 py-4 primary-gradient text-white rounded-full font-bold font-headline shadow-[0px_10px_30px_rgba(111,51,213,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {generating ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  Generating script...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  Generate Script
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STEP 1: Script Editor
         ═══════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Layout preview */}
          <div className="mb-6 rounded-xl overflow-hidden border border-outline-variant/20">
            <div className="relative w-full aspect-[9/16] max-h-[220px] bg-[#1a1a2e]">
              {/* Character A - bottom left */}
              <div className="absolute bottom-3 left-3 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: SPEAKER_A_COLOR }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/argument-characters/${characterA}.png`}
                    alt="A"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <span className="text-[8px] font-bold mt-0.5" style={{ color: SPEAKER_A_COLOR }}>{charAObj?.name || characterA}</span>
              </div>
              {/* Character B - bottom right */}
              <div className="absolute bottom-3 right-3 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: SPEAKER_B_COLOR }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/argument-characters/${characterB}.png`}
                    alt="B"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <span className="text-[8px] font-bold mt-0.5" style={{ color: SPEAKER_B_COLOR }}>{charBObj?.name || characterB}</span>
              </div>
              {/* Image overlay area */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-16 rounded-lg border border-dashed border-white/30 flex items-center justify-center">
                <span className="text-[8px] text-white/40 font-bold">Image</span>
              </div>
              {/* Caption area */}
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1 rounded bg-black/50">
                <span className="text-[9px] text-white font-bold">Caption text here</span>
              </div>
            </div>
          </div>

          {/* Lines editor */}
          <div className="space-y-3 mb-6">
            {lines.map((line, i) => {
              const isA = isSpeakerA(line.speaker);
              const speakerColor = isA ? SPEAKER_A_COLOR : SPEAKER_B_COLOR;

              return (
                <div
                  key={i}
                  className="p-4 rounded-xl border bg-white"
                  style={{ borderColor: `${speakerColor}30` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    {/* Speaker badge */}
                    <span
                      className="text-xs font-bold font-headline px-2.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: speakerColor }}
                    >
                      {line.speaker}
                    </span>
                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteLine(i)}
                      className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-red-400 text-base">close</span>
                    </button>
                  </div>
                  <textarea
                    value={line.text}
                    onChange={(e) => {
                      setLines((prev) => {
                        const next = [...prev];
                        next[i] = { ...next[i], text: e.target.value };
                        return next;
                      });
                    }}
                    rows={2}
                    className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                </div>
              );
            })}
          </div>

          {/* Add line button */}
          <button
            onClick={handleAddLine}
            className="w-full py-3 rounded-xl border-2 border-dashed border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add line
          </button>

          {/* Navigation */}
          <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md px-6 py-6 md:px-12 flex justify-center items-center z-40">
            <div className="max-w-2xl w-full flex justify-between items-center">
              <button
                onClick={() => setStep(0)}
                className="px-6 py-3 rounded-full font-bold font-headline text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={lines.length === 0}
                className="px-10 py-4 primary-gradient text-white rounded-full font-bold font-headline shadow-[0px_10px_30px_rgba(111,51,213,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                Continue to Settings
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          STEP 2: Creative Settings
         ═══════════════════════════════════════════════ */}
      {step === 2 && !rendering && (
        <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">

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

          {/* Navigation */}
          <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md px-6 py-6 md:px-12 flex justify-center items-center z-40">
            <div className="max-w-2xl w-full flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-full font-bold font-headline text-on-surface-variant hover:text-on-surface transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back to Script
              </button>
              <button
                onClick={handleStartRender}
                disabled={lines.length === 0}
                className="px-10 py-4 primary-gradient text-white rounded-full font-bold font-headline shadow-[0px_10px_30px_rgba(111,51,213,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>movie</span>
                Render Video
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════
          Background modal
         ═══════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════
          Character picker modal
         ═══════════════════════════════════════════════ */}
      {charPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold font-headline text-on-surface">
                Choose {charPickerOpen === "a" ? "Explainer" : "Asker"}
              </h3>
              <button
                onClick={() => setCharPickerOpen(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {characterList.map((c) => {
                const isSelected = charPickerOpen === "a" ? characterA === c.id : characterB === c.id;
                const accentColor = charPickerOpen === "a" ? SPEAKER_A_COLOR : SPEAKER_B_COLOR;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (charPickerOpen === "a") setCharacterA(c.id);
                      else setCharacterB(c.id);
                      setCharPickerOpen(null);
                    }}
                    className={`rounded-xl p-3 text-center transition-all border-2 ${
                      isSelected
                        ? "shadow-lg"
                        : "border-outline-variant/20 hover:border-outline-variant bg-surface-container-lowest"
                    }`}
                    style={isSelected ? { borderColor: accentColor, backgroundColor: `${accentColor}10` } : {}}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/argument-characters/${c.id}.png`}
                      alt={c.name}
                      className="w-full h-40 object-contain object-bottom mx-auto mb-2"
                    />
                    <span className="text-sm font-bold text-on-surface block">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {bgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-3xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold font-headline text-on-surface">Choose Background</h3>
              <button
                onClick={() => setBgModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Upload option */}
            <input
              ref={bgFileRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={handleBgUpload}
            />
            <button
              onClick={() => bgFileRef.current?.click()}
              disabled={uploadingBg}
              className="w-full mb-4 py-3 rounded-xl border-2 border-dashed border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploadingBg ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  Uploading...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">upload</span>
                  Upload your own background
                </>
              )}
            </button>

            {/* Green Screen option */}
            <button
              onClick={() => {
                setSelectedBg({ id: "green_screen", name: "Green Screen", url: "green_screen", category: "Effects" });
                setBgModalOpen(false);
              }}
              className={`w-full mb-4 flex items-center gap-4 p-4 rounded-xl transition-all border ${
                selectedBg?.id === "green_screen"
                  ? "border-2 border-primary bg-primary/5"
                  : "border-outline-variant/20 hover:border-outline-variant bg-surface-container-lowest"
              }`}
            >
              <div className="w-16 h-10 rounded-lg flex-shrink-0" style={{ backgroundColor: "#00FF00" }} />
              <div className="text-left">
                <span className="text-sm font-bold text-on-surface block">Green Screen</span>
                <span className="text-xs text-on-surface-variant">Solid green background for chroma key</span>
              </div>
            </button>

            {/* Category filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              {bgCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setBgCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    bgCategory === cat
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {filteredBgs.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => { setSelectedBg(bg); setBgModalOpen(false); }}
                  className={`rounded-xl overflow-hidden transition-all border ${
                    selectedBg?.id === bg.id
                      ? "border-2 border-primary ring-2 ring-primary/20"
                      : "border-outline-variant/20 hover:border-outline-variant"
                  }`}
                >
                  <div className="aspect-video relative">
                    {bg.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/argument/bg-thumb/${bg.id}.jpg`} alt={bg.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-container-low flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant">videocam</span>
                      </div>
                    )}
                    {bg.duration && (
                      <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                        {bg.duration}s
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <span className="text-[11px] font-bold text-on-surface block truncate">{bg.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
