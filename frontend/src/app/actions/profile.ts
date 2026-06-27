"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidCountryCode } from "@/lib/countries";

const USERNAME_MAX = 40;

export interface SaveProfileResult {
  ok: boolean;
  error?: string;
}

/**
 * Update the current user's editable profile fields (username, country). Email
 * is intentionally NOT writable here. Both fields are optional; an empty value
 * clears them. Username is not unique (product choice) — just trimmed/capped.
 */
export async function saveProfile(data: {
  username?: string;
  country?: string;
}): Promise<SaveProfileResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const userId = session.user.id;

  const update: { username?: string | null; country?: string | null } = {};

  if ("username" in data) {
    const raw = (data.username ?? "").trim();
    if (raw.length > USERNAME_MAX) {
      return { ok: false, error: `Username must be ${USERNAME_MAX} characters or fewer.` };
    }
    update.username = raw === "" ? null : raw;
  }

  if ("country" in data) {
    const raw = (data.country ?? "").trim();
    if (raw !== "" && !isValidCountryCode(raw)) {
      return { ok: false, error: "Unrecognized country." };
    }
    update.country = raw === "" ? null : raw;
  }

  if (Object.keys(update).length === 0) return { ok: true };

  await prisma.user.update({ where: { id: userId }, data: update });
  revalidatePath("/accounts");
  return { ok: true };
}
