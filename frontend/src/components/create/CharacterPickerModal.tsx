"use client";

import { useState, useEffect } from "react";

export interface Character {
  name: string;
  image: string;
  color: string;
}

interface CharacterPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (character: Character) => void;
  characters: Character[];
  currentName?: string;
}

export default function CharacterPickerModal({
  open,
  onClose,
  onSelect,
  characters,
  currentName,
}: CharacterPickerModalProps) {
  const [selected, setSelected] = useState<Character | null>(null);

  // Pre-select current character on open
  useEffect(() => {
    if (open) {
      const match = currentName
        ? characters.find((c) => c.name === currentName) ?? null
        : null;
      setSelected(match);
    }
  }, [open, currentName, characters]);

  const handleConfirm = () => {
    if (!selected) return;
    onSelect(selected);
    onClose();
  };

  if (!open) return null;

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
            Choose Character
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

        {/* Scrollable grid */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 no-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {characters.map((char) => {
              const isSelected = selected?.name === char.name;
              return (
                <button
                  key={char.name}
                  onClick={() => setSelected(char)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                    isSelected
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  }`}
                >
                  <div
                    className={`w-44 h-44 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br ${char.color}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={char.image}
                      alt={char.name}
                      className="w-[152px] h-[152px] object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-on-surface">
                      {char.name}
                    </span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-primary text-lg">
                        check
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/20 flex items-center justify-between">
          <div className="text-sm text-on-surface-variant">
            {selected ? (
              <>
                Selected: <span className="font-semibold text-on-surface">{selected.name}</span>
              </>
            ) : (
              "Select a character"
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
              disabled={!selected}
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
