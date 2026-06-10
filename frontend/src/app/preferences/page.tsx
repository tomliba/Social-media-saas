import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PREF_FIELDS, type UserPrefs } from "@/lib/createOptions";
import PreferencesForm from "@/components/preferences/PreferencesForm";

// Always fresh — prefs can change between visits.
export const dynamic = "force-dynamic";

const select = Object.fromEntries(PREF_FIELDS.map((f) => [f, true])) as Record<string, true>;

export default async function PreferencesPage() {
  const session = await auth();
  let prefs: UserPrefs | null = null;
  if (session?.user?.id) {
    prefs = (await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
      select,
    })) as UserPrefs | null;
  }
  return <PreferencesForm initial={prefs} />;
}
