import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/library/[id]/preview-ready — update item with preview data
// Called by prepare-assets Trigger.dev task (server-to-server, uses item ID directly)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status, previewData, creativeSettings, resolvedSegments, durationSec } = body;

  const item = await prisma.contentItem.findUnique({ where: { id } });
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
