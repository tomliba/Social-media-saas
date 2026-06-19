import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LibraryClient, { type ContentItem } from "./LibraryClient";

// Server-rendered: the user's content is fetched here and embedded in the HTML,
// so the page paints with data already present instead of mounting an empty
// client component that then fetches /api/library (the old waterfall). The
// route's loading.tsx shows a skeleton while this runs.
export default async function LibraryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const rows = await prisma.contentItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // Dates aren't serializable across the server/client boundary as the client
  // expects (it treats them as ISO strings), so normalize them here.
  const initialItems: ContentItem[] = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })) as unknown as ContentItem[];

  return <LibraryClient initialItems={initialItems} />;
}
