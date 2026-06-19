"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ACCEPTED = ".pdf,.docx,.txt,.md";
const MAX_SIZE = 5 * 1024 * 1024;

const tones = [
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

export default function UploadContentPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [tone, setTone] = useState("Funny");
  const [duration, setDuration] = useState("30s");
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  };

  const validateAndSetFile = (f: File) => {
    setError(null);
    if (f.size > MAX_SIZE) {
      setError("File exceeds 5 MB limit");
      return;
    }
    const ext = f.name.toLowerCase().split(".").pop();
    if (!["pdf", "docx", "txt", "md"].includes(ext || "")) {
      setError("Unsupported file type. Use PDF, DOCX, or TXT.");
      return;
    }
    setFile(f);
  };

  const handleGenerate = async () => {
    setError(null);
    let sourceText = pastedText.trim();

    // Extract text from file if uploaded
    if (file && !sourceText) {
      setExtracting(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/extract-content", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to extract text");
          setExtracting(false);
          return;
        }
        sourceText = data.text;
      } catch {
        setError("Failed to extract text from file");
        setExtracting(false);
        return;
      }
      setExtracting(false);
    }

    if (!sourceText) {
      setError("Upload a file or paste text to continue");
      return;
    }

    // Send to Gemini via generate-scripts with sourceText as customPrompt
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: "Upload",
          ideas: [],
          tone,
          duration,
          customPrompt: `Turn the following content into a viral short-form video script. Extract the most interesting and engaging points. Do NOT just summarize — make it entertaining and hook-driven.\n\nSource content:\n${sourceText}`,
        }),
      });
      const data = await res.json();
      if (data.scripts?.[0]) {
        const params = new URLSearchParams();
        params.set("format", "video");
        params.set("template", "Upload");
        params.set("tone", tone);
        params.set("duration", duration);
        params.set("pastedScript", data.scripts[0].script);
        router.push(`/create/editor?${params.toString()}`);
      } else {
        setError("Failed to generate script. Try again");
      }
    } catch {
      setError("Failed to generate script");
    } finally {
      setGenerating(false);
    }
  };

  const hasInput = !!file || !!pastedText.trim();
  const isWorking = extracting || generating;

  return (
    <main className="pt-24 pb-32 px-6 md:px-12 lg:px-16 max-w-screen-xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex items-center gap-4">
        <Link
          href="/create"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-lowest hover:bg-surface-container-high transition-all active:scale-90 shadow-sm text-primary"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
            Upload content
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Upload a file or paste text. AI turns it into a video script
          </p>
        </div>
      </header>

      <div className="max-w-2xl space-y-8">
        {/* Tone */}
        <div>
          <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
            Tone
          </span>
          <div className="flex flex-wrap gap-2">
            {tones.map((t) => (
              <button
                key={t.label}
                onClick={() => setTone(t.label)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  tone === t.label
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                    : "bg-surface-container-highest text-on-surface hover:bg-surface-dim"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
            Duration
          </span>
          <div className="flex gap-2">
            {["15s", "30s", "60s"].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  duration === d
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                    : "bg-surface-container-highest text-on-surface hover:bg-surface-dim"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* File upload zone */}
        <div>
          <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
            Upload a file
          </span>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              file
                ? "border-primary/40 bg-primary/5"
                : "border-outline-variant/30 hover:border-primary/30 hover:bg-surface-container-low"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) validateAndSetFile(f);
              }}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <span className="material-symbols-outlined text-primary text-3xl">
                  description
                </span>
                <div className="text-left">
                  <p className="font-bold text-on-surface">{file.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="ml-4 p-1 rounded-full hover:bg-surface-container-highest transition-colors"
                >
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">
                    close
                  </span>
                </button>
              </div>
            ) : (
              <>
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/50 mb-2">
                  cloud_upload
                </span>
                <p className="font-bold text-on-surface mb-1">
                  Drop a file here or click to browse
                </p>
                <p className="text-xs text-on-surface-variant">
                  PDF, DOCX, or TXT. Max 5 MB
                </p>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-grow h-px bg-outline-variant/20" />
          <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">
            or
          </span>
          <div className="flex-grow h-px bg-outline-variant/20" />
        </div>

        {/* Paste text area */}
        <div>
          <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
            Paste text
          </label>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste an article, blog post, notes, or any text you want turned into a video..."
            className="w-full min-h-[200px] bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body leading-relaxed resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!hasInput || isWorking}
          className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isWorking ? (
            <>
              <span className="material-symbols-outlined animate-spin text-sm">
                progress_activity
              </span>
              {extracting ? "Extracting text..." : "Generating script..."}
            </>
          ) : (
            <>
              <span
                className="material-symbols-outlined text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              Generate video script
            </>
          )}
        </button>
      </div>
    </main>
  );
}
