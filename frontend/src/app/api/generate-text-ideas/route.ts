import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { topic, niche, tone, platform } = await req.json();

    if (!topic || !niche) {
      return NextResponse.json({ error: "topic and niche are required" }, { status: 400 });
    }

    const prompt = `You are a viral social media copywriter specializing in text-only posts for ${platform || "Instagram"}.

Generate exactly 10 text post ideas about "${topic}" in the niche "${niche}".
Tone: ${tone || "Friendly"}

For each idea, provide:
- title: A short label for this post idea (max 8 words)
- text: The full post text (150-400 words). Include hooks, storytelling, CTAs, emojis, and line breaks for readability.
- type: One of "caption", "thread", "hook", "story"
- tag: Category tag (1-2 words)

Return ONLY a JSON array, no markdown, no code fences:
[{"title": "...", "text": "...", "type": "caption", "tag": "Category"}]

Make each post scroll-stopping. Use power words, curiosity gaps, and pattern interrupts. At least 3 should include specific numbers or stats.`;

    const result = await geminiFlash.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    const ideas = JSON.parse(result.response.text().trim());
    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("generate-text-ideas error:", error);
    return NextResponse.json({ error: "Failed to generate text ideas" }, { status: 500 });
  }
}
