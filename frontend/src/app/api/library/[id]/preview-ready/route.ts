import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCallbackSecret } from "@/lib/callback-auth";

// POST /api/library/[id]/preview-ready — update item with preview data
// Called by prepare-assets Trigger.dev task (server-to-server). Authenticated by
// the shared callback secret (same as /complete), since there is no user session.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyCallbackSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { status, previewData, creativeSettings, resolvedSegments, durationSec } = body;

  const item = await prisma.contentItem.findUnique({ where: { id } });
  console.log("[preview-ready] Prisma result:", item ? "found" : "not found", "id:", id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.contentItem.update({
    where: { id },
    data: {
      status: status ?? "preview",
      previewData: previewData ?? null,
      creativeSettings: creativeSettings ?? null,
      resolvedSegments: resolvedSegments ?? null,
      ...(durationSec !== undefined && { durationSec }),
    },
  });

  return NextResponse.json({ item: updated });
}
