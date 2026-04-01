import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";
import { auth } from "@/lib/auth";
import { YoutubeTranscript } from "youtube-transcript";
import { extract } from "@extractus/article-extractor";

const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/;

async function extractFromUrl(url: string): Promise<string> {
  // YouTube — grab transcript
  const ytMatch = url.match(YOUTUBE_RE);
  if (ytMatch) {
    try {
      const segments = await YoutubeTranscript.fetchTranscript(ytMatch[1]);
      const text = segments.map((s) => s.text).join(" ");
      if (text.trim()) return text.slice(0, 10000);
    } catch {
      // Transcript unavailable — fall through to article extractor
    }
  }

  // Article / web page
  const article = await extract(url);
  if (article?.content) {
    const plain = article.content
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (plain) return plain.slice(0, 10000);
  }

  throw new Error(
    "Couldn't read this link. Try a different URL or paste the content directly."
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      topic,
      niche,
      templateName,
      tone,
      textSource,
      sourceInput,
    } = body;

    // Determine the content context based on text source
    let contextBlock = "";
    let topicLabel = topic || "general";

    if (textSource === "from_link") {
      if (!sourceInput || typeof sourceInput !== "string") {
        return NextResponse.json(
          { error: "A URL is required for the 'from_link' source" },
          { status: 400 }
        );
      }
      const extracted = await extractFromUrl(sourceInput.trim());
      contextBlock = `\n\nHere is content extracted from a link the user provided. Base your ideas on this content:\n\n---\n${extracted}\n---`;
      topicLabel = "the linked content above";
    } else if (textSource === "custom_prompt" || textSource === "from_file") {
      if (!sourceInput?.trim()) {
        return NextResponse.json(
          { error: textSource === "from_file" ? "No file text provided" : "A prompt description is required" },
          { status: 400 }
        );
      }
      const label = textSource === "from_file" ? "content extracted from the user's uploaded file" : "what the user described";
      contextBlock = `\n\nHere is ${label}. Base your ideas on this content:\n\n---\n${sourceInput.trim().slice(0, 10000)}\n---`;
      topicLabel = "the content above";
    } else {
      // ai_ideas (default) — require topic
      if (!topic) {
        return NextResponse.json(
          { error: "topic is required" },
          { status: 400 }
        );
      }
    }

    const toneInstruction = tone
      ? `Use a ${tone.toLowerCase()} tone throughout.`
      : "";

    const prompt = `You are a viral social media content strategist for Instagram, LinkedIn, and TikTok.

Generate exactly 10 single image post ideas about "${topicLabel}" in the niche "${niche || "general"}".
The post will use the "${templateName || "Centered"}" visual design — a standalone single-image post (not a carousel).
${toneInstruction}
${contextBlock}

For each idea, provide:
- title: A catchy post title (max 10 words, scroll-stopping)
- hook: The text that will appear on the image (compelling, concise)
- tag: Category tag (1-2 words)

Return ONLY a JSON array, no markdown, no code fences:
[{"title": "...", "hook": "...", "tag": "Category"}]

Make titles curiosity-driven and optimized for saves/shares. Include numbers or stats in at least 3 titles.`;

    const result = await geminiFlash.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    const ideas = JSON.parse(result.response.text().trim());
    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("generate-image-post-ideas error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate ideas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
