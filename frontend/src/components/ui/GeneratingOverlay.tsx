"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

// Waiting screen for genuine generation waits (e.g. an LLM call) where it helps
// to narrate what's happening. Cycles through `messages` on a timer. Uses the
// self-contained <Spinner/>, so it never depends on the remote Material Symbols
// icon font. For brief save/upload gaps with a fixed message, use <LoadingState/>.

const DEFAULT_MESSAGES = [
  "Analyzing market positioning…",
  "Mapping audience psychology…",
  "Finding creative angles…",
  "Writing your brief…",
];

export function GeneratingOverlay({
  title = "Working on it…",
  messages = DEFAULT_MESSAGES,
  className = "",
}: {
  title?: string;
  messages?: string[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 2500);
    return () => clearInterval(id);
  }, [messages]);

  return (
    <section
      className={`max-w-md mx-auto text-center animate-in fade-in duration-300 ${className}`}
    >
      <Spinner size="lg" className="text-primary mb-4" />
      <h2 className="text-xl font-bold font-headline mb-2">{title}</h2>
      {messages.length > 0 && (
        <p
          key={index}
          className="text-on-surface-variant text-sm animate-in fade-in duration-500"
        >
          {messages[index]}
        </p>
      )}
    </section>
  );
}
