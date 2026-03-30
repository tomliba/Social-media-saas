import { NextRequest, NextResponse } from "next/server";
import nodeHtmlToImage from "node-html-to-image";
import { readFileSync } from "fs";
import { join } from "path";
import { getTemplateById, getThemeById } from "@/lib/carousel-templates";

export async function POST(req: NextRequest) {
  try {
    const { templateId, themeId, slides, width, height } = await req.json();

    if (!templateId || !themeId || !slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: "templateId, themeId, and slides are required" }, { status: 400 });
    }

    const template = getTemplateById(templateId);
    const theme = getThemeById(themeId);
    if (!template || !theme) {
      return NextResponse.json({ error: "Unknown template or theme" }, { status: 400 });
    }

    // Read the HTML template file
    const templatePath = join(process.cwd(), "carousel_templates", template.filename);
    let html = readFileSync(templatePath, "utf-8");

    // Build CSS variable overrides from theme
    const cssVars = Object.entries(theme.vars)
      .map(([key, val]) => `${key}: ${val};`)
      .join("\n  ");

    // Override :root CSS variables in the template
    html = html.replace(
      /:root\s*\{[^}]*\}/,
      `:root {\n  ${cssVars}\n}`
    );

    // Override body dimensions if custom size
    const w = width || 1080;
    const h = height || 1350;
    html = html.replace(/width:\s*1080px/, `width: ${w}px`);
    html = html.replace(/height:\s*1350px/, `height: ${h}px`);

    // Render each slide to PNG
    const images: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slideData = {
        ...slides[i],
        slideNumber: String(i + 1).padStart(2, "0"),
        totalSlides: String(slides.length).padStart(2, "0"),
        handle: slides[i].handle || "@thefluidcurator",
      };

      const imageBuffer = await nodeHtmlToImage({
        html,
        content: slideData,
        puppeteerArgs: {
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
        selector: "body",
        type: "png",
      });

      // Convert buffer to base64 data URL
      const buffer = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer as unknown as ArrayBuffer);
      const base64 = buffer.toString("base64");
      images.push(`data:image/png;base64,${base64}`);
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error("render-carousel error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to render carousel" },
      { status: 500 }
    );
  }
}
