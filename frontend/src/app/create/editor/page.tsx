"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const characters = [
  { name: "Doctor", emoji: "\u{1F9D1}\u200D\u2695\uFE0F", color: "from-blue-400 to-cyan-300" },
  { name: "Professor", emoji: "\u{1F468}\u200D\u{1F3EB}", color: "from-amber-400 to-yellow-300" },
  { name: "Chef", emoji: "\u{1F468}\u200D\u{1F373}", color: "from-orange-400 to-red-300" },
  { name: "Cowboy", emoji: "\u{1F920}", color: "from-yellow-600 to-amber-400" },
  { name: "Robot", emoji: "\u{1F916}", color: "from-zinc-400 to-slate-300" },
  { name: "Vampire", emoji: "\u{1F9DB}", color: "from-purple-600 to-violet-400" },
  { name: "Wizard", emoji: "\u{1F9D9}", color: "from-indigo-500 to-blue-400" },
  { name: "Finance Bro", emoji: "\u{1F4BC}", color: "from-emerald-500 to-green-400" },
  { name: "Alien", emoji: "\u{1F47D}", color: "from-lime-400 to-green-300" },
];

type SettingKey = "tone" | "presenter" | "background" | "duration" | "layout";

interface SettingConfig {
  key: SettingKey;
  label: string;
  emoji: string;
  options: { label: string; emoji?: string; icon?: string; badge?: string }[];
}

const settingsConfig: SettingConfig[] = [
  {
    key: "tone",
    label: "Tone",
    emoji: "\u{1F604}",
    options: [
      { label: "Funny", emoji: "\u{1F604}" },
      { label: "Serious", emoji: "\u{1F3AF}" },
      { label: "Cursing", emoji: "\u{1F92C}" },
      { label: "Edgy", emoji: "\u{1F525}" },
    ],
  },
  {
    key: "presenter",
    label: "Presenter",
    emoji: "\u{1F9D1}\u200D\u2695\uFE0F",
    options: [],
  },
  {
    key: "background",
    label: "Background",
    emoji: "\u{1F3AC}",
    options: [
      { label: "Stock footage", emoji: "\u{1F3AC}" },
      { label: "AI images", emoji: "\u{1F3A8}" },
      { label: "Kling video", emoji: "\u{1F3A5}", badge: "Pro" },
      { label: "Upload own", icon: "cloud_upload" },
    ],
  },
  {
    key: "duration",
    label: "Duration",
    emoji: "\u23F1",
    options: [
      { label: "15s", emoji: "\u23F1" },
      { label: "30s", emoji: "\u23F1" },
      { label: "60s", emoji: "\u23F1" },
      { label: "AI picks", emoji: "\u{1F916}" },
    ],
  },
  {
    key: "layout",
    label: "Layout",
    emoji: "\u{1F4D0}",
    options: [
      { label: "Standard", emoji: "\u{1F4D0}" },
      { label: "Split screen", emoji: "\u{1F4CA}" },
      { label: "Text only", emoji: "\u{1F4DD}" },
    ],
  },
];

interface Script {
  title: string;
  script: string;
}

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const template = searchParams.get("template") || "Did You Know";
  const ideasParam = searchParams.get("ideas");
  const ideaTitles: string[] = ideasParam ? JSON.parse(ideasParam) : [];

  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const [settings, setSettings] = useState<Record<SettingKey, string>>({
    tone: "Funny",
    presenter: "Doctor",
    background: "Stock footage",
    duration: "30s",
    layout: "Standard",
  });
  const [openPill, setOpenPill] = useState<SettingKey | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchScripts = useCallback(async () => {
    if (ideaTitles.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, ideas: ideaTitles }),
      });
      const data = await res.json();
      if (data.scripts) {
        setScripts(data.scripts);
      }
    } catch (err) {
      console.error("Failed to fetch scripts:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const regenerateScript = async (index: number) => {
    setRegeneratingIndex(index);
    try {
      const res = await fetch("/api/generate-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          ideas: [scripts[index].title],
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

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpenPill(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const updateScript = (index: number, value: string) => {
    setScripts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], script: value };
      return next;
    });
  };

  const selectSetting = (key: SettingKey, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setOpenPill(null);
  };

  const videoCount = scripts.length || ideaTitles.length;

  return (
    <main className="pt-24 pb-72 px-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-10 text-on-surface-variant font-headline">
        <Link
          href="/create/templates"
          className="p-2 hover:bg-surface-container-highest rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium">
          <Link
            href="/create"
            className="hover:text-primary cursor-pointer transition-colors"
          >
            Create
          </Link>
          <span className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <span className="hover:text-primary cursor-pointer transition-colors">
            Video
          </span>
          <span className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <span className="hover:text-primary cursor-pointer transition-colors">
            {template}
          </span>
          <span className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <span className="text-on-surface font-bold">
            {videoCount} videos
          </span>
        </nav>
      </div>

      {/* Script Cards */}
      <section className="space-y-8 mb-16">
        <h2 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-6">
          Review Scripts
        </h2>

        {loading ? (
          // Loading skeleton
          Array.from({ length: ideaTitles.length || 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest rounded-[1rem] p-8 shadow-[0px_20px_40px_rgba(111,51,213,0.06)] border border-outline-variant/10"
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
                <div className="h-4 w-5/6 shimmer rounded-full" />
              </div>
            </div>
          ))
        ) : (
          scripts.map((s, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest rounded-[1rem] p-8 shadow-[0px_20px_40px_rgba(111,51,213,0.06)] border border-outline-variant/10 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/60 font-headline">
                    Video {i + 1} of {videoCount}
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
                  onChange={(e) => updateScript(i, e.target.value)}
                  className="w-full min-h-[160px] bg-surface text-on-surface-variant font-body leading-relaxed p-6 rounded-md border-none focus:ring-2 focus:ring-primary/40 resize-none"
                  placeholder="Enter script here..."
                />
                <div className="absolute bottom-4 right-4 text-[10px] font-bold text-outline-variant uppercase tracking-tighter">
                  AI Generated
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Settings Section */}
      {!loading && scripts.length > 0 && (
        <section className="mt-16 relative">
          <h2 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-8">
            Creative Settings
          </h2>
          <div className="flex flex-wrap gap-4 items-start">
            {settingsConfig.map((setting) => {
              const isOpen = openPill === setting.key;
              const currentValue = settings[setting.key];
              const currentEmoji =
                setting.key === "presenter"
                  ? characters.find((c) => c.name === currentValue)?.emoji ||
                    "\u{1F9D1}\u200D\u2695\uFE0F"
                  : setting.options.find((o) => o.label === currentValue)
                      ?.emoji || setting.emoji;

              return (
                <div key={setting.key} className="relative" ref={isOpen ? popoverRef : undefined}>
                  <button
                    onClick={() =>
                      setOpenPill(isOpen ? null : setting.key)
                    }
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold font-headline transition-all ${
                      isOpen
                        ? "bg-secondary-container text-on-secondary-container ring-2 ring-primary"
                        : setting.key === "tone"
                          ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                          : "bg-surface-container-highest text-on-surface hover:bg-surface-dim"
                    }`}
                  >
                    <span>{currentEmoji}</span>
                    <span>{currentValue}</span>
                    <span className="material-symbols-outlined text-lg">
                      {isOpen ? "expand_less" : "expand_more"}
                    </span>
                  </button>

                  {/* Popover */}
                  {isOpen && (
                    <div className="absolute bottom-full left-0 mb-4 bg-surface-container-lowest rounded-[1rem] shadow-[0px_30px_60px_rgba(111,51,213,0.15)] border border-outline-variant/15 p-6 z-40 min-w-[280px] max-h-[70vh] overflow-y-auto no-scrollbar">
                      {setting.key === "presenter" ? (
                        <>
                          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 font-headline">
                            Choose Presenter Persona
                          </div>
                          <div className="grid grid-cols-5 gap-4 mb-6">
                            {characters.map((char) => {
                              const isSelected =
                                currentValue === char.name;
                              return (
                                <button
                                  key={char.name}
                                  onClick={() =>
                                    selectSetting("presenter", char.name)
                                  }
                                  className={`flex flex-col items-center gap-2 cursor-pointer transition-opacity ${
                                    isSelected
                                      ? "opacity-100"
                                      : "opacity-40 hover:opacity-100"
                                  }`}
                                >
                                  <div
                                    className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${
                                      isSelected
                                        ? "ring-2 ring-primary ring-offset-2"
                                        : ""
                                    } bg-gradient-to-br ${char.color}`}
                                  >
                                    {char.emoji}
                                  </div>
                                  <span className="text-[10px] font-bold text-center">
                                    {char.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="space-y-3">
                            <button
                              onClick={() =>
                                selectSetting("presenter", "HeyGen Avatar")
                              }
                              className="w-full flex items-center justify-between p-3 bg-surface-container-low rounded-[0.5rem] hover:bg-surface-container-high transition-colors cursor-pointer border border-primary/20"
                            >
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">
                                  video_stable
                                </span>
                                <span className="text-sm font-semibold">
                                  HeyGen realistic avatar
                                </span>
                              </div>
                              <span className="bg-primary-container text-on-primary-container text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-widest">
                                Pro
                              </span>
                            </button>
                            <button
                              onClick={() =>
                                selectSetting("presenter", "Text only")
                              }
                              className="w-full flex items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-[0.5rem] hover:bg-surface-container-low transition-colors cursor-pointer text-left"
                            >
                              <span className="material-symbols-outlined text-on-surface-variant">
                                format_quote
                              </span>
                              <span className="text-sm font-semibold">
                                Text only — no presenter
                              </span>
                            </button>
                            <button
                              onClick={() =>
                                selectSetting("presenter", "Upload own")
                              }
                              className="w-full flex items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-[0.5rem] hover:bg-surface-container-low transition-colors cursor-pointer text-left"
                            >
                              <span className="material-symbols-outlined text-on-surface-variant">
                                cloud_upload
                              </span>
                              <span className="text-sm font-semibold">
                                Upload your own video
                              </span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 font-headline">
                            {setting.label}
                          </div>
                          <div className="space-y-2">
                            {setting.options.map((opt) => (
                              <button
                                key={opt.label}
                                onClick={() =>
                                  selectSetting(setting.key, opt.label)
                                }
                                className={`w-full flex items-center justify-between p-3 rounded-[0.5rem] transition-colors cursor-pointer text-left ${
                                  currentValue === opt.label
                                    ? "bg-primary/10 ring-1 ring-primary/30"
                                    : "bg-surface-container-low hover:bg-surface-container-high"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {opt.emoji && (
                                    <span>{opt.emoji}</span>
                                  )}
                                  {opt.icon && (
                                    <span className="material-symbols-outlined text-on-surface-variant">
                                      {opt.icon}
                                    </span>
                                  )}
                                  <span className="text-sm font-semibold">
                                    {opt.label}
                                  </span>
                                </div>
                                {opt.badge && (
                                  <span className="bg-primary-container text-on-primary-container text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-widest">
                                    {opt.badge}
                                  </span>
                                )}
                                {currentValue === opt.label && (
                                  <span className="material-symbols-outlined text-primary text-sm">
                                    check
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-sm text-on-surface-variant">
            Using your defaults &middot; Tap any to change
          </p>
        </section>
      )}

      {/* Sticky Bottom Bar */}
      <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl px-8 py-6 shadow-[0px_-10px_30px_rgba(0,0,0,0.03)] flex flex-col items-center">
        <button
          onClick={() => router.push("/create/review")}
          disabled={loading || scripts.length === 0}
          className="w-full max-w-xl py-5 primary-gradient text-on-primary rounded-full text-xl font-bold font-headline flex items-center justify-center gap-3 shadow-xl shadow-primary/30 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin">
                refresh
              </span>
              Generating scripts...
            </>
          ) : (
            <>
              Create {videoCount} videos
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
            </>
          )}
        </button>
        <p className="mt-3 text-xs font-medium text-on-surface-variant flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-tertiary rounded-full" />
          Videos render in the background &middot; We&apos;ll notify you when
          ready &middot; ~7 min estimated
        </p>
      </footer>
    </main>
  );
}

export default function EditorPage() {
  return (
    <Suspense>
      <EditorContent />
    </Suspense>
  );
}
