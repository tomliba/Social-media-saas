import { NextResponse } from "next/server";

/**
 * GET /api/music-urls
 * Proxies Flask GET /vg/music-urls — returns { "filename.mp3": "https://r2-url" } mapping.
 */
export async function GET() {
  const flaskUrl = process.env.FLASK_API_URL;
  if (!flaskUrl) {
    return NextResponse.json({}, { status: 200 });
  }

  try {
    const headers: Record<string, string> = {};
    const apiKey = process.env.FLASK_API_KEY;
    if (apiKey) headers["X-API-Key"] = apiKey;

    const res = await fetch(`${flaskUrl}/vg/music-urls`, { headers });
    if (!res.ok) {
      return NextResponse.json({}, { status: 200 });
    }

    const mapping = await res.json();
    return NextResponse.json(mapping);
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}
