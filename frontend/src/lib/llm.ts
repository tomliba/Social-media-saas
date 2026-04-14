import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

/* ------------------------------------------------------------------ */
/*  Clients (lazy – only created when the key exists)                 */
/* ------------------------------------------------------------------ */

const geminiModel = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
      model: "gemini-2.5-flash",
    })
  : null;

const atlasClient = process.env.ATLAS_CLOUD_API_KEY
  ? new OpenAI({
      apiKey: process.env.ATLAS_CLOUD_API_KEY,
      baseURL: "https://api.atlascloud.ai/v1",
    })
  : null;

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout")), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/* ------------------------------------------------------------------ */
/*  Provider functions                                                */
/* ------------------------------------------------------------------ */

async function tryGemini(
  prompt: string,
  jsonMode: boolean,
): Promise<string> {
  if (!geminiModel) throw new Error("GEMINI_API_KEY not set");

  const call = () =>
    withTimeout(
      geminiModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        ...(jsonMode && {
          generationConfig: { responseMimeType: "application/json" },
        }),
      }),
      TIMEOUT_MS,
    );

  try {
    const result = await call();
    return result.response.text();
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 503) {
      // retry once on 503
      const result = await call();
      return result.response.text();
    }
    throw err;
  }
}

async function tryAtlasCloud(
  prompt: string,
  jsonMode: boolean,
): Promise<string> {
  if (!atlasClient) throw new Error("ATLAS_CLOUD_API_KEY not set");

  const res = await withTimeout(
    atlasClient.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      ...(jsonMode && { response_format: { type: "json_object" } }),
    }),
    TIMEOUT_MS,
  );
  return res.choices[0]?.message?.content ?? "";
}

async function tryOpenAI(
  prompt: string,
  jsonMode: boolean,
): Promise<string> {
  if (!openaiClient) throw new Error("OPENAI_API_KEY not set");

  const res = await withTimeout(
    openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      ...(jsonMode && { response_format: { type: "json_object" } }),
    }),
    TIMEOUT_MS,
  );
  return res.choices[0]?.message?.content ?? "";
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

interface GenerateTextOptions {
  jsonMode?: boolean;
}

export async function generateText(
  prompt: string,
  options?: GenerateTextOptions,
): Promise<string> {
  const jsonMode = options?.jsonMode ?? false;

  const providers: {
    name: string;
    fn: (p: string, j: boolean) => Promise<string>;
  }[] = [
    { name: "Gemini", fn: tryGemini },
    { name: "Atlas Cloud", fn: tryAtlasCloud },
    { name: "OpenAI", fn: tryOpenAI },
  ];

  for (const { name, fn } of providers) {
    try {
      const text = await fn(prompt, jsonMode);
      console.log(`[LLM] Success via ${name}`);
      return text;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[LLM] ${name} failed: ${message}`);
    }
  }

  throw new Error("All AI providers unavailable");
}
