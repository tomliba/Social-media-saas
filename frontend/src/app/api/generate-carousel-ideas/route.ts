import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { topic, niche, templateName } = await req.json();

    if (!topic || !niche) {
      return NextResponse.json({ error: "topic and niche are required" }, { status: 400 });
    }

    const prompt = `You are a viral carousel content strategist for Instagram, LinkedIn, and TikTok.

Generate exactly 10 carousel post ideas about "${topic}" in the niche "${niche}".
The carousel will use the "${templateName || "editorial"}" visual layout.

For each idea, provide:
- title: A catchy carousel title (max 12 words, scroll-stopping)
- hook: The opening slide hook text (what makes someone swipe)
- slideCount: Recommended number of slides (5-10)
- tag: Category tag (1-2 words)

Return ONLY a JSON array, no markdown, no code fences:
[{"title": "...", "hook": "...", "slideCount": 7, "tag": "Category"}]

Make titles curiosity-driven and optimized for saves/shares. Include numbers or stats in at least 3 titles.`;

    const result = await geminiFlash.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    const ideas = JSON.parse(result.response.text().trim());
    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("generate-carousel-ideas error:", error);
    return NextResponse.json({ error: "Failed to generate ideas" }, { status: 500 });
  }
}
