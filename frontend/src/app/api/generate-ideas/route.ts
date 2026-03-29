import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";

const templateStructures: Record<string, string> = {
  "Did You Know": "surprising facts that make people say 'wait, really?!'",
  "Myth Buster": "common myths or misconceptions that are actually wrong",
  "X vs Y": "interesting comparisons between two related things",
  "Story Time": "fascinating true stories with dramatic twists",
  "Top 5": "ranked lists of things people care about",
  "How-To": "simple step-by-step solutions to common problems",
  "Hot Take": "controversial but defensible opinions that spark debate",
  "What Happens If": "hypothetical scenarios with surprising consequences",
};

export async function POST(req: NextRequest) {
  try {
    const { template, niche } = await req.json();

    if (!template || !niche) {
      return NextResponse.json(
        { error: "template and niche are required" },
        { status: 400 }
      );
    }

    const structure = templateStructures[template] || template;

    const prompt = `You are a viral content strategist for short-form video (TikTok, Instagram Reels, YouTube Shorts).

Generate exactly 10 viral video ideas using the "${template}" format about the niche: "${niche}".

The "${template}" format focuses on: ${structure}.

For each idea, provide:
- A catchy, scroll-stopping title (max 15 words, written as if it's the video's hook text)
- A relevant category tag (1-2 words, like "Health", "Psychology", "Science", "Tech", "Business", "Lifestyle", etc.)

Return ONLY a JSON array, no markdown, no code fences. Example format:
[{"title": "Your catchy title here", "tag": "Category"}]

Make titles provocative, curiosity-driven, and optimized for clicks. Use power words. Each title should make someone stop scrolling.`;

    const result = await geminiFlash.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const text = result.response.text().trim();
    const ideas = JSON.parse(text);

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("generate-ideas error:", error);
    return NextResponse.json(
      { error: "Failed to generate ideas" },
      { status: 500 }
    );
  }
}
