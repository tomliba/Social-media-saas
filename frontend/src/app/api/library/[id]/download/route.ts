import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const item = await prisma.contentItem.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!item || !item.videoUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const res = await fetch(item.videoUrl);
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });
  }

  const blob = await res.blob();
  const ext = item.format === "video" ? "mp4" : "png";
  const filename = `${item.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;

  return new NextResponse(blob, {
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
