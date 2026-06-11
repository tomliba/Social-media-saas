import { NextRequest, NextResponse } from "next/server";
import { getTemplateById, getThemeById } from "@/lib/carousel-templates";
import { auth } from "@/lib/auth";

/**
 * Thin authenticated proxy to the Flask backend's /vg/render-template-image.
 *
 * The actual HTML-template -> PNG rasterization runs on the backend, where a
 * headless Chromium is available (Vercel serverless can't run one). This route
 * resolves the template filename + theme vars (the source-of-truth tables live
 * here), forwards them, and returns the public R2 image URLs. A backend failure
 * is propagated as a non-2xx so callers never treat it as a blank success.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flaskUrl = process.env.FLASK_API_URL;
  if (!flaskUrl) {
    return NextResponse.json({ error: "Render backend not configured" }, { status: 503 });
  }

  const { templateId, themeId, slides, width, height, photoUrl, authorName } = await req.json();
  if (!templateId || !themeId || !slides || !Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json(
      { error: "templateId, themeId, and a non-empty slides[] are required" },
      { status: 400 }
    );
  }

  const template = getTemplateById(templateId);
  const theme = getThemeById(themeId);
  if (!template || !theme) {
    return NextResponse.json({ error: "Unknown template or theme" }, { status: 400 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.FLASK_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  let res: Response;
  try {
    res = await fetch(`${flaskUrl}/vg/render-template-image`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        filename: template.filename,
        themeVars: theme.vars,
        slides,
        width: width || 1080,
        height: height || 1350,
        ...(photoUrl ? { photoUrl } : {}),
        ...(authorName ? { authorName } : {}),
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Render backend unreachable" },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data.images) || data.images.length === 0) {
    return NextResponse.json(
      { error: data.error || "Render backend returned no images" },
      { status: res.ok ? 502 : res.status }
    );
  }

  return NextResponse.json({ images: data.images });
}
