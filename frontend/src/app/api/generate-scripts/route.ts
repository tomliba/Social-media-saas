import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";

const templatePrompts: Record<string, string> = {
  "Did You Know":
    "Structure: Hook with a surprising fact → explain why it's true → deliver a mind-blowing follow-up → end with a call to action. Start with 'Did you know...'",
  "Myth Buster":
    "Structure: State the common myth confidently → pause, then say 'but actually...' → reveal the truth with evidence → end with what people should do instead.",
  "X vs Y":
    "Structure: Introduce both sides → compare them point by point (3 points) → deliver a clear verdict → end with a surprising twist or recommendation.",
  "Story Time":
    "Structure: Open with a dramatic hook that sets the scene → build tension with escalating details → deliver the climax/twist → resolve and share the takeaway.",
  "Top 5":
    "Structure: Open with a hook about the topic → count down from 5 to 1 with brief explanations → make #1 surprising and memorable → end with a CTA.",
  "How-To":
    "Structure: State the problem people face → walk through the solution step by step (3-4 steps) → show the result/benefit → end with encouragement.",
  "Hot Take":
    "Structure: Open with the controversial claim boldly → acknowledge the opposing view → present your evidence/reasoning (2-3 points) → end with a challenge to the viewer.",
  "What Happens If":
    "Structure: Pose the hypothetical scenario → walk through the timeline of effects (immediate, short-term, long-term) → reveal the most surprising consequence → end with a reflection.",
};

export async function POST(req: NextRequest) {
  try {
    const { template, ideas } = await req.json();

    if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
      return NextResponse.json(
        { error: "ideas array is required" },
        { status: 400 }
      );
    }

    const structure = templatePrompts[template] || "Write an engaging short-form video script.";

    const prompt = `You are a viral short-form video scriptwriter. Write scripts for ${ideas.length} videos.

Template format: "${template}"
${structure}

Write a script for EACH of these video ideas:
${ideas.map((idea: string, i: number) => `${i + 1}. ${idea}`).join("\n")}

Guidelines:
- Each script should be 60-90 words (about 30 seconds when spoken)
- Write in a conversational, engaging tone as if speaking directly to the viewer
- Use short punchy sentences. No long paragraphs.
- Include natural pauses (use "..." for dramatic effect)
- Don't include stage directions, just the spoken words
- Make the opening line a scroll-stopper

Return ONLY a JSON array of objects, no markdown, no code fences. Format:
[{"title": "Video Title", "script": "The full script text here..."}]`;

    const result = await geminiFlash.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const text = result.response.text().trim();
    const scripts = JSON.parse(text);

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error("generate-scripts error:", error);
    return NextResponse.json(
      { error: "Failed to generate scripts" },
      { status: 500 }
    );
  }
}
