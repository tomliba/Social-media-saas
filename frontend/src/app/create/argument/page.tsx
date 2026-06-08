"use client";

import { Suspense } from "react";
import ArgumentSetup from "@/components/create/ArgumentSetup";
import { usePreferenceDefaults } from "@/lib/usePreferenceDefaults";

export default function ArgumentPage() {
  const { prefs, loaded } = usePreferenceDefaults();
  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">progressactivity</span>
      </div>
    );
  }
  return (
    <Suspense>
      <ArgumentSetup prefs={prefs} />
    </Suspense>
  );
}
