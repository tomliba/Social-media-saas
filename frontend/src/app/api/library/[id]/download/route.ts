import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Only our own storage / origin may be fetched — `videoUrl` is user-mutable via
// PATCH, so an unrestricted fetch/readFile would be an SSRF + file-read primitive.
function assetHostAllowed(host: string): boolean {
  host = host.toLowerCase();
  if (host.endsWith(".r2.dev") || host.endsWith(".r2.cloudflarestorage.com")) return true;
  try {
    const appHost = new URL(process.env.NEXT_PUBLIC_APP_URL || "").hostname.toLowerCase();
    if (appHost && host === appHost) return true;
  } catch {}
  return false;
}

async function fetchAsset(url: string): Promise<{ buffer: Buffer; type: string }> {
  // Relative paths are resolved against our own origin (e.g. /api/video-proxy,
  // which is itself host-gated). We never read a user-controlled local path.
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let target: URL;
  try {
    target = url.startsWith("/") ? new URL(url, base) : new URL(url);
  } catch {
    throw new Error("Invalid asset URL");
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    throw new Error("Disallowed scheme");
  }
  if (!assetHostAllowed(target.hostname)) {
    throw new Error("Disallowed asset host");
  }
  const res = await fetch(target.toString());
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
        return new NextResponse(new Uint8Array(zipBuffer), {
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

    return new NextResponse(new Uint8Array(buffer), {
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
