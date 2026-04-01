import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { topic, tone } = await req.json();

    if (!topic) {
      return NextResponse.json(
        { error: "topic is required" },
        { status: 400 }
      );
    }

    const prompt = `You are a social media content writer. Write concise, punchy content about the following topic that will be placed into a visual scene (billboard, newspaper, poster, etc.).

Topic: ${topic}
Tone: ${tone || "Friendly"}

Requirements:
- Keep it under 80 words — this will be rendered as text inside an image
- Use short, impactful sentences
- Include a headline/hook line and 2-3 supporting points or a short paragraph
- Make it engaging and shareable
- Do NOT use markdown formatting, hashtags, or emojis
- Return ONLY the content text, nothing else`;

    const result = await geminiFlash.generateContent(prompt);
    const text = result.response.text().trim();

    return NextResponse.json({ text });
  } catch (error) {
    console.error("ai-scene generate-text error:", error);
    return NextResponse.json(
      { error: "Failed to generate text" },
      { status: 500 }
    );
  }
}
