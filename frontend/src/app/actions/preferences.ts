"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PREF_FIELDS, type UserPrefs } from "@/lib/createOptions";

const NUMBER_FIELDS = new Set([
  "characterSpeed",
  "storyDuration",
  "argumentDuration",
  "skeletonDuration",
]);
const BOOLEAN_FIELDS = new Set(["filmGrain", "shakeEffect"]);

/**
 * Upsert the current user's per-format preferences. Each field is nullable;
 * null means "no preference" so the Create flow keeps its hardcoded default.
 * Only whitelisted pref columns are written.
 */
export async function savePreferences(
  data: Partial<UserPrefs>
): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };
  const userId = session.user.id;

  const clean: Record<string, string | number | boolean | null> = {};
  for (const field of PREF_FIELDS) {
    if (!(field in data)) continue;
    const raw = (data as Record<string, unknown>)[field];
    if (raw === null || raw === undefined || raw === "") {
      clean[field] = null;
    } else if (NUMBER_FIELDS.has(field)) {
      const n = Number(raw);
      clean[field] = Number.isFinite(n) ? n : null;
    } else if (BOOLEAN_FIELDS.has(field)) {
      clean[field] = Boolean(raw);
    } else {
      clean[field] = String(raw);
    }
  }

  await prisma.userPreferences.upsert({
    where: { userId },
    create: { userId, ...clean },
    update: clean,
  });
  return { ok: true };
}
