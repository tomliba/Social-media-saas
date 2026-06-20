"use client";

import { useState } from "react";
import { savePreferences } from "@/app/actions/preferences";

/**
 * One-field "what's your niche?" prompt shown on the first Create visit when the
 * user has no saved niche. Saving writes UserPreferences.characterNiche (the same
 * value every Create flow pre-fills from), after which this never shows again.
 * "Maybe later" dismisses it on this device without saving.
 */
export default function NicheFirstUseModal({
  onSaved,
  onSkip,
}: {
  onSaved: (niche: string) => void;
  onSkip: () => void;
}) {
  const [niche, setNiche] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const value = niche.trim();
    if (!value || saving) return;
    setSaving(true);
    const res = await savePreferences({ characterNiche: value });
    setSaving(false);
    if (res.ok) onSaved(value);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-6"
      onClick={onSkip}
    >
      <div
        className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-8 shadow-[0px_30px_60px_rgba(111,51,213,0.2)] border border-outline-variant/15"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 mb-5 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </div>
        <h2 className="text-2xl font-bold font-headline text-on-surface mb-2">
          What&apos;s your niche?
        </h2>
        <p className="text-on-surface-variant text-sm mb-6">
          We&apos;ll use it to tailor every idea, topic, and script we generate for you. You can
          change it anytime in Preferences.
        </p>
        <input
          type="text"
          value={niche}
          autoFocus
          onChange={(e) => setNiche(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          placeholder="e.g., fitness tips, medical facts, personal finance"
          className="w-full bg-surface-container border border-outline-variant/20 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/40 focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all font-body text-sm mb-6"
        />
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onSkip}
            className="px-5 py-2.5 rounded-full font-bold font-headline text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Maybe later
          </button>
          <button
            onClick={handleSave}
            disabled={!niche.trim() || saving}
            className="px-6 py-2.5 primary-gradient text-on-primary rounded-full font-bold font-headline text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save niche"}
          </button>
        </div>
      </div>
    </div>
  );
}
