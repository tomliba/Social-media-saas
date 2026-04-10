import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/library/[id]/complete — update item status after render
// Called by Trigger.dev job (server-to-server, uses jobId lookup)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status, videoUrl, thumbnailUrl, renderTimeSec, error, previewData } = body;

  if (!status || !["ready", "failed", "preview"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'ready' or 'failed'" },
      { status: 400 }
    );
  }

  // Look up by item id first, then fall back to jobId (Trigger.dev run ID)
  let item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) {
    item = await prisma.contentItem.findUnique({ where: { jobId: id } });
  }

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.contentItem.update({
    where: { id: item.id },
    data: {
      status,
      videoUrl: videoUrl ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      renderTimeSec: renderTimeSec ?? null,
      error: error ?? null,
      ...(previewData !== undefined && { previewData }),
    },
  });

  return NextResponse.json({ item: updated });
}
