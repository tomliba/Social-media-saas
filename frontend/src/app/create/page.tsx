"use client";

import { useState, useRef, useEffect } from "react";
import FormatPicker from "@/components/create/FormatPicker";
import InputMethodSelection from "@/components/create/InputMethodSelection";

export default function CreatePage() {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

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
