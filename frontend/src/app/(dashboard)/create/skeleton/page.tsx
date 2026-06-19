"use client";

import { Suspense } from "react";
import SkeletonSetup from "@/components/create/SkeletonSetup";
import { usePreferenceDefaults } from "@/lib/usePreferenceDefaults";

export default function SkeletonPage() {
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
      <SkeletonSetup prefs={prefs} />
    </Suspense>
  );
}
