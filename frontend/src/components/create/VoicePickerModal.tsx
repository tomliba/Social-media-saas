"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Voice } from "@/lib/voices";

const RECENT_VOICES_KEY = "recentVoices";
const MAX_RECENT = 3;

const GENDER_FILTERS = ["All", "Male", "Female"] as const;
const VIBE_TAGS = ["Deep", "Energetic", "Calm", "Professional", "Soft", "Narration"] as const;

function getRecentVoices(): Voice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_VOICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentVoice(voice: Voice) {
  try {
    const recent = getRecentVoices().filter(
      (v) => v.fishAudioId !== voice.fishAudioId
    );
    recent.unshift(voice);
    localStorage.setItem(
      RECENT_VOICES_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT))
    );
  } catch {
    // localStorage unavailable
  }
}

interface VoicePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (voice: Voice) => void;
  currentVoiceId?: string;
}

export default function VoicePickerModal({
  open,
  onClose,
  onSelect,
  currentVoiceId,
}: VoicePickerModalProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("All");
  const [vibeFilter, setVibeFilter] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recentVoices, setRecentVoices] = useState<Voice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch voices from API
  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (genderFilter !== "All") params.set("gender", genderFilter.toLowerCase());
    if (vibeFilter) params.set("vibe", vibeFilter);

    fetch(`/api/voices?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.voices && Array.isArray(data.voices)) {
          setVoices(data.voices);
        }
      })
      .catch(() => {
        // Keep fallback voices
      });
  }, [open, search, genderFilter, vibeFilter]);

  // Load recent voices on open
  useEffect(() => {
    if (open) {
      setRecentVoices(getRecentVoices());
      setSelectedVoice(null);
    }
  }, [open]);

  // Pre-select current voice
  useEffect(() => {
    if (open && currentVoiceId && !selectedVoice) {
      const match = voices.find((v) => v.fishAudioId === currentVoiceId);
      if (match) setSelectedVoice(match);
    }
  }, [open, currentVoiceId, voices, selectedVoice]);

  // Stop audio on close
  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
    }
  }, [open]);

  const playSample = useCallback(
    (voice: Voice, e: React.MouseEvent) => {
      e.stopPropagation();

      if (playingId === voice.fishAudioId) {
        audioRef.current?.pause();
        setPlayingId(null);
        return;
      }

      if (!voice.sampleUrl) return;

      if (audioRef.current) audioRef.current.pause();

      const audio = new Audio(voice.sampleUrl);
      audioRef.current = audio;
      setPlayingId(voice.fishAudioId);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      audio.play();
    },
    [playingId]
  );

  const handleConfirm = () => {
    if (!selectedVoice) return;
    saveRecentVoice(selectedVoice);
    onSelect(selectedVoice);
    onClose();
  };

  if (!open) return null;

  // Filter recent voices that exist in current voice list
  const filteredRecent = recentVoices.filter(
    (rv) => !voices.some((v) => v.fishAudioId === rv.fishAudioId)
      ? true // keep recent voices even if not in current filtered list
      : true
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <h2 className="text-xl font-bold font-headline text-on-surface">
            Choose Voice
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant">
              close
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Search voices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="px-6 pt-3 pb-2 flex flex-wrap gap-2">
          {GENDER_FILTERS.map((g) => (
            <button
              key={g}
              onClick={() => setGenderFilter(g)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                genderFilter === g
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-dim"
              }`}
            >
              {g}
            </button>
          ))}
          <div className="w-px h-6 bg-outline-variant/30 self-center mx-1" />
          {VIBE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setVibeFilter(vibeFilter === tag ? null : tag)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                vibeFilter === tag
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-dim"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 no-scrollbar">
          {/* Recently Used */}
          {filteredRecent.length > 0 && !search && genderFilter === "All" && !vibeFilter && (
            <div className="mb-4">
              <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 font-headline">
                Recently Used
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {filteredRecent.map((voice) => (
                  <VoiceCard
                    key={`recent-${voice.fishAudioId}`}
                    voice={voice}
                    isSelected={selectedVoice?.fishAudioId === voice.fishAudioId}
                    isPlaying={playingId === voice.fishAudioId}
                    onSelect={() => setSelectedVoice(voice)}
                    onPlay={(e) => playSample(voice, e)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Voices */}
          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 font-headline">
            {search || genderFilter !== "All" || vibeFilter ? "Results" : "All Voices"}
          </div>
          {voices.length === 0 ? (
            <p className="text-sm text-on-surface-variant/60 py-8 text-center">
              No voices found
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {voices.map((voice) => (
                <VoiceCard
                  key={voice.fishAudioId}
                  voice={voice}
                  isSelected={selectedVoice?.fishAudioId === voice.fishAudioId}
                  isPlaying={playingId === voice.fishAudioId}
                  onSelect={() => setSelectedVoice(voice)}
                  onPlay={(e) => playSample(voice, e)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/20 flex items-center justify-between">
          <div className="text-sm text-on-surface-variant">
            {selectedVoice ? (
              <>
                Selected: <span className="font-semibold text-on-surface">{selectedVoice.name}</span>
              </>
            ) : (
              "Select a voice"
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedVoice}
              className="px-6 py-2.5 rounded-full text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Voice Card ──

function VoiceCard({
  voice,
  isSelected,
  isPlaying,
  onSelect,
  onPlay,
}: {
  voice: Voice;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onPlay: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
        isSelected
          ? "bg-primary/10 ring-2 ring-primary"
          : "bg-surface-container-low hover:bg-surface-container-high"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-on-surface truncate">
          {voice.name}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-medium capitalize">
            {voice.gender}
          </span>
          {voice.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-container text-on-primary-container font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        {voice.sampleUrl && (
          <span
            onClick={onPlay}
            className={`material-symbols-outlined text-2xl p-1 rounded-full hover:bg-primary/20 transition-colors cursor-pointer ${
              isPlaying ? "text-primary animate-pulse" : "text-on-surface-variant"
            }`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isPlaying ? "stop_circle" : "play_circle"}
          </span>
        )}
        {isSelected && (
          <span className="material-symbols-outlined text-primary text-lg">
            check
          </span>
        )}
      </div>
    </button>
  );
}
