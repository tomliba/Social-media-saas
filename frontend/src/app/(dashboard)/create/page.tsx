"use client";

import { useState, useRef, useEffect } from "react";
import FormatPicker from "@/components/create/FormatPicker";
import InputMethodSelection from "@/components/create/InputMethodSelection";
import NicheFirstUseModal from "@/components/create/NicheFirstUseModal";
import { usePreferenceDefaults } from "@/lib/usePreferenceDefaults";

const NICHE_PROMPT_DISMISSED_KEY = "nichePromptDismissed";

export default function CreatePage() {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  // First-use niche prompt: show once when the user has no saved niche.
  const { prefs, loaded } = usePreferenceDefaults();
  const [showNichePrompt, setShowNichePrompt] = useState(false);
  useEffect(() => {
    if (!loaded) return;
    const dismissed =
      typeof window !== "undefined" &&
      localStorage.getItem(NICHE_PROMPT_DISMISSED_KEY) === "1";
    if (!prefs?.characterNiche && !dismissed) setShowNichePrompt(true);
  }, [loaded, prefs]);

  const dismissNichePrompt = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(NICHE_PROMPT_DISMISSED_KEY, "1");
    }
    setShowNichePrompt(false);
  };

  useEffect(() => {
    if (selectedFormat && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } else {
      setHeight(0);
    }
  }, [selectedFormat]);

  return (
    <main className="pt-28 pb-20 px-6 max-w-screen-xl mx-auto">
      {showNichePrompt && (
        <NicheFirstUseModal
          onSaved={() => setShowNichePrompt(false)}
          onSkip={dismissNichePrompt}
        />
      )}

      {/* Header */}
      <header className="mb-12">
        <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-2">
          What&apos;s the format?
        </h1>
        <p className="text-on-surface-variant text-lg">
          Select a medium to start your next masterpiece.
        </p>
      </header>

      {/* Format Picker - 2x2 Grid */}
      <FormatPicker
        selectedFormat={selectedFormat}
        onSelect={setSelectedFormat}
      />

      {/* Input Method Selection — slides in after format is picked */}
      <div
        ref={sectionRef}
        style={{
          maxHeight: height,
          opacity: selectedFormat ? 1 : 0,
          transform: selectedFormat ? "translateY(0)" : "translateY(2rem)",
          transition: "max-height 0.5s ease-out, opacity 0.4s ease-out, transform 0.4s ease-out",
          overflow: "hidden",
        }}
      >
        <div ref={contentRef}>
          <InputMethodSelection selectedFormat={selectedFormat} />
        </div>
      </div>
    </main>
  );
}
