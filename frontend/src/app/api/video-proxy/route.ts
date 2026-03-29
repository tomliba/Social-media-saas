import { NextRequest, NextResponse } from "next/server";

const FLASK_URL = process.env.FLASK_API_URL || "http://localhost:5000";
const API_KEY = process.env.FLASK_API_KEY || "";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${FLASK_URL}${path}`, {
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
