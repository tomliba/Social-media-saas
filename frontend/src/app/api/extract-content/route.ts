import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { auth } from "@/lib/auth";

export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 25 MB limit" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    let text = "";

    if (name.endsWith(".pdf")) {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text: pdfText } = await extractText(pdf, { mergePages: true });
      text = pdfText;
    } else if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, DOCX, or TXT." },
        { status: 400 }
      );
    }

    text = text.trim();
    if (!text) {
      return NextResponse.json(
        { error: "Could not extract any text from this file" },
        { status: 400 }
      );
    }

    // Truncate to ~10k chars to avoid blowing up the Gemini prompt
    if (text.length > 10000) {
      text = text.slice(0, 10000) + "\n\n[Content truncated]";
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("extract-content error:", error);
    return NextResponse.json(
      { error: "Failed to extract text from file" },
      { status: 500 }
    );
  }
}
