import { NextRequest, NextResponse } from "next/server";
import nodeHtmlToImage from "node-html-to-image";
import { readFileSync } from "fs";
import { join } from "path";
import { getTemplateById, getThemeById } from "@/lib/carousel-templates";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { templateId, themeId, slides, width, height, photoUrl, authorName } = await req.json();

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

    // Merge theme variables into existing :root block (keep template-specific vars)
    html = html.replace(
      /:root\s*\{([^}]*)\}/,
      (_match: string, existingVars: string) => {
        const varMap: Record<string, string> = {};
        existingVars.replace(/(--[\w-]+)\s*:\s*([^;]+);/g, (_: string, key: string, val: string) => {
          varMap[key] = val.trim();
          return "";
        });
        Object.entries(theme.vars).forEach(([key, val]) => {
          varMap[key] = val;
        });
        const merged = Object.entries(varMap)
          .map(([k, v]) => `${k}: ${v};`)
          .join("\n  ");
        return `:root {\n  ${merged}\n}`;
      }
    );

    // Override body dimensions if custom size
    const w = width || 1080;
    const h = height || 1350;
    html = html.replace(/width:\s*1080px/, `width: ${w}px`);
    html = html.replace(/height:\s*1350px/, `height: ${h}px`);

    // Inject photo into templates that support it
    if (photoUrl) {
      // Replace the {{photoUrl}} placeholder with the actual photo element
      html = html.replace(
        /\{\{photoUrl\}\}/g,
        photoUrl
      );
      // Show the photo container
      html = html.replace(
        /display:\s*var\(--photo-display\)/g,
        "display: flex"
      );
    } else {
      // Hide the photo container when no photo
      html = html.replace(
        /display:\s*var\(--photo-display\)/g,
        "display: none"
      );
      html = html.replace(/\{\{photoUrl\}\}/g, "");
    }

    // Render each slide to PNG
    const images: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slideData = {
        ...slides[i],
        slideNumber: String(i + 1).padStart(2, "0"),
        totalSlides: String(slides.length).padStart(2, "0"),
        handle: slides[i].handle || "@thefluidcurator",
      };

      // Override author/handle/displayName with user-provided name
      if (authorName) {
        slideData.author = authorName;
        slideData.handle = authorName;
        slideData.displayName = authorName;
      }

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
