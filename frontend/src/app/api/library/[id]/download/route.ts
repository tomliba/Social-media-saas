import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";

async function fetchAsset(url: string): Promise<{ buffer: Buffer; type: string }> {
  if (url.startsWith("/")) {
    const filePath = join(process.cwd(), "public", url);
    const buffer = await readFile(filePath);
    const ext = url.split(".").pop()?.toLowerCase();
    const type = ext === "mp4" ? "video/mp4" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
    return { buffer, type };
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuf), type: res.headers.get("content-type") || "application/octet-stream" };
}

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

  const safeTitle = item.title.replace(/[^a-zA-Z0-9_-]/g, "_");

  // Carousel: zip all slide images together
  if (item.format === "carousel" && item.previewData) {
    try {
      const pd = JSON.parse(item.previewData);
      const images: string[] = pd.images || [];
      if (images.length > 0) {
        const { buildZip } = await import("./zip");
        const zipBuffer = await buildZip(images, safeTitle);
        return new NextResponse(zipBuffer, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${safeTitle}.zip"`,
          },
        });
      }
    } catch {
      // Fall through to single-file download
    }
  }

  try {
    const { buffer, type } = await fetchAsset(item.videoUrl);
    const ext = item.format === "video" ? "mp4" : "png";
    const filename = `${safeTitle}.${ext}`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Download failed:", err);
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });
  }
}
