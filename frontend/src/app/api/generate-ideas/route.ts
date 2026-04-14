import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llm";
import { auth } from "@/lib/auth";

const templateStructures: Record<string, string> = {
  "Viral Ideas": "the most engaging, shareable, and high-retention video concepts across all formats. Pick the best format for each idea (Did You Know, Myth Buster, X vs Y, Top 5, Story Time, Hot Take, How-To, What Happens If, Before & After, Problem to Solution, Ranking, Mini Series). Mix different formats for variety.",
  "Did You Know": "surprising facts that make people say 'wait, really?!'",
  "Myth Buster": "common myths or misconceptions that are actually wrong",
  "X vs Y": "interesting comparisons between two related things",
  "Story Time": "fascinating true stories with dramatic twists",
  "Top 5": "ranked lists of things people care about",
  "How-To": "simple step-by-step solutions to common problems",
  "Hot Take": "controversial but defensible opinions that spark debate",
  "What Happens If": "hypothetical scenarios with surprising consequences",
  "Before & After": "transformation stories showing what changes when you start or stop doing something",
  "Problem \u2192 Solution": "calling out common mistakes people make and giving the correct alternative",
  "Ranking / Tier List": "rating or ranking multiple items from worst to best with opinions that spark debate",
  "Mini Series": "multi-part topics too big for one video that make viewers follow for the next part",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

Make titles provocative, curiosity-driven, and optimized for clicks. Use power words. Each title should make someone stop scrolling.
Include specific numbers or statistics in at least 3 of the 10 titles (e.g., "97% of people get this wrong", "This $2 trick saved me 10 hours").`;

    const text = (await generateText(prompt, { jsonMode: true })).trim();
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
