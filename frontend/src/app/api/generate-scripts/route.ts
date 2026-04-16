import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llm";
import { auth } from "@/lib/auth";

const templatePrompts: Record<string, string> = {
  "Did You Know":
    "Structure: Hook with a surprising fact → explain why it's true → deliver a mind-blowing follow-up → end with a call to action.",
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
  "Before & After":
    "Structure: Hook with the challenge or experiment → describe the before state → walk through the change → reveal the surprising after result → end with what you learned.",
  "Problem \u2192 Solution":
    "Structure: Call out the common mistake aggressively → explain why it's actually harmful → give the correct solution step by step → show the benefit of doing it right.",
  "Ranking / Tier List":
    "Structure: Introduce what you're ranking → rate each item with a quick reaction (3-5 items) → reveal your #1 pick with a controversial or surprising choice → challenge viewers to disagree in comments.",
  "Mini Series":
    "Structure: Hook with the big picture topic → deliver one fascinating key point with depth → end on a cliffhanger or unanswered question → tell viewers to follow for part 2.",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { template, ideas, tone, duration, customPrompt } = await req.json();

    if (!customPrompt && (!ideas || !Array.isArray(ideas) || ideas.length === 0)) {
      return NextResponse.json(
        { error: "ideas array or customPrompt is required" },
        { status: 400 }
      );
    }

    // Map tone setting to prompt instructions
    const toneGuide: Record<string, string> = {
      Funny: "Be genuinely funny — unexpected comparisons, absurd specificity, deadpan delivery. Think stand-up comedy, not morning TV host.",
      Serious: "Be direct, authoritative, confident. State facts like a trusted expert. No filler words. Think documentary narrator.",
      Cursing: "Use strong profanity naturally for emphasis. Be raw and unfiltered, like your funniest friend who swears constantly.",
      Edgy: "Be provocatively blunt. Bold claims. Sharp sarcasm. Call out BS directly. Start fights in comments on purpose.",
      Motivational: "High energy, inspiring, empowering. Make the viewer feel unstoppable. Use 'you' constantly. Think fitness coach meets TED talk.",
      Storytelling: "Calm, narrative, pull them in. Use 'so this happened...' energy. Build suspense. Make them need to hear the ending.",
      Sarcastic: "Dry, deadpan, ironic. Say the opposite of what you mean. Eye-roll energy. Think someone who's seen it all and is mildly annoyed.",
      Shocked: "Mind-blown energy. Genuine disbelief. 'I can't believe this is real' vibe. Use exclamations, rhetorical questions, dramatic pauses.",
      Conspiracy: "Secretive, suspicious, 'they don't want you to know this' energy. Lower your voice. Make the viewer feel like they're getting insider information.",
      Friendly: "Warm, casual, like talking to a friend over coffee. No pressure, no hype. Just sharing something cool you learned.",
    };
    const toneInstruction = toneGuide[tone] || toneGuide["Funny"];

    // Map duration to word count guidance
    const durationWords: Record<string, string> = {
      "15s": "30-45 words (about 15 seconds when spoken)",
      "30s": "60-90 words (about 30 seconds when spoken)",
      "60s": "120-170 words (about 60 seconds when spoken)",
      "90s": "180-220 words (about 90 seconds when spoken)",
    };
    const wordCount = durationWords[duration] || durationWords["30s"];

    let prompt: string;

    if (customPrompt) {
      // "My Own Prompt" flow — user wrote their own instructions
      prompt = `You are a viral short-form video scriptwriter. The user has given you custom instructions for a video they want.

User's instructions:
${customPrompt}

Tone: ${toneInstruction}

Guidelines:
- The script should be ${wordCount}
- Write in the specified tone as if speaking directly to the viewer
- Use short punchy sentences. No long paragraphs.
- Include natural pauses (use "..." for dramatic effect)
- Don't include stage directions, just the spoken words
- Make the opening line a scroll-stopper
- NEVER start with these banned phrases: "Did you know", "What if I told you", "Here's the thing", "So", "Okay so", "Let me tell you". Instead, open with a bold claim, shocking stat, or direct statement
- NEVER use asterisks, em dashes (—), markdown formatting, bold markers, or any special characters like * or ** or — in the script. This text will be read aloud by text-to-speech. Write plain text only. Use CAPS for emphasis. Use ... for pauses.

Return ONLY a JSON array with exactly 1 object, no markdown, no code fences. Format:
[{"title": "Video Title", "script": "The full script text here..."}]`;
    } else {
      // Standard template flow
      const structure = templatePrompts[template] || "Write an engaging short-form video script.";

      prompt = `You are a viral short-form video scriptwriter. Write scripts for ${ideas.length} videos.

Template format: "${template}"
${structure}

Tone: ${toneInstruction}

Write a script for EACH of these video ideas:
${ideas.map((idea: string, i: number) => `${i + 1}. ${idea}`).join("\n")}

Guidelines:
- Each script should be ${wordCount}
- Write in the specified tone as if speaking directly to the viewer
- Use short punchy sentences. No long paragraphs.
- Include natural pauses (use "..." for dramatic effect)
- Don't include stage directions, just the spoken words
- Make the opening line a scroll-stopper
- NEVER start with these banned phrases: "Did you know", "What if I told you", "Here's the thing", "So", "Okay so", "Let me tell you". Instead, open with a bold claim, shocking stat, or direct statement
- NEVER use asterisks, em dashes (—), markdown formatting, bold markers, or any special characters like * or ** or — in the script. This text will be read aloud by text-to-speech. Write plain text only. Use CAPS for emphasis. Use ... for pauses.

Return ONLY a JSON array of objects, no markdown, no code fences. Format:
[{"title": "Video Title", "script": "The full script text here..."}]`;
    }

    const text = (await generateText(prompt, { jsonMode: true })).trim();
    const parsed = JSON.parse(text);
    const raw = Array.isArray(parsed) ? parsed : (parsed.scripts || parsed.results || parsed.ideas || Object.values(parsed).find(Array.isArray) || []);
    if (raw.length === 0) {
      throw new Error(`LLM returned no scripts array. Raw: ${text.slice(0, 500)}`);
    }
    const scripts = raw.map((s: { title: string; script: string }) => ({
      ...s,
      script: s.script.replace(/\*+/g, "").replace(/—/g, ","),
    }));

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error("generate-scripts error:", error);
    return NextResponse.json(
      { error: "Failed to generate scripts" },
      { status: 500 }
    );
  }
}
