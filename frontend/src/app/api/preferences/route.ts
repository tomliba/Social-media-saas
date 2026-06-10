import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PREF_FIELDS } from "@/lib/createOptions";

// Prisma select object covering only the pref columns.
const select = Object.fromEntries(PREF_FIELDS.map((f) => [f, true])) as Record<string, true>;

// GET /api/preferences — the current user's saved per-format defaults (or null).
// Used by the Create flows to seed their initial values client-side.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
    select,
  });
  return NextResponse.json({ prefs: prefs ?? null });
}
