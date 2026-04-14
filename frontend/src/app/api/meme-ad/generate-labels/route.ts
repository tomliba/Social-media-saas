import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llm";
import { auth } from "@/lib/auth";

const templateStructures: Record<string, string> = {
  drake:
    '2 panels. panel1 = thing being rejected (the old/bad way). panel2 = thing being approved (the product).',
  expanding_brain:
    '4 panels of escalating intelligence. panel1 = basic approach. panel2 = slightly better. panel3 = smart approach. panel4 = galaxy-brain move (the product).',
  uno_draw_25:
    '2 panels. panel1 = the obvious solution the person refuses. panel2 = what they\'d rather do instead (suffer).',
  distracted_boyfriend:
    '3 panels. panel1 = girlfriend (status quo the person is leaving). panel2 = boyfriend (the target audience). panel3 = other woman (the product catching their eye).',
  this_is_fine:
    '2 panels. panel1 = what the person says ("this is fine" about the problem). panel2 = the reality of the chaos around them.',
  grus_plan:
    '4 panels. panel1 = step 1 of the plan. panel2 = step 2. panel3 = unexpected flaw revealed. panel4 = same flaw, realization face.',
  tuxedo_pooh:
    '2 panels. panel1 = the basic/boring way to describe the product. panel2 = the fancy/elevated way to describe the same thing.',
  running_away_balloon:
    '3 panels. panel1 = the person (target audience). panel2 = balloon floating away (the thing they\'re letting go). panel3 = what they\'re running toward (the product).',
  virgin_vs_chad:
    '2 panels. panel1 = the weak old approach (labeled). panel2 = the strong new approach using the product (labeled).',
  wojak:
    '2 panels. panel1 = the internal thought/feeling about the problem. panel2 = what the person does about it (or doesn\'t).',
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productName, description, painPoint, audience, memeTemplate } = await req.json();

    if (!productName || !memeTemplate) {
      return NextResponse.json(
        { error: "productName and memeTemplate are required" },
        { status: 400 }
      );
    }

    const structure = templateStructures[memeTemplate];
    if (!structure) {
      return NextResponse.json(
        { error: "Unknown meme template" },
        { status: 400 }
      );
    }

    const prompt = `You are a meme copywriter creating ad memes. Generate 3 different label variations for a "${memeTemplate}" meme format.

Product: "${productName}"
What it does: ${description || productName}
Pain point it solves: ${painPoint || "general frustration"}
Target audience: ${audience || "general"}

Meme structure: ${structure}

Rules:
- Maximum 8 words per panel label
- Labels should be punchy, funny, relatable
- Each variation should take a different angle/joke
- Use the product name naturally in at least one panel per variation
- Match the meme format's tone (rejection/approval, escalation, irony, etc.)

Return ONLY a JSON object, no markdown, no code fences:
{ "variations": [
  { "panel1": "...", "panel2": "...", "panel3": "...", "panel4": "..." },
  { "panel1": "...", "panel2": "...", "panel3": "...", "panel4": "..." },
  { "panel1": "...", "panel2": "...", "panel3": "...", "panel4": "..." }
] }

Only include panel keys that the format uses (e.g. 2-panel formats only need panel1 and panel2).`;

    const raw = (await generateText(prompt, { jsonMode: true })).trim();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please retry" },
        { status: 500 }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("meme-ad generate-labels error:", error);
    return NextResponse.json(
      { error: "Failed to generate meme labels" },
      { status: 500 }
    );
  }
}
