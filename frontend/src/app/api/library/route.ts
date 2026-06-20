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
  const {
    jobId, title, format, templateId, backgroundMode, script, durationSec,
    status: itemStatus, videoUrl, thumbnailUrl,
    previewData, creativeSettings, resolvedSegments,
  } = body;

  if (!jobId || !title || !format) {
    return NextResponse.json(
      { error: "jobId, title, and format are required" },
      { status: 400 }
    );
  }

  // Defense-in-depth: an image/carousel item is only "ready" if it actually has
  // an image. Never let a failed render masquerade as a ready item with a blank.
  if (
    (format === "image" || format === "carousel") &&
    (itemStatus ?? "rendering") === "ready" &&
    !videoUrl
  ) {
    return NextResponse.json(
      { error: "A ready image/carousel item requires a non-empty image URL" },
      { status: 400 }
    );
  }

  // Upsert on the unique jobId. Flows that mint a fresh jobId per POST hit the
  // create branch unchanged; the AI-Story / Skeleton flow now creates a
  // "preparing" item at the Generate charge (keyed on vg_job_id), and the later
  // Preview POST on the same jobId updates that item rather than colliding on the
  // unique constraint. The update only touches fields the caller actually sent,
  // so it never clobbers Generate-time data with nulls.
  const provided = <T,>(v: T | undefined) => v !== undefined;
  const updateData = {
    ...(provided(title) && { title }),
    ...(provided(format) && { format }),
    ...(provided(templateId) && { templateId }),
    ...(provided(backgroundMode) && { backgroundMode }),
    ...(provided(script) && { script }),
    ...(provided(durationSec) && { durationSec }),
    ...(provided(videoUrl) && { videoUrl }),
    ...(provided(thumbnailUrl) && { thumbnailUrl }),
    ...(provided(itemStatus) && { status: itemStatus }),
    ...(provided(previewData) && { previewData }),
    ...(provided(creativeSettings) && { creativeSettings }),
    ...(provided(resolvedSegments) && { resolvedSegments }),
  };

  const item = await prisma.contentItem.upsert({
    where: { jobId },
    create: {
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
      previewData: previewData ?? null,
      creativeSettings: creativeSettings ?? null,
      resolvedSegments: resolvedSegments ?? null,
    },
    update: updateData,
  });

  return NextResponse.json({ item }, { status: 201 });
}
