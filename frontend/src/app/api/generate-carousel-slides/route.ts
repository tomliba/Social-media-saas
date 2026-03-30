import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";
import { getTemplateById } from "@/lib/carousel-templates";

export async function POST(req: NextRequest) {
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

No markdown, no code fences. Return raw JSON only.`;

    const result = await geminiFlash.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    const data = JSON.parse(result.response.text().trim());
    return NextResponse.json(data);
  } catch (error) {
    console.error("generate-carousel-slides error:", error);
    return NextResponse.json({ error: "Failed to generate slides" }, { status: 500 });
  }
}
