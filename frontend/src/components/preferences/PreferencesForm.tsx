"use client";

import { useState, useEffect } from "react";
import VoicePickerModal from "@/components/create/VoicePickerModal";
import CharacterPickerModal from "@/components/create/CharacterPickerModal";
import { ART_STYLES } from "@/lib/artStyles";
import { savePreferences } from "@/app/actions/preferences";
import {
  TONES_CHARACTER, TONES_STORY, BACKGROUND_MODES, CAPTION_STYLES,
  CAPTION_SIZES, CAPTION_TRANSFORMS, CAPTION_POSITIONS, MUSIC_TRACKS,
  VIDEO_LANGUAGES, CHARACTERS, TOPIC_PRESETS, SKELETON_COLORS,
  DURATIONS_CHARACTER, DURATIONS_STORY, DURATIONS_ARGUMENT, DURATIONS_SKELETON,
  CREATE_DEFAULTS, type UserPrefs,
} from "@/lib/createOptions";
import type { Voice } from "@/lib/voices";

const D = CREATE_DEFAULTS;

/* ── Small reusable controls ── */

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-container-lowest rounded-xl p-7 border border-outline-variant/10 shadow-[0px_20px_40px_rgba(111,51,213,0.04)]">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary">{icon}</span>
        <h2 className="text-base font-bold font-headline text-on-surface">{title}</h2>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 font-headline">{label}</p>
      {children}
    </div>
  );
}

function Pills<T extends string | number>({ options, value, onChange, render }: {
  options: readonly { id: T; label: string }[] | readonly T[];
  value: T;
  onChange: (v: T) => void;
  render?: (o: T) => string;
}) {
  const norm = (o: unknown): { id: T; label: string } =>
    typeof o === "object" ? (o as { id: T; label: string }) : { id: o as T, label: render ? render(o as T) : String(o) };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const { id, label } = norm(o);
        const sel = id === value;
        return (
          <button key={String(id)} type="button" onClick={() => onChange(id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-all ${sel ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container text-on-surface hover:bg-surface-container-high"}`}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center gap-3">
      <div className={`w-11 h-6 rounded-full relative transition-colors ${value ? "bg-primary" : "bg-outline-variant/40"}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? "left-6" : "left-1"}`} />
      </div>
      <span className="text-sm font-medium text-on-surface">{label}</span>
    </button>
  );
}

/* ── Art-style + caption-style + topic-preset chip grids ── */
function ChipGrid({ items, value, onChange }: { items: readonly { id: string; label: string; gradient?: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
      {items.map((it) => {
        const sel = it.id === value;
        return (
          <button key={it.id} type="button" onClick={() => onChange(it.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${sel ? "border-primary ring-1 ring-primary/40 bg-primary/5 text-primary" : "border-outline-variant/20 bg-surface-container text-on-surface hover:bg-surface-container-high"}`}>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function CaptionStylePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {CAPTION_STYLES.map((cs) => {
        const sel = cs.id === value;
        return (
          <button key={cs.id} type="button" onClick={() => onChange(cs.id)}
            className={`rounded-lg overflow-hidden border transition-all ${sel ? "border-primary ring-2 ring-primary/30" : "border-outline-variant/20 hover:border-outline-variant/50"}`}>
            <div className="h-12 bg-[#1a1a1a] flex items-center justify-center px-2" style={cs.containerStyle}>
              <span style={cs.baseStyle}>Sample <span style={cs.activeStyle as React.CSSProperties}>text</span></span>
            </div>
            <div className="text-[10px] font-bold py-1 bg-surface-container text-on-surface-variant">{cs.label}</div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Voice button (reuses VoicePickerModal) ── */
function VoiceButton({ voiceId, voiceName, onOpen }: { voiceId: string | null; voiceName: string | null; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high text-sm font-bold">
      <span className="material-symbols-outlined text-base">mic</span>
      <span>{voiceId ? (voiceName ?? "Voice set") : "Default voice"}</span>
      <span className="material-symbols-outlined text-base">expand_more</span>
    </button>
  );
}

interface ArgChar { id: string; name: string }

export default function PreferencesForm({
  initial,
  initialVoiceNames,
  initialArgChars,
}: {
  initial: UserPrefs | null;
  initialVoiceNames?: Record<string, string>;
  initialArgChars?: ArgChar[];
}) {
  const p = initial;
  // Global
  const [captionStyle, setCaptionStyle] = useState(p?.captionStyle ?? D.global.captionStyle);
  const [captionFontSize, setCaptionFontSize] = useState(p?.captionFontSize ?? D.global.captionFontSize);
  const [captionTransform, setCaptionTransform] = useState(p?.captionTransform ?? D.global.captionTransform);
  const [captionPosition, setCaptionPosition] = useState(p?.captionPosition ?? D.global.captionPosition);
  const [music, setMusic] = useState(p?.music ?? ""); // "" = per-format default
  const [filmGrain, setFilmGrain] = useState(p?.filmGrain ?? D.global.filmGrain);
  const [shakeEffect, setShakeEffect] = useState(p?.shakeEffect ?? D.global.shakeEffect);
  const [language, setLanguage] = useState(p?.language ?? D.global.language);
  // Character
  const [characterNiche, setCharacterNiche] = useState(p?.characterNiche ?? D.character.niche);
  const [characterName, setCharacterName] = useState(p?.characterName ?? D.character.character);
  const [characterVoiceId, setCharacterVoiceId] = useState<string | null>(p?.characterVoiceId ?? null);
  const [characterSpeed, setCharacterSpeed] = useState<number>(p?.characterSpeed ?? D.character.speed);
  const [characterBackgroundMode, setCharacterBackgroundMode] = useState(p?.characterBackgroundMode ?? D.character.backgroundMode);
  const [characterArtStyle, setCharacterArtStyle] = useState(p?.characterArtStyle ?? D.character.artStyle);
  const [characterTone, setCharacterTone] = useState(p?.characterTone ?? D.character.tone);
  const [characterDuration, setCharacterDuration] = useState(p?.characterDuration ?? D.character.duration);
  // Story
  const [storyTopicPreset, setStoryTopicPreset] = useState(p?.storyTopicPreset ?? "");
  const [storyArtStyle, setStoryArtStyle] = useState(p?.storyArtStyle ?? D.story.artStyle);
  const [storySceneMode, setStorySceneMode] = useState(p?.storySceneMode ?? D.story.sceneMode);
  const [storyTone, setStoryTone] = useState(p?.storyTone ?? D.story.tone);
  const [storyVoiceId, setStoryVoiceId] = useState<string | null>(p?.storyVoiceId ?? null);
  const [storyDuration, setStoryDuration] = useState<number>(p?.storyDuration ?? D.story.duration);
  // Argument
  const [argumentCharacterA, setArgumentCharacterA] = useState(p?.argumentCharacterA ?? D.argument.characterA);
  const [argumentCharacterB, setArgumentCharacterB] = useState(p?.argumentCharacterB ?? D.argument.characterB);
  const [argumentTone, setArgumentTone] = useState(p?.argumentTone ?? D.argument.tone);
  const [argumentDuration, setArgumentDuration] = useState<number>(p?.argumentDuration ?? D.argument.duration);
  // Skeleton
  const [skeletonColor, setSkeletonColor] = useState(p?.skeletonColor ?? D.skeleton.color);
  const [skeletonVoiceId, setSkeletonVoiceId] = useState<string | null>(p?.skeletonVoiceId ?? null);
  const [skeletonTone, setSkeletonTone] = useState(p?.skeletonTone ?? D.skeleton.tone);
  const [skeletonDuration, setSkeletonDuration] = useState<number>(p?.skeletonDuration ?? D.skeleton.duration);

  // Voice modals
  const [voiceModal, setVoiceModal] = useState<null | "character" | "story" | "skeleton">(null);
  const [voiceNames, setVoiceNames] = useState<Record<string, string>>(initialVoiceNames ?? {});
  const [characterModalOpen, setCharacterModalOpen] = useState(false);

  // Dynamic argument data (same endpoint the Argument flow uses)
  const [argChars, setArgChars] = useState<ArgChar[]>(initialArgChars ?? []);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // These lists are normally supplied server-side (initialVoiceNames /
    // initialArgChars) so there is no fetch on mount. Fall back to the client
    // fetch only if the server didn't provide them (e.g. the Flask backend was
    // unreachable during SSR).
    if (Object.keys(initialVoiceNames ?? {}).length === 0) {
      // Resolve voice ids → names for the voice buttons (same catalog the modal uses).
      fetch("/api/voices").then((r) => r.ok ? r.json() : null).then((d) => {
        if (!d?.voices) return;
        const map: Record<string, string> = {};
        for (const v of d.voices) map[v.fishAudioId] = v.name;
        setVoiceNames(map);
      }).catch(() => {});
    }
    if ((initialArgChars ?? []).length === 0) {
      fetch("/api/argument/characters").then((r) => r.ok ? r.json() : null).then((d) => {
        // The API returns { characters: { id: {...} } } (a keyed object), but can
        // also be a plain array — normalize both to a list for the dropdowns.
        const raw = d?.characters ?? d;
        const list: { id?: string; name?: string }[] = Array.isArray(raw)
          ? raw
          : raw && typeof raw === "object"
            ? Object.values(raw)
            : [];
        setArgChars(
          list
            .map((c) => ({ id: c.id ?? c.name ?? "", name: c.name ?? c.id ?? "" }))
            .filter((c) => c.id)
        );
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onVoiceSelect = (v: Voice) => {
    if (voiceModal === "character") setCharacterVoiceId(v.fishAudioId);
    else if (voiceModal === "story") setStoryVoiceId(v.fishAudioId);
    else if (voiceModal === "skeleton") setSkeletonVoiceId(v.fishAudioId);
    setVoiceNames((m) => ({ ...m, [v.fishAudioId]: v.name }));
    setVoiceModal(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const payload: Partial<UserPrefs> = {
      captionStyle, captionFontSize, captionTransform, captionPosition,
      music: music || null, filmGrain, shakeEffect, language,
      characterNiche, characterName, characterVoiceId, characterSpeed,
      characterBackgroundMode, characterArtStyle, characterTone, characterDuration,
      storyTopicPreset: storyTopicPreset || null, storyArtStyle, storySceneMode, storyTone, storyVoiceId, storyDuration,
      argumentCharacterA, argumentCharacterB, argumentTone, argumentDuration,
      skeletonColor, skeletonVoiceId, skeletonTone, skeletonDuration,
    };
    const res = await savePreferences(payload);
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  };

  const currentVoiceModalId =
    voiceModal === "character" ? characterVoiceId :
    voiceModal === "story" ? storyVoiceId :
    voiceModal === "skeleton" ? skeletonVoiceId : null;

  return (
    <div className="max-w-4xl mx-auto pt-4 pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-black font-headline tracking-tight text-on-surface mb-1">Preferences</h1>
        <p className="text-on-surface-variant text-sm">
          Set your default look and per-format settings. These pre-fill the Create flow — you can still change anything per video. Leave a setting as-is to keep the current default.
        </p>
      </div>

      <div className="space-y-6">
        {/* GLOBAL LOOK */}
        <Card title="Global look (all formats)" icon="palette">
          <Field label="Caption style"><CaptionStylePicker value={captionStyle} onChange={setCaptionStyle} /></Field>
          <div className="grid sm:grid-cols-2 gap-6">
            <Field label="Caption size"><Pills options={CAPTION_SIZES} value={captionFontSize} onChange={setCaptionFontSize} render={(s) => String(s)} /></Field>
            <Field label="Caption position"><Pills options={CAPTION_POSITIONS} value={captionPosition} onChange={setCaptionPosition} /></Field>
          </div>
          <Field label="Caption transform"><Pills options={CAPTION_TRANSFORMS} value={captionTransform} onChange={setCaptionTransform} /></Field>
          <Field label="Music">
            <select value={music} onChange={(e) => setMusic(e.target.value)} className="w-full max-w-xs bg-surface-container border border-outline-variant/20 rounded-lg p-2.5 text-sm text-on-surface">
              <option value="">Per-format default</option>
              <option value="none">No music</option>
              {MUSIC_TRACKS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Language">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full max-w-xs bg-surface-container border border-outline-variant/20 rounded-lg p-2.5 text-sm text-on-surface">
              {VIDEO_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <p className="text-xs text-on-surface-variant/60 mt-1">Not used by Argument videos.</p>
          </Field>
          <div className="flex gap-8">
            <Toggle label="Film grain" value={filmGrain} onChange={setFilmGrain} />
            <Toggle label="Shake effect" value={shakeEffect} onChange={setShakeEffect} />
          </div>
        </Card>

        {/* CHARACTER */}
        <Card title="Character video" icon="person_play">
          <Field label="Niche">
            <input value={characterNiche} onChange={(e) => setCharacterNiche(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-lg p-2.5 text-sm text-on-surface" placeholder="e.g., fitness tips" />
          </Field>
          <div className="flex flex-wrap gap-3 items-center">
            <button type="button" onClick={() => setCharacterModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high text-sm font-bold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CHARACTERS.find((c) => c.name === characterName)?.image} alt="" className="w-5 h-5 object-contain" />
              <span>{characterName}</span><span className="material-symbols-outlined text-base">expand_more</span>
            </button>
            <VoiceButton voiceId={characterVoiceId} voiceName={characterVoiceId ? voiceNames[characterVoiceId] : null} onOpen={() => setVoiceModal("character")} />
          </div>
          <Field label="Speed"><Pills options={[{ id: 0.85, label: "Slow" }, { id: 1.0, label: "Normal" }, { id: 1.15, label: "Fast" }]} value={characterSpeed} onChange={setCharacterSpeed} /></Field>
          <Field label="Background mode"><Pills options={BACKGROUND_MODES.map((b) => ({ id: b.label, label: b.label }))} value={characterBackgroundMode} onChange={setCharacterBackgroundMode} /></Field>
          {(characterBackgroundMode === "AI Images" || characterBackgroundMode === "Animated AI") && (
            <Field label="Art style"><ChipGrid items={ART_STYLES} value={characterArtStyle} onChange={setCharacterArtStyle} /></Field>
          )}
          <Field label="Tone"><Pills options={TONES_CHARACTER.map((t) => ({ id: t.label, label: `${t.emoji} ${t.label}` }))} value={characterTone} onChange={setCharacterTone} /></Field>
          <Field label="Duration"><Pills options={DURATIONS_CHARACTER} value={characterDuration} onChange={setCharacterDuration} render={(d) => String(d)} /></Field>
        </Card>

        {/* AI STORY */}
        <Card title="AI voice story" icon="auto_stories">
          <Field label="Topic preset">
            <select value={storyTopicPreset} onChange={(e) => setStoryTopicPreset(e.target.value)} className="w-full max-w-sm bg-surface-container border border-outline-variant/20 rounded-lg p-2.5 text-sm text-on-surface">
              <option value="">No default</option>
              {TOPIC_PRESETS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Art style"><ChipGrid items={ART_STYLES} value={storyArtStyle} onChange={setStoryArtStyle} /></Field>
          <Field label="Scene mode"><Pills options={[{ id: "static", label: "Static" }, { id: "animated", label: "Animated" }]} value={storySceneMode} onChange={setStorySceneMode} /></Field>
          <Field label="Voice"><VoiceButton voiceId={storyVoiceId} voiceName={storyVoiceId ? voiceNames[storyVoiceId] : null} onOpen={() => setVoiceModal("story")} /></Field>
          <Field label="Tone"><Pills options={TONES_STORY} value={storyTone} onChange={setStoryTone} /></Field>
          <Field label="Duration"><Pills options={DURATIONS_STORY} value={storyDuration} onChange={setStoryDuration} render={(d) => `${d}s`} /></Field>
        </Card>

        {/* ARGUMENT */}
        <Card title="Argument video" icon="forum">
          <div className="grid sm:grid-cols-2 gap-6">
            <Field label="Character A">
              <select value={argumentCharacterA} onChange={(e) => setArgumentCharacterA(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-lg p-2.5 text-sm text-on-surface">
                {argChars.length === 0 && <option value={argumentCharacterA}>{argumentCharacterA}</option>}
                {argChars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Character B">
              <select value={argumentCharacterB} onChange={(e) => setArgumentCharacterB(e.target.value)} className="w-full bg-surface-container border border-outline-variant/20 rounded-lg p-2.5 text-sm text-on-surface">
                {argChars.length === 0 && <option value={argumentCharacterB}>{argumentCharacterB}</option>}
                {argChars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Tone"><Pills options={TONES_STORY} value={argumentTone} onChange={setArgumentTone} /></Field>
          <Field label="Duration"><Pills options={DURATIONS_ARGUMENT} value={argumentDuration} onChange={setArgumentDuration} render={(d) => `${d}s`} /></Field>
        </Card>

        {/* SKELETON */}
        <Card title="Skeleton video" icon="skeleton">
          <Field label="Skeleton color"><Pills options={SKELETON_COLORS.map((s) => ({ id: s.id, label: s.label }))} value={skeletonColor} onChange={setSkeletonColor} /></Field>
          <Field label="Voice"><VoiceButton voiceId={skeletonVoiceId} voiceName={skeletonVoiceId ? voiceNames[skeletonVoiceId] : null} onOpen={() => setVoiceModal("skeleton")} /></Field>
          <Field label="Tone"><Pills options={TONES_STORY} value={skeletonTone} onChange={setSkeletonTone} /></Field>
          <Field label="Duration"><Pills options={DURATIONS_SKELETON} value={skeletonDuration} onChange={setSkeletonDuration} render={(d) => `${d}s`} /></Field>
        </Card>
      </div>

      {/* Save bar */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white/85 backdrop-blur-xl px-8 py-4 shadow-[0px_-10px_30px_rgba(0,0,0,0.04)] flex items-center justify-end gap-4 z-40">
        {saved && <span className="text-sm font-bold text-emerald-600 flex items-center gap-1"><span className="material-symbols-outlined text-base">check_circle</span>Saved</span>}
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-8 py-3 rounded-full bg-primary text-on-primary font-label font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-60">
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>

      {/* Reused modals */}
      <CharacterPickerModal open={characterModalOpen} onClose={() => setCharacterModalOpen(false)} onSelect={(c) => { setCharacterName(c.name); setCharacterModalOpen(false); }} characters={CHARACTERS as unknown as { name: string; image: string; color: string }[]} currentName={characterName} />
      <VoicePickerModal open={voiceModal !== null} onClose={() => setVoiceModal(null)} onSelect={onVoiceSelect} currentVoiceId={currentVoiceModalId ?? undefined} />
    </div>
  );
}
