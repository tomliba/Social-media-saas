"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PasteScriptPage() {
  const router = useRouter();
  const [script, setScript] = useState("");

  const handleContinue = () => {
    if (!script.trim()) return;
    const params = new URLSearchParams();
    params.set("format", "video");
    params.set("template", "Custom");
    params.set("pastedScript", script.trim());
    router.push(`/create/editor?${params.toString()}`);
  };

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
            Paste your own script
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Paste your text below — we'll turn it into a video. You can still edit it on the next screen.
          </p>
        </div>
      </header>

      {/* Textarea */}
      <div className="max-w-2xl">
        <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
          Your script
        </label>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Paste your own text — AI turns it into a video."
          className="w-full min-h-[300px] bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body leading-relaxed resize-none mb-6"
          autoFocus
        />

        <div className="flex items-center gap-4">
          <button
            onClick={handleContinue}
            disabled={!script.trim()}
            className="px-8 py-3 primary-gradient text-on-primary rounded-full font-bold font-headline shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
            Continue to editor
          </button>
          <span className="text-sm text-on-surface-variant">
            No AI rewriting — your text goes straight to the editor
          </span>
        </div>
      </div>
    </main>
  );
}
