import { NextRequest, NextResponse } from "next/server";

const FLASK_URL = process.env.FLASK_API_URL || "http://localhost:5000";
const API_KEY = process.env.FLASK_API_KEY || "";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const params = new URLSearchParams();

  const search = searchParams.get("search");
  const gender = searchParams.get("gender");
  const vibe = searchParams.get("vibe");
  if (search) params.set("search", search);
  if (gender) params.set("gender", gender);
  if (vibe) params.set("vibe", vibe);

  try {
    const res = await fetch(
      `${FLASK_URL}/voices/list?${params.toString()}`,
      {
        headers: { "X-API-Key": API_KEY },
        next: { revalidate: 300 },
      }
    );

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    console.warn(`Flask /voices/list returned ${res.status}`);
  } catch (err) {
    console.warn("Flask /voices/list unreachable:", err);
  }

  return NextResponse.json({ voices: [] });
}
