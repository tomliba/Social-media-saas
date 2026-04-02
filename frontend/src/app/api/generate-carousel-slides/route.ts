import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";
import { getTemplateById } from "@/lib/carousel-templates";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { templateId, title, hook, slideCount, tone, niche } = await req.json();

    if (!templateId || !title) {
      return NextResponse.json({ error: "templateId and title are required" }, { status: 400 });
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json({ error: "Unknown template" }, { status: 400 });
    }

    const numSlides = slideCount || 7;
    const placeholderList = template.placeholders
      .filter((p) => p !== "slideNumber" && p !== "totalSlides" && p !== "handle")
      .join(", ");

    const isTweetThread = template.id === "tweet_thread";
    const threadInstruction = isTweetThread
      ? `\n\nIMPORTANT: This is a tweet thread. Generate a thread of ${numSlides} tweets. Each tweet should build on the previous one, telling a story or making a progressive argument. Keep "displayName" and "handle" identical across ALL slides — only "tweetText" should change per slide.`
      : "";

    const prompt = `You are a viral carousel content writer. Generate slide content for a ${numSlides}-slide carousel.

Topic: "${title}"
Hook: "${hook || ""}"
Niche: "${niche || "general"}"
Tone: ${tone || "Friendly"}
Template style: ${template.name} — ${template.description}

Each slide needs these fields: ${placeholderList}
The template expects: ${template.contentPrompt}

Slide 1 should be the hook/cover slide. The last slide should be a CTA.

Return ONLY a JSON object with:
- "slides": array of ${numSlides} objects, each with the placeholder keys above filled with text content
- "caption": an Instagram caption for the carousel (with emojis, hashtags, CTA)

Example for one slide: { ${template.placeholders.filter((p) => !["slideNumber", "totalSlides", "handle"].includes(p)).map((p) => `"${p}": "..."`).join(", ")} }

No markdown, no code fences. Return raw JSON only.${threadInstruction}`;

    const result = await geminiFlash.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    let data;
    try {
      data = JSON.parse(result.response.text().trim());
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please retry" },
        { status: 500 }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("generate-carousel-slides error:", error);
    return NextResponse.json({ error: "Failed to generate slides" }, { status: 500 });
  }
}
