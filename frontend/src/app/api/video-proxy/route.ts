import { NextRequest, NextResponse } from "next/server";

const FLASK_URL = process.env.FLASK_API_URL || "http://localhost:5000";
const API_KEY = process.env.FLASK_API_KEY || "";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  // Resolve against the backend origin and confirm the normalized result stays
  // under /vg/preview/ on the same host — blocks `../` traversal and host
  // injection (e.g. path being an absolute URL).
  let target: URL;
  try {
    target = new URL(path, FLASK_URL);
  } catch {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  if (
    target.origin !== new URL(FLASK_URL).origin ||
    !target.pathname.startsWith("/vg/preview/") ||
    target.pathname.includes("..")
  ) {
    return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
  }

  try {
    const res = await fetch(target.toString(), {
      headers: API_KEY ? { "X-API-Key": API_KEY } : {},
    });

    if (!res.ok) {
      return new NextResponse("Video not found", { status: res.status });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "video/mp4",
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch video", { status: 502 });
  }
}
