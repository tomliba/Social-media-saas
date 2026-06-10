"use client";

import { useState, useEffect } from "react";
import type { UserPrefs } from "@/lib/createOptions";

/**
 * Fetches the current user's saved per-format preferences once.
 * `loaded` flips true after the fetch settles (whether or not a row exists).
 * Create-flow wrappers gate on `loaded` so the setup mounts with prefs already
 * available as initial values; `prefs` is null when the user has saved nothing,
 * in which case every flow keeps its hardcoded defaults (zero behavior change).
 */
export function usePreferenceDefaults(): { prefs: UserPrefs | null; loaded: boolean } {
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setPrefs((d?.prefs as UserPrefs | null) ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { prefs, loaded };
}
