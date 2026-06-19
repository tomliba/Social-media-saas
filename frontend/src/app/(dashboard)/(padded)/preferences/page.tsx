import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PREF_FIELDS, type UserPrefs } from "@/lib/createOptions";
import PreferencesForm from "@/components/preferences/PreferencesForm";

// Always fresh — prefs can change between visits.
export const dynamic = "force-dynamic";

const select = Object.fromEntries(PREF_FIELDS.map((f) => [f, true])) as Record<string, true>;

const FLASK_URL = process.env.FLASK_API_URL;
const FLASK_KEY = process.env.FLASK_API_KEY;

// Voice id → name map for the voice buttons. Fetched server-side (cached 5 min)
// so PreferencesForm renders with it instead of fetching /api/voices on mount.
async function fetchVoiceNames(): Promise<Record<string, string>> {
  if (!FLASK_URL) return {};
  try {
    const res = await fetch(`${FLASK_URL}/voices/list`, {
      headers: FLASK_KEY ? { "X-API-Key": FLASK_KEY } : undefined,
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const map: Record<string, string> = {};
    for (const v of data?.voices ?? []) map[v.fishAudioId] = v.name;
    return map;
  } catch {
    return {};
  }
}

// Argument character list for the dropdowns. Same source the Argument flow uses;
// cached 5 min and rendered server-side to drop the on-mount client fetch.
async function fetchArgChars(): Promise<{ id: string; name: string }[]> {
  if (!FLASK_URL) return [];
  try {
    const res = await fetch(`${FLASK_URL}/vg/argument/characters`, {
      headers: FLASK_KEY ? { "X-API-Key": FLASK_KEY } : undefined,
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data?.characters ?? data;
    const list: { id?: string; name?: string }[] = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object"
        ? Object.values(raw)
        : [];
    return list
      .map((c) => ({ id: c.id ?? c.name ?? "", name: c.name ?? c.id ?? "" }))
      .filter((c) => c.id);
  } catch {
    return [];
  }
}

export default async function PreferencesPage() {
  const session = await auth();

  let prefs: UserPrefs | null = null;
  let voiceNames: Record<string, string> = {};
  let argChars: { id: string; name: string }[] = [];

  if (session?.user?.id) {
    [prefs, voiceNames, argChars] = await Promise.all([
      prisma.userPreferences.findUnique({
        where: { userId: session.user.id },
        select,
      }) as Promise<UserPrefs | null>,
      fetchVoiceNames(),
      fetchArgChars(),
    ]);
  }

  return (
    <PreferencesForm
      initial={prefs}
      initialVoiceNames={voiceNames}
      initialArgChars={argChars}
    />
  );
}
