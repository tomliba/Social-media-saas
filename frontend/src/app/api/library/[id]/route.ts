import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/library/[id] — update a content item (status, videoUrl, error)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { status, videoUrl, thumbnailUrl, error, jobId } = body;

  const updated = await prisma.contentItem.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(videoUrl !== undefined && { videoUrl }),
      ...(thumbnailUrl !== undefined && { thumbnailUrl }),
      ...(error !== undefined && { error }),
      ...(jobId !== undefined && { jobId }),
    },
  });

  return NextResponse.json({ item: updated });
}

// DELETE /api/library/[id] — delete a content item
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.contentItem.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
