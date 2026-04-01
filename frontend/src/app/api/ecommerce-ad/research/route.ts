import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productName, productUrl, description, audience, painPoint, price } = await req.json();

    if (!productName) {
      return NextResponse.json(
        { error: "productName is required" },
        { status: 400 }
      );
    }

    const prompt = `You are an elite ad strategist and consumer psychologist. Create a Product Identity Brief for an e-commerce ad campaign.

Product: "${productName}" — ${description || productName}
${productUrl ? `Product URL: ${productUrl}` : ""}
Target audience: ${audience || "general consumers"}
Main pain point: ${painPoint || "not specified"}
${price ? `Price point: ${price}` : ""}

Analyze this product deeply. Return a structured Product Identity Brief as JSON:

{
  "coreValueProp": "One sentence — the single most compelling reason to buy",
  "top5Benefits": ["benefit1", "benefit2", "benefit3", "benefit4", "benefit5"],
  "psychologicalPillars": {
    "attention": "What stops the scroll — the visual hook",
    "curiosity": "What makes them want to learn more",
    "emotion": "What feeling drives the purchase",
    "connection": "What makes them feel this is for THEM"
  },
  "customerLanguage": ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
  "painPoints": ["pain1", "pain2", "pain3"],
  "toneAssessment": "dark_emotional | funny_sharable | premium_aspirational | educational_trust",
  "icpDescription": "2-3 sentence vivid description of the ideal customer — their day, frustrations, aspirations",
  "suggestedHeadlines": ["headline1", "headline2", "headline3", "headline4", "headline5", "headline6"]
}

Rules:
- Headlines: 3-6 words each, scroll-stopping, ALL CAPS style
- Customer language: actual phrases/slang the audience uses
- Be specific to this product, not generic marketing advice
- toneAssessment: pick the ONE best tone for this product/audience combo

Return ONLY the JSON object. No markdown, no code fences.`;

    const result = await geminiFlash.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    let data;
    try {
      data = JSON.parse(result.response.text().trim());
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON — please retry" },
        { status: 500 }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("ecommerce-ad research error:", error);
    return NextResponse.json(
      { error: "Failed to research product" },
      { status: 500 }
    );
  }
}
