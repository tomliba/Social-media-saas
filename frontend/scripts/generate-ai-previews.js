/**
 * Generate AI preview images by calling Flask backend via Next.js API proxy.
 *
 * Requirements:
 *   1. Next.js dev server running at http://localhost:3000
 *   2. Flask backend (Contact_creator) running at FLASK_API_URL
 *
 * Usage:
 *   node scripts/generate-ai-previews.js              # generate all
 *   node scripts/generate-ai-previews.js --only-missing  # skip existing files
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Read env vars from .env.local (no dotenv dependency)
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnvFile(path.join(__dirname, "..", ".env"));
loadEnvFile(path.join(__dirname, "..", ".env.local"));

const FLASK_URL = (process.env.FLASK_API_URL || "http://localhost:5000") + "/pg/generate_ai_slide";
const FLASK_API_KEY = process.env.FLASK_API_KEY || "";
const DELAY_MS = 3000;

// ── Output directories ──

const DIRS = {
  ai: path.join(__dirname, "..", "public", "previews", "ai"),
  scenes: path.join(__dirname, "..", "public", "previews", "scenes"),
  ads: path.join(__dirname, "..", "public", "previews", "ads"),
};

// ── All 44 preview definitions ──

const MORNING_HABITS =
  "5 Morning Habits That Changed My Life: 1. Wake before 6am 2. No phone for 30 min 3. Cold shower 4. 10 min meditation 5. Journal 3 gratitudes";

const previews = [
  // ── AI CAROUSEL TYPES (4) ──
  {
    id: "infographic",
    dir: "ai",
    file: "infographic.png",
    prompt:
      "A professional Instagram carousel slide at 1080x1080px. Dark background (#1A2332), clean typography, coral and golden accents. Title at top: 'The 5-Step Morning Routine'. Below: 5 connected boxes in a vertical flow diagram with arrows between them: 'Wake Early' → 'Hydrate' → 'Move' → 'Journal' → 'Plan'. Each box has a small icon. Bottom: subtle tagline. Clean, polished infographic style.",
  },
  {
    id: "handdrawn-color",
    dir: "ai",
    file: "handdrawn-color.png",
    prompt:
      "Generate a hand-drawn carousel slide in a sketchy whiteboard illustration style. Format: 1:1 square (1080x1080). Warm cream background (#FDF6E3), black ink outlines (#2D2D2D), colored accents (coral #EF6351, blue #4BA3D4, green #6BBF6A, yellow #F4C542). Title: '3 Rules of Productivity'. Three numbered items with colorful pill badges and doodle icons. Thick wobbly outlines, organic hand-drawn feel. Sparkles and stars scattered in empty space. Bold handwritten labels.",
  },
  {
    id: "handdrawn-mono",
    dir: "ai",
    file: "handdrawn-mono.png",
    prompt:
      "Generate a hand-drawn carousel slide in a sketchy whiteboard style. Format: 1:1 square (1080x1080). Light cream background, pure black ink outlines only, no color. Title: 'How Habits Compound'. A simple flow diagram with wobbly lines showing: Small Action → Daily Repeat → Massive Results. Thick wobbly lines, dashed connectors, crosshatch fills. Bold handwritten labels. Stick figures. No color ever.",
  },
  {
    id: "notebook",
    dir: "ai",
    file: "notebook.png",
    prompt:
      "Generate a carousel slide that looks like a page from a spiral-bound dotted notebook. Format: 1:1 square (1080x1080). Warm cream background (#F5F0E8) with small evenly-spaced dots. BLACK SPIRAL COIL BINDING running down the LEFT edge (12 oval coils). Title in bold marker: 'How To Start'. Three numbered steps with colorful doodle icons (blue, green, orange). Light blue speech bubble saying 'Just begin!'. Yellow highlighter strip behind key text at bottom.",
  },

  // ── AI SCENES (18) ──
  {
    id: "video-wall",
    dir: "scenes",
    file: "video-wall.png",
    prompt: `Infographic about morning habits displayed across a massive TV screen in a modern electronics shop. Content: ${MORNING_HABITS}. 1:1 square. Photorealistic, cinematic quality.`,
  },
  {
    id: "breaking-news",
    dir: "scenes",
    file: "breaking-news.png",
    prompt: `Professional TV news studio. News anchor behind desk. Large screen displays morning habits infographic as Breaking News. Content: ${MORNING_HABITS}. Red chyron, studio lighting. 1:1 square. Photorealistic, cinematic quality.`,
  },
  {
    id: "cyberpunk-flyer",
    dir: "scenes",
    file: "cyberpunk-flyer.png",
    prompt: `Holographic flyer floating in a neon-drenched cyberpunk city. Glowing cyan and magenta text showing morning habits. Content: ${MORNING_HABITS}. Rain-slicked streets. 1:1 square. Photorealistic, cinematic quality.`,
  },
  {
    id: "movie-theater",
    dir: "scenes",
    file: "movie-theater.png",
    prompt: `View from back of darkened packed movie theater. Silver screen displays morning habits infographic. Content: ${MORNING_HABITS}. Audience silhouettes in foreground. 1:1 square. Photorealistic, cinematic quality.`,
  },
  {
    id: "graffiti-mural",
    dir: "scenes",
    file: "graffiti-mural.png",
    prompt: `Wide angle of building wall covered in vibrant graffiti mural showing morning habits as street art. Content: ${MORNING_HABITS}. Spray paint textures, drips. 1:1 square. Photorealistic, cinematic quality.`,
  },
  {
    id: "highway-billboard",
    dir: "scenes",
    file: "highway-billboard.png",
    prompt: `Giant highway billboard showing morning habits infographic. Content: ${MORNING_HABITS}. Workers on scaffolding. Blue sky. 1:1 square. Photorealistic, cinematic quality.`,
  },
  {
    id: "bus-wrap",
    dir: "scenes",
    file: "bus-wrap.png",
    prompt: `Red double-decker bus with full wrap advertisement displaying morning habits infographic. Content: ${MORNING_HABITS}. Motion blur on wheels. 1:1 square. Photorealistic, cinematic quality.`,
  },
  {
    id: "classic-newspaper",
    dir: "scenes",
    file: "classic-newspaper.png",
    prompt: `Top-down macro photo of vintage broadsheet newspaper with morning habits infographic. Content: ${MORNING_HABITS}. Yellowed paper, crisp black ink. 1:1 square. Photorealistic, cinematic quality.`,
  },
  {
    id: "manga-panel",
    dir: "scenes",
    file: "manga-panel.png",
    prompt: `Black and white manga page. Multiple panels with expressive characters discussing morning habits. Content: ${MORNING_HABITS}. Screentone textures, speed lines, speech bubbles. 1:1 square.`,
  },
  {
    id: "steampunk",
    dir: "scenes",
    file: "steampunk.png",
    prompt: `Victorian-era infographic of morning habits etched on aged parchment and brass plates. Content: ${MORNING_HABITS}. Clockwork gears, copper pipes, candlelight. 1:1 square.`,
  },
  {
    id: "cave-painting",
    dir: "scenes",
    file: "cave-painting.png",
    prompt: `Ancient morning habits infographic on flickering cavern wall. Content: ${MORNING_HABITS}. Ochre, charcoal, rust pigments. Primitive stick figures. 1:1 square.`,
  },
  {
    id: "egyptian-hieroglyphs",
    dir: "scenes",
    file: "egyptian-hieroglyphs.png",
    prompt: `Morning habits carved into weathered sandstone temple wall. Content: ${MORNING_HABITS}. Stylized pharaohs and hieroglyphic symbols. Faded blues, golds, terracotta. 1:1 square.`,
  },
  {
    id: "vintage-encyclopedia",
    dir: "scenes",
    file: "vintage-encyclopedia.png",
    prompt: `Close-up of open hardcover book with morning habits infographic. Content: ${MORNING_HABITS}. Botanical-style illustrations, elegant serif fonts, library lighting. 1:1 square.`,
  },
  {
    id: "nature-trail-sign",
    dir: "scenes",
    file: "nature-trail-sign.png",
    prompt: `Morning habits laser-engraved into rustic wooden trail sign. Content: ${MORNING_HABITS}. Sun-dappled forest, moss on edges. 1:1 square. Photorealistic.`,
  },
  {
    id: "whiteboard",
    dir: "scenes",
    file: "whiteboard.png",
    prompt: `Clean professional whiteboard with morning habits drawn in colored dry-erase markers. Content: ${MORNING_HABITS}. Charts, arrows, icons. Markers in tray. 1:1 square. Photorealistic.`,
  },
  {
    id: "classroom-chalkboard",
    dir: "scenes",
    file: "classroom-chalkboard.png",
    prompt: `University lecture hall. Professor gesturing at chalkboard filled with morning habits in colorful chalk. Content: ${MORNING_HABITS}. Student silhouettes. 1:1 square. Photorealistic.`,
  },
  {
    id: "top-secret-briefing",
    dir: "scenes",
    file: "top-secret-briefing.png",
    prompt: `Classified government folder on mahogany desk. Morning habits infographic stamped TOP SECRET in red. Content: ${MORNING_HABITS}. Brass lamp, spectacles. 1:1 square. Photorealistic.`,
  },
  {
    id: "tshirt-mockup",
    dir: "scenes",
    file: "tshirt-mockup.png",
    prompt: `Lifestyle photo of stylish person wearing white t-shirt with morning habits infographic printed on chest. Content: ${MORNING_HABITS}. 1:1 square. Photorealistic, fashion photography quality.`,
  },

  // ── CARTOON AD CONCEPTS (6) ──
  {
    id: "two_doors",
    dir: "ads",
    file: "cartoon-two_doors.png",
    prompt:
      "Illustrated cartoon ad. Person standing between two doors. Left door red/ominous labeled 'Manual Content Creation'. Right door glowing gold labeled 'AI Content Creator'. Dark background (#0A0A0A). White headline: 'CHOOSE WISELY'. 1:1 square.",
  },
  {
    id: "solo_vs_army",
    dir: "ads",
    file: "cartoon-solo_vs_army.png",
    prompt:
      "Illustrated cartoon. Left: one exhausted person at laptop. Right: same person commanding army of AI robots creating content. Dark background. Headline: 'STOP CREATING ALONE'. 1:1 square.",
  },
  {
    id: "race_track",
    dir: "ads",
    file: "cartoon-race_track.png",
    prompt:
      "Illustrated cartoon race track. Other creators in race cars speeding ahead. One person on bicycle falling behind. Dark background. Headline: 'THE RACE IS NOT EVEN CLOSE'. 1:1 square.",
  },
  {
    id: "before_after_split",
    dir: "ads",
    file: "cartoon-before_after_split.png",
    prompt:
      "Illustrated diagonal split. Top-left gray/stressed person drowning in content tasks. Bottom-right colorful/relaxed person with AI dashboard. Dark background. Headline: '30 DAYS FROM NOW'. 1:1 square.",
  },
  {
    id: "comic_panels",
    dir: "ads",
    file: "cartoon-comic_panels.png",
    prompt:
      "Three-panel comic strip. Panel 1: person overwhelmed by content deadlines. Panel 2: discovers AI tool. Panel 3: relaxed with content auto-generating. Bold outlines, dark background. 1:1 square.",
  },
  {
    id: "control_room",
    dir: "ads",
    file: "cartoon-control_room.png",
    prompt:
      "Illustrated person relaxed in command center monitoring AI dashboards creating content automatically. Glowing screens. Dark background. Headline: 'THIS IS MY MONDAY MORNING'. 1:1 square.",
  },

  // ── MEME AD TEMPLATES (10) ──
  {
    id: "drake",
    dir: "ads",
    file: "meme-drake.png",
    prompt:
      "Illustrated cartoon Drake meme. Top panel: Drake rejecting 'Spending 3 hours on one post'. Bottom panel: Drake approving 'AI makes 10 posts in 5 minutes'. Bold cartoon style, not photorealistic. 1:1 square.",
  },
  {
    id: "expanding_brain",
    dir: "ads",
    file: "meme-expanding_brain.png",
    prompt:
      "Illustrated Expanding Brain meme. 4 panels: 'Posting manually' (small brain), 'Using Canva' (medium brain), 'Scheduling tools' (big brain), 'AI creates everything' (galaxy brain). Cartoon style. 1:1 square.",
  },
  {
    id: "uno_draw_25",
    dir: "ads",
    file: "meme-uno_draw_25.png",
    prompt:
      "Illustrated UNO Draw 25 meme. Card says 'Use AI to create content'. Person holding 25 cards labeled 'I'll do it manually'. Cartoon style. 1:1 square.",
  },
  {
    id: "distracted_boyfriend",
    dir: "ads",
    file: "meme-distracted_boyfriend.png",
    prompt:
      "Illustrated Distracted Boyfriend meme. Boyfriend looking at 'AI Content Creator'. Girlfriend labeled 'Manual posting'. Cartoon style. 1:1 square.",
  },
  {
    id: "this_is_fine",
    dir: "ads",
    file: "meme-this_is_fine.png",
    prompt:
      "Illustrated This Is Fine meme. Dog sitting in burning room. Fire labeled 'Content deadlines'. Dog says 'This is fine'. Cartoon style. 1:1 square.",
  },
  {
    id: "grus_plan",
    dir: "ads",
    file: "meme-grus_plan.png",
    prompt:
      "Illustrated Gru's Plan meme. 4 panels: 'Make a content plan' → 'Schedule 30 posts' → 'Realize it takes 20 hours' → 'Realize it takes 20 hours'. Cartoon style. 1:1 square.",
  },
  {
    id: "tuxedo_winnie",
    dir: "ads",
    file: "meme-tuxedo_winnie.png",
    prompt:
      "Illustrated fancy vs casual bear meme. Two panels. Top panel: a simple cartoon bear in a plain red shirt with caption 'Posting content'. Bottom panel: the same bear wearing a tuxedo and monocle, looking refined, with caption 'Deploying an AI content pipeline'. Bold cartoon style. 1:1 square.",
  },
  {
    id: "running_balloon",
    dir: "ads",
    file: "meme-running_balloon.png",
    prompt:
      "Illustrated Running Away Balloon meme. Person letting go of balloon labeled 'Manual content creation'. Running toward 'AI automation'. Cartoon style. 1:1 square.",
  },
  {
    id: "virgin_vs_chad",
    dir: "ads",
    file: "meme-virgin_vs_chad.png",
    prompt:
      "Illustrated Virgin vs Chad meme. Left: nervous figure labeled 'Manual creator' with complaints. Right: confident figure labeled 'AI-powered creator' with wins. Cartoon style. 1:1 square.",
  },
  {
    id: "wojak",
    dir: "ads",
    file: "meme-wojak.png",
    prompt:
      "Illustrated Wojak meme. Thinking face with thought bubble: 'Maybe I should try that AI content tool everyone is talking about'. Simple cartoon style. 1:1 square.",
  },

  // ── E-COMMERCE AD STYLES (6) ──
  {
    id: "product_world",
    dir: "ads",
    file: "ecom-product_world.png",
    prompt:
      "Photorealistic ad. Protein powder container in a monochromatic purple environment. Purple set, purple lighting, purple props. Product prominent and centered. Dark background. Headline: 'FUEL YOUR GRIND'. 1:1 square.",
  },
  {
    id: "visual_metaphor",
    dir: "ads",
    file: "ecom-visual_metaphor.png",
    prompt:
      "Photorealistic ad. Protein powder container transformed into a rocket launching upward with energy trails. Dark background (#0A0A0A). Headline: 'LAUNCH YOUR GAINS'. 1:1 square.",
  },
  {
    id: "before_after",
    dir: "ads",
    file: "ecom-before_after.png",
    prompt:
      "Photorealistic ad. Diagonal split. Left: tired person, gray tones. Right: energetic athlete, golden tones, protein powder in hand. Dark background. Headline: '30 DAYS FROM NOW'. 1:1 square.",
  },
  {
    id: "lifestyle_scene",
    dir: "ads",
    file: "ecom-lifestyle_scene.png",
    prompt:
      "Photorealistic ad. Fit person in gym holding protein shaker, smiling confidently. Protein powder on bench. Warm cinematic lighting. Dark background. Headline: 'YOUR SECRET WEAPON'. 1:1 square.",
  },
  {
    id: "social_proof",
    dir: "ads",
    file: "ecom-social_proof.png",
    prompt:
      "Photorealistic ad. Giant '50,000+' in gold text. Below: 'Athletes trust this scoop'. Protein powder at bottom. Dark background, premium feel. 1:1 square.",
  },
  {
    id: "curiosity_hook",
    dir: "ads",
    file: "ecom-curiosity_hook.png",
    prompt:
      "Photorealistic ad. Close-up of protein powder scoop with mysterious glowing particles. Dark background. Headline: 'WHAT\\'S IN THE SCOOP?' Cinematic lighting. 1:1 square.",
  },
];

// ── Helpers ──

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateOne(entry, index, total, onlyMissing) {
  const outDir = DIRS[entry.dir];
  const outFile = path.join(outDir, entry.file);
  const label = `[${index + 1}/${total}] ${entry.dir}/${entry.file}`;

  if (onlyMissing && fs.existsSync(outFile)) {
    console.log(`${label} — skipped (exists)`);
    return "skipped";
  }

  process.stdout.write(`${label} — generating...`);

  try {
    const headers = { "Content-Type": "application/json" };
    if (FLASK_API_KEY) headers["X-API-Key"] = FLASK_API_KEY;

    const res = await fetch(FLASK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: entry.prompt,
        aspect_ratio: "1:1",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log(` FAILED (${res.status}): ${errText.slice(0, 120)}`);
      return "failed";
    }

    const data = await res.json();
    if (!data.image) {
      console.log(" FAILED: no image in response");
      return "failed";
    }

    // Strip data URL prefix if present
    const b64 = data.image.replace(/^data:image\/\w+;base64,/, "");
    const rawBuf = Buffer.from(b64, "base64");

    // Resize to 540x540 thumbnail
    await sharp(rawBuf)
      .resize(540, 540, { fit: "cover" })
      .png({ quality: 85 })
      .toFile(outFile);

    const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(0);
    console.log(` done (${sizeKB}KB)`);
    return "ok";
  } catch (err) {
    console.log(` FAILED: ${err.message}`);
    return "failed";
  }
}

// ── Main ──

async function main() {
  const onlyMissing = process.argv.includes("--only-missing");

  // Ensure output directories exist
  for (const dir of Object.values(DIRS)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`\nGenerating ${previews.length} AI preview images...`);
  console.log(`Flask: ${FLASK_URL}`);
  console.log(`Mode: ${onlyMissing ? "only missing" : "all (overwrite)"}\n`);

  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < previews.length; i++) {
    const result = await generateOne(previews[i], i, previews.length, onlyMissing);
    if (result === "ok") ok++;
    else if (result === "failed") failed++;
    else skipped++;

    // Delay between API calls (skip delay after last item or after skips)
    if (result !== "skipped" && i < previews.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n--- Done ---`);
  console.log(`  OK:      ${ok}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${previews.length}`);
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
