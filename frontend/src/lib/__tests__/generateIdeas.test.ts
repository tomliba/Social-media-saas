import { describe, it, expect } from "vitest";
import { generateIdeas, parseJsonArray } from "@/lib/llm";

// Simulated LLM responses (the bug: Gemini intermittently returns the single
// object form instead of an array).
const SINGLE_OBJECT = JSON.stringify({ title: "Solo idea", hook: "hook", tag: "Tech" });
const ARRAY_OF_THREE = JSON.stringify([
  { title: "Idea A", hook: "a", tag: "Tech" },
  { title: "Idea B", hook: "b", tag: "Health" },
  { title: "Idea C", hook: "c", tag: "Money" },
]);

describe("parseJsonArray — idea shapes", () => {
  it("wraps a single idea object into a one-element array", () => {
    expect(parseJsonArray(SINGLE_OBJECT)).toHaveLength(1);
  });
  it("uses a proper array as-is", () => {
    expect(parseJsonArray(ARRAY_OF_THREE)).toHaveLength(3);
  });
  it("unwraps {ideas:[...]}", () => {
    expect(parseJsonArray(JSON.stringify({ ideas: [{ title: "A" }] }))).toHaveLength(1);
  });
});

describe("generateIdeas — tolerant parse + retry", () => {
  it("single-object response → one idea row", async () => {
    const ideas = await generateIdeas<{ title: string }>("p", { gen: async () => SINGLE_OBJECT });
    expect(ideas).toHaveLength(1);
    expect(ideas[0].title).toBe("Solo idea");
  });

  it("proper array response → all idea rows", async () => {
    const ideas = await generateIdeas<{ title: string }>("p", { gen: async () => ARRAY_OF_THREE });
    expect(ideas).toHaveLength(3);
    expect(ideas.map((i) => i.title)).toEqual(["Idea A", "Idea B", "Idea C"]);
  });

  it("retries once when the first response is unparseable, then succeeds", async () => {
    let calls = 0;
    const ideas = await generateIdeas("p", {
      attempts: 2,
      gen: async () => (++calls === 1 ? "totally not json {{{" : ARRAY_OF_THREE),
    });
    expect(calls).toBe(2);
    expect(ideas).toHaveLength(3);
  });

  it("retries when the first response parses to nothing, then succeeds", async () => {
    let calls = 0;
    const ideas = await generateIdeas("p", {
      attempts: 2,
      gen: async () => (++calls === 1 ? JSON.stringify([]) : SINGLE_OBJECT),
    });
    expect(calls).toBe(2);
    expect(ideas).toHaveLength(1);
  });

  it("throws after all attempts yield nothing", async () => {
    await expect(
      generateIdeas("p", { attempts: 2, gen: async () => "garbage, no array here" }),
    ).rejects.toThrow(/no items after 2 attempts/);
  });
});
