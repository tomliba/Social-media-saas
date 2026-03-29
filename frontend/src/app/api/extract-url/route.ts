import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { extract } from "@extractus/article-extractor";

const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // ── YouTube ──
    const ytMatch = url.match(YOUTUBE_RE);
    if (ytMatch) {
      try {
        const segments = await YoutubeTranscript.fetchTranscript(ytMatch[1]);
        const text = segments.map((s) => s.text).join(" ");
        if (text.trim()) {
          return NextResponse.json({
            text: text.slice(0, 10000),
            source: "youtube",
          });
        }
      } catch {
        // Transcript not available — fall through to article extractor
      }
    }

    // ── Article / web page ──
    try {
      const article = await extract(url);
      if (article?.content) {
        // Strip HTML tags to get plain text
        const plain = article.content
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (plain) {
          return NextResponse.json({
            text: plain.slice(0, 10000),
            title: article.title || "",
            source: "article",
          });
        }
      }
    } catch {
      // Article extraction failed — fall through
    }

    // ── Nothing worked ──
    return NextResponse.json(
      {
        error:
          "Couldn't read this link. Paste the content or describe the video here instead.",
      },
      { status: 422 }
    );
  } catch (error) {
    console.error("extract-url error:", error);
    return NextResponse.json(
      { error: "Failed to extract content from URL" },
      { status: 500 }
    );
  }
}
