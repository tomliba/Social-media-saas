"use client";

import { useState } from "react";

const daysOfWeek = [
  { key: "M", label: "Monday" },
  { key: "T", label: "Tuesday" },
  { key: "W", label: "Wednesday" },
  { key: "T", label: "Thursday" },
  { key: "F", label: "Friday" },
  { key: "S", label: "Saturday" },
  { key: "S", label: "Sunday" },
];

const tones = ["Funny", "Serious", "Cursing", "Edgy"];

const contentTypes = [
  { name: "Video", sub: "Reels, TikTok, Shorts", defaultChecked: true },
  { name: "Carousel", sub: "IG Feed", defaultChecked: true },
  { name: "Thread", sub: "X / Twitter", defaultChecked: false },
  { name: "Caption", sub: "LinkedIn", defaultChecked: false },
];

const platformIcons = [
  { name: "Instagram", icon: "camera_alt" },
  { name: "TikTok", icon: "music_note" },
  { name: "X / Twitter", icon: "alternate_email" },
  { name: "LinkedIn", icon: "work" },
  { name: "YouTube", icon: "play_circle" },
];

export default function AutopilotPage() {
  const [autopilotOn, setAutopilotOn] = useState(false);
  const [selectedTone, setSelectedTone] = useState("Funny");
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4, 5, 6])
  );
  const [checkedTypes, setCheckedTypes] = useState<Set<string>>(
    new Set(contentTypes.filter((c) => c.defaultChecked).map((c) => c.name))
  );
  const [approvalMode, setApprovalMode] = useState<"review" | "auto">(
    "review"
  );
  const [character, setCharacter] = useState("The Mentor");
  const [bgStyle, setBgStyle] = useState<"stock" | "ai">("stock");

  const toggleDay = (index: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleContentType = (name: string) => {
    setCheckedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <section className="relative mb-16 overflow-hidden bg-surface-container-lowest rounded-xl p-10 flex flex-col md:flex-row items-center gap-12 shadow-[0px_20px_40px_rgba(111,51,213,0.04)]">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-5xl font-black font-headline text-on-surface tracking-tight leading-tight mb-4">
            Put your content on{" "}
            <span className="text-primary">autopilot</span>
          </h1>
          <p className="text-xl text-on-surface-variant leading-relaxed max-w-md">
            AI creates and posts for you every day. You just review and approve.
          </p>
        </div>
        <div className="flex-1 w-full flex justify-center">
          <div className="relative w-full aspect-video bg-surface-container-low rounded-lg p-6 flex flex-col items-center justify-center gap-8 border border-outline-variant/10">
            <div className="flex items-center gap-4 animate-pulse">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white text-3xl">
                  auto_awesome
                </span>
              </div>
              <div className="h-[2px] w-12 bg-primary-container" />
            </div>
            <div className="grid grid-cols-5 gap-4">
              {platformIcons.map((p) => (
                <div
                  key={p.name}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-outline-variant/20">
                    <span className="material-symbols-outlined text-on-surface-variant">
                      {p.icon}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold opacity-60">
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Autopilot Status Toggle */}
      <div className="flex justify-between items-center mb-10 p-6 bg-surface-container-low rounded-lg">
        <div>
          <h3 className="text-xl font-bold font-headline text-on-surface">
            Autopilot Status
          </h3>
          <p className="text-on-surface-variant text-sm">
            Enable this to start generating content daily
          </p>
        </div>
        <button
          onClick={() => setAutopilotOn(!autopilotOn)}
          className="flex items-center gap-4 px-6 py-3 bg-surface-container-highest rounded-full transition-all"
        >
          <span className="text-on-surface-variant font-bold">
            Autopilot is {autopilotOn ? "ON" : "OFF"}
          </span>
          <div
            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${
              autopilotOn ? "bg-primary" : "bg-outline-variant/40"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${
                autopilotOn ? "left-7" : "left-1"
              }`}
            />
          </div>
        </button>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Column 1: Core Config */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-8">
          {/* Your Niche */}
          <div className="p-8 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/5">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">
                psychology
              </span>
              <h4 className="text-lg font-bold font-headline">Your niche</h4>
            </div>
            <input
              type="text"
              placeholder="e.g., fitness tips, medical facts, personal finance"
              className="w-full bg-surface-container-low border-0 rounded-sm p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-on-surface-variant/50 transition-all"
            />
          </div>

          {/* Content Types */}
          <div className="p-8 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/5">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">
                dashboard_customize
              </span>
              <h4 className="text-lg font-bold font-headline">
                Content types
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {contentTypes.map((ct) => (
                <label
                  key={ct.name}
                  className="flex items-center gap-4 p-4 bg-surface-container-low rounded-lg cursor-pointer hover:bg-surface-container hover:shadow-inner transition-all"
                >
                  <input
                    type="checkbox"
                    checked={checkedTypes.has(ct.name)}
                    onChange={() => toggleContentType(ct.name)}
                    className="w-5 h-5 rounded border-0 text-primary focus:ring-0"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{ct.name}</span>
                    <span className="text-xs text-on-surface-variant">
                      {ct.sub}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Your Style */}
          <div className="p-8 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/5">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">
                palette
              </span>
              <h4 className="text-lg font-bold font-headline">Your style</h4>
            </div>
            <div className="space-y-8">
              {/* Tone */}
              <div>
                <p className="text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">
                  Tone
                </p>
                <div className="flex flex-wrap gap-2">
                  {tones.map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setSelectedTone(tone)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        selectedTone === tone
                          ? "bg-primary text-on-primary shadow-sm"
                          : "bg-surface-container-highest text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Character + Background */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">
                    Character
                  </p>
                  <div className="relative">
                    <select
                      value={character}
                      onChange={(e) => setCharacter(e.target.value)}
                      className="w-full bg-surface-container-low border-0 rounded-sm p-3 pr-10 text-on-surface appearance-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option>The Mentor</option>
                      <option>The Rebel</option>
                      <option>The Analyst</option>
                      <option>The Storyteller</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                      expand_more
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface-variant mb-3 uppercase tracking-wider">
                    Background
                  </p>
                  <div className="flex items-center p-1 bg-surface-container-low rounded-full">
                    <button
                      onClick={() => setBgStyle("stock")}
                      className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all ${
                        bgStyle === "stock"
                          ? "bg-white shadow-sm text-primary"
                          : "text-on-surface-variant"
                      }`}
                    >
                      Stock footage
                    </button>
                    <button
                      onClick={() => setBgStyle("ai")}
                      className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all ${
                        bgStyle === "ai"
                          ? "bg-white shadow-sm text-primary"
                          : "text-on-surface-variant"
                      }`}
                    >
                      AI images
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Schedule & Logic */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-8">
          {/* Schedule */}
          <div className="p-8 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/5">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">
                calendar_month
              </span>
              <h4 className="text-lg font-bold font-headline">Schedule</h4>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg mb-6">
              <span className="font-bold">Every day</span>
              <span className="material-symbols-outlined text-on-surface-variant">
                check_circle
              </span>
            </div>
            <div className="flex justify-between gap-1 mb-8">
              {daysOfWeek.map((day, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                    selectedDays.has(i)
                      ? "bg-primary text-white"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {day.key}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between p-4 border border-outline-variant/20 rounded-lg">
              <span className="text-on-surface-variant font-medium">
                Posting Time
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-headline">
                  3:00 PM
                </span>
                <span className="material-symbols-outlined text-on-surface-variant">
                  schedule
                </span>
              </div>
            </div>
          </div>

          {/* Before Posting */}
          <div className="p-8 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/5">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">
                rule
              </span>
              <h4 className="text-lg font-bold font-headline">
                Before posting
              </h4>
            </div>
            <div className="flex flex-col gap-4">
              {/* Review first */}
              <button
                onClick={() => setApprovalMode("review")}
                className={`w-full p-5 rounded-lg relative cursor-pointer text-left transition-all ${
                  approvalMode === "review"
                    ? "border-2 border-primary bg-primary/5"
                    : "border-2 border-secondary/20 opacity-70"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold">Review first</span>
                  <span
                    className={`material-symbols-outlined ${
                      approvalMode === "review"
                        ? "text-primary"
                        : "text-outline-variant"
                    }`}
                    style={
                      approvalMode === "review"
                        ? { fontVariationSettings: "'FILL' 1" }
                        : undefined
                    }
                  >
                    {approvalMode === "review"
                      ? "radio_button_checked"
                      : "radio_button_unchecked"}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Recommended. We notify you to approve every piece before it
                  goes live.
                </p>
              </button>

              {/* Fully automatic */}
              <button
                onClick={() => setApprovalMode("auto")}
                className={`w-full p-5 rounded-lg relative cursor-pointer text-left transition-all ${
                  approvalMode === "auto"
                    ? "border-2 border-primary bg-primary/5"
                    : "border-2 border-secondary/20 opacity-70"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Fully automatic</span>
                    <span className="px-2 py-0.5 bg-secondary text-on-secondary text-[10px] rounded-full uppercase font-black">
                      Pro
                    </span>
                  </div>
                  <span
                    className={`material-symbols-outlined ${
                      approvalMode === "auto"
                        ? "text-primary"
                        : "text-outline-variant"
                    }`}
                    style={
                      approvalMode === "auto"
                        ? { fontVariationSettings: "'FILL' 1" }
                        : undefined
                    }
                  >
                    {approvalMode === "auto"
                      ? "radio_button_checked"
                      : "radio_button_unchecked"}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Content goes straight to your socials without intervention.
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="mt-16 flex flex-col items-center">
        <button className="w-full max-w-md py-6 px-12 bg-gradient-to-br from-primary to-primary-dim text-on-primary rounded-xl font-headline font-black text-xl shadow-[0px_20px_40px_rgba(111,51,213,0.15)] hover:scale-[1.02] transition-all active:scale-95">
          Save and activate
        </button>
        <p className="mt-6 text-on-surface-variant text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">
            verified_user
          </span>
          You can pause or edit these settings at any time. No contracts.
        </p>
      </div>
    </div>
  );
}
