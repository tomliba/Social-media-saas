import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  const flaskUrl = process.env.FLASK_API_URL;
  if (!flaskUrl) {
    return new Response(null, { status: 503 });
  }

  const headers: Record<string, string> = {};
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${flaskUrl}/backgrounds/argument/thumbs/${filename}`, { headers });
  if (!res.ok) return new Response(null, { status: 404 });

  const blob = await res.blob();
  return new Response(blob, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
