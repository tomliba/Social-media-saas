import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/library — list all content items for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.contentItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const readyCount = items.filter((i) => i.status === "ready").length;
  const renderingCount = items.filter((i) => i.status === "rendering").length;

  return NextResponse.json({ items, readyCount, renderingCount });
}

// POST /api/library — create a new content item (called when render starts)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { jobId, title, format, templateId, backgroundMode, script, durationSec, status: itemStatus, videoUrl, thumbnailUrl } = body;

  if (!jobId || !title || !format) {
    return NextResponse.json(
      { error: "jobId, title, and format are required" },
      { status: 400 }
    );
  }

  const item = await prisma.contentItem.create({
    data: {
      userId: session.user.id,
      jobId,
      title,
      format,
      templateId: templateId ?? null,
      backgroundMode: backgroundMode ?? null,
      script: script ?? null,
      durationSec: durationSec ?? null,
      videoUrl: videoUrl ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      status: itemStatus ?? "rendering",
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
