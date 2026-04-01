import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const STYLE_BLOCK =
  "Style: bold graphic novel, dark near-black background (#0A0A0A), high contrast, vivid accents. Gold (#C9A84C) for right-choice elements, red (#FF4444) for wrong-way elements. Do NOT use light backgrounds. Do NOT add logos or watermarks. Format: 1:1 square (1080x1080).";

const LAYOUT_BLOCK =
  "Layout: Top 30% = bold white headline in ALL CAPS on dark gradient. Middle 40% = main illustrated scene. Bottom 30% = supporting text.";

const conceptScenes: Record<string, (product: string, description: string) => string> = {
  two_doors: (product, _desc) =>
    `A person stands between two doors. Left: red door labeled "The Old Way" with cobwebs and cracks. Right: gold glowing door labeled "${product}" with light streaming out. The person reaches for the gold door.`,
  solo_vs_army: (product, _desc) =>
    `Left side: one exhausted person buried in endless work, surrounded by chaos. Right side: the same person confidently commanding an army of ${product}-branded helpers, everything organized and running smoothly.`,
  race_track: (product, _desc) =>
    `A race track from above. Competitors speed ahead in sleek vehicles. The viewer's lane is stuck with broken, outdated tools — until ${product} appears as a glowing rocket boost strapped to their vehicle.`,
  before_after_split: (product, _desc) =>
    `Diagonal split composition. Left/top: gray desaturated scene, stressed person drowning in chaos and problems. Right/bottom: same person in vivid color, winning and celebrating, with ${product} glowing beside them.`,
  comic_panels: (product, _desc) =>
    `3-panel comic strip arranged horizontally. Panel 1: character struggling with the problem, sweat drops, red background. Panel 2: character discovers ${product}, lightbulb moment, yellow glow. Panel 3: character transformed, celebrating success, green/gold background.`,
  control_room: (product, _desc) =>
    `A person sits confidently in a futuristic control room, leaning back with arms crossed and a smile. Multiple automated dashboards and screens glow around them, all powered by ${product}. Everything runs smoothly with green status indicators.`,
};

const variationHints = [
  "Variation focus: make the headline dominate — largest element, dramatic typography.",
  "Variation focus: make the illustrated scene the hero — detailed, immersive, cinematic.",
  "Variation focus: emphasize the product name prominently within the scene — make it unmissable.",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { product, description, conceptId, variationIndex } = await req.json();

    if (!product || !conceptId) {
      return NextResponse.json(
        { error: "product and conceptId are required" },
        { status: 400 }
      );
    }

    const sceneFn = conceptScenes[conceptId];
    if (!sceneFn) {
      return NextResponse.json(
        { error: "Unknown concept" },
        { status: 400 }
      );
    }

    const scene = sceneFn(product, description || "");
    const hint = variationHints[variationIndex ?? 0] || variationHints[0];

    const prompt = `Illustrated cartoon ad creative for "${product}". ${product} is: ${description || product}.\n\nScene: ${scene}\n\n${LAYOUT_BLOCK}\n\n${STYLE_BLOCK}\n\n${hint}`;

    const flaskUrl = process.env.FLASK_API_URL;
    if (!flaskUrl) {
      return NextResponse.json(
        { error: "FLASK_API_URL not configured" },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const apiKey = process.env.FLASK_API_KEY;
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const res = await fetch(`${flaskUrl}/pg/generate_ai_slide`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Flask error: ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("ad-creative generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate ad creative" },
      { status: 500 }
    );
  }
}
