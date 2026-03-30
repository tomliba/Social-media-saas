const nodeHtmlToImage = require("node-html-to-image");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const TEMPLATES_DIR = path.join(__dirname, "..", "carousel_templates");
const OUTPUT_DIR = path.join(__dirname, "..", "public", "carousel-previews");

const themes = JSON.parse(
  fs.readFileSync(path.join(TEMPLATES_DIR, "themes.json"), "utf-8")
);

const templates = [
  {
    id: "editorial",
    filename: "01_editorial (1).html",
    sample: {
      handle: "@thefluidcurator",
      annotation: "this changes everything →",
    },
  },
  {
    id: "magazine",
    filename: "02_magazine (1).html",
    sample: {
      tag: "PRODUCTIVITY",
      slideNumber: "01",
      totalSlides: "07",
      headline: "The Morning Routine That Built a $10M Business",
      subtitle:
        "How one founder replaced hustle culture with intentional habits — and tripled output in 90 days.",
      initial: "S",
      displayName: "Sarah Chen",
      handle: "@thefluidcurator",
    },
  },
  {
    id: "split",
    filename: "03_split.html",
    sample: {
      slideNumber: "01",
      totalSlides: "07",
      sectionLabel: "MINDSET SHIFT",
    },
  },
  {
    id: "centered",
    filename: "04_centered.html",
    sample: {
      slideNumber: "03",
      textLine1: "You don't need more time.",
      textLine2: "You need fewer priorities.",
    },
  },
  {
    id: "quote",
    filename: "05_quote.html",
    sample: {
      quoteText:
        "The only way to do great work is to love what you do.",
      author: "Steve Jobs",
    },
  },
  {
    id: "stats",
    filename: "06_stats.html",
    sample: {
      label: "MARKET RESEARCH",
      number: "73",
      unit: "%",
      explanation:
        "of consumers say they prefer brands that personalize their shopping experience across all channels.",
      percentage: "73",
      source: "McKinsey & Company, 2024",
    },
  },
  {
    id: "comparison",
    filename: "07_comparison (1).html",
    sample: {
      leftTitle: "Beginner",
      rightTitle: "Expert",
      leftLabel: "What most people do",
      leftItem1: "Sets 10 goals at once",
      leftItem2: "Works harder, not smarter",
      leftItem3: "Skips the boring basics",
      leftItem4: "Quits after 2 weeks",
      rightLabel: "What top performers do",
      rightItem1: "Focuses on 1 key goal",
      rightItem2: "Builds systems & habits",
      rightItem3: "Masters fundamentals first",
      rightItem4: "Stays consistent for months",
      handle: "@thefluidcurator",
    },
  },
  {
    id: "checklist",
    filename: "08_checklist (3).html",
    sample: {
      label: "MORNING ROUTINE",
      headline: "5 Habits of Highly Productive People",
      item1Title: "Wake up before 6am",
      item1Desc: "Get ahead while others sleep",
      item2Title: "10 min meditation",
      item2Desc: "Clear mind, sharp focus",
      item3Title: "Exercise for 30 min",
      item3Desc: "Energy boost for the day",
      item4Title: "Journal 3 priorities",
      item4Desc: "Know your top tasks",
      item5Title: "No phone for 1 hour",
      item5Desc: "Protect your attention",
      annotation: "start tomorrow! →",
      handle: "@thefluidcurator",
    },
  },
  {
    id: "timeline",
    filename: "09_timeline.html",
    sample: {
      label: "YOUR 90-DAY PLAN",
      phase1Label: "Week 1-2",
      phase1Title: "Foundation",
      phase1Desc: "Set goals, audit current habits, create your system",
      phase2Label: "Week 3-4",
      phase2Title: "Build momentum",
      phase2Desc: "Daily practice, track progress, adjust approach",
      phase3Label: "Month 2",
      phase3Title: "Accelerate",
      phase3Desc: "Double down on what works, eliminate distractions",
      phase4Label: "Month 3",
      phase4Title: "Compound results",
      phase4Desc: "Habits are automatic, results speak for themselves",
      handle: "@thefluidcurator",
    },
  },
  {
    id: "polaroid",
    filename: "10_polaroid (1).html",
    sample: {
      imageTag: "TRAVEL",
      captionText: "The view from the top is worth every step of the climb.",
      annotation: "save this for later ↗",
      handle: "@thefluidcurator",
    },
  },
  {
    id: "scrapbook",
    filename: "11_scrapbook.html",
    sample: {
      headline: "The secret to",
      highlightWord: "consistency",
      bodyText: "It's not about motivation. It's about building",
      highlightPhrase: "systems that stick",
      annotation: "read this twice",
      imageDescription: "morning routine photo",
      photoCaption: "my 5am morning — day 47",
      handle: "@thefluidcurator",
    },
  },
  {
    id: "before_after",
    filename: "12_before_after.html",
    sample: {
      tag: "TRANSFORMATION",
      beforeWord: "Before",
      afterWord: "After",
      subtitle: "What changed when I quit social media for 30 days",
      beforeItem1: "Doom scrolling for 3+ hours",
      beforeItem2: "Constant comparison to others",
      beforeItem3: "Poor sleep quality every night",
      beforeItem4: "Zero creative output",
      afterItem1: "Read 4 books in a month",
      afterItem2: "Built a side project from scratch",
      afterItem3: "Sleep quality improved 80%",
      afterItem4: "Started a newsletter with 1K subs",
      handle: "@thefluidcurator",
    },
  },
  {
    id: "notes_app",
    filename: "13_notes_app.html",
    sample: {
      date: "March 28, 2026",
      title: "Things I Wish I Knew at 25",
      introText: "Life lessons that would have saved me years of",
      highlightText: "trial and error",
      item1: "Start investing early, even $50/mo",
      item2: "Your network IS your net worth",
      item3: "Learn to say no without guilt",
      item4: "Health is the ultimate currency",
      calloutText: "💡 The best time to start was yesterday. The second best time is now.",
      bottomText: "Save this note. Thank me later.",
      handle: "@thefluidcurator",
    },
  },
  {
    id: "bold_text",
    filename: "14_bold_text.html",
    sample: {
      tag: "MINDSET",
      slideNumber: "03",
      totalSlides: "07",
      mainText: "Stop waiting for",
      accentText: "motivation.",
      subText: "Discipline is doing it when you don't feel like it. That's the whole game.",
      progressPercent: "43",
      handle: "@thefluidcurator",
    },
  },
  {
    id: "numbered_steps",
    filename: "15_numbered_steps.html",
    sample: {
      stepNumber: "2",
      totalSteps: "5",
      stepTitle: "Build a Morning Routine",
      stepDescription: "Wake up 30 minutes earlier and dedicate that time to your most important task. No phone, no email, no distractions.",
      tipText: "Start with just 10 minutes. Consistency beats intensity every single time.",
      handle: "@thefluidcurator",
    },
  },
  {
    id: "do_this_not_that",
    filename: "16_do_this_not_that.html",
    sample: {
      tag: "PRODUCTIVITY",
      title: "Email Management",
      dontText: "Check email first thing in the morning",
      dontDetail: "You start the day reacting to other people's priorities instead of your own.",
      dontBadge: "⚠ Common mistake",
      doText: "Batch email into 2-3 time blocks",
      doDetail: "Protect your mornings for deep work. Email can wait until 11am.",
      doBadge: "✦ Expert move",
      handle: "@thefluidcurator",
    },
  },
];

async function main() {
  // Ensure output dir exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Check if sharp is available
  let hasSharp = true;
  try {
    require("sharp");
  } catch {
    hasSharp = false;
    console.log("sharp not found — will save full-size PNGs (install sharp for thumbnails)");
  }

  const themeIds = Object.keys(themes);
  let count = 0;
  const total = templates.length * themeIds.length;

  for (const template of templates) {
    const templatePath = path.join(TEMPLATES_DIR, template.filename);
    let html = fs.readFileSync(templatePath, "utf-8");

    for (const themeId of themeIds) {
      const theme = themes[themeId];
      const outputFile = path.join(OUTPUT_DIR, `${template.id}-${themeId}.png`);

      // Merge theme variables into existing :root block (keep template-specific vars)
      let themedHtml = html.replace(
        /:root\s*\{([^}]*)\}/,
        (match, existingVars) => {
          // Parse existing vars into a map
          const varMap = {};
          existingVars.replace(/(--[\w-]+)\s*:\s*([^;]+);/g, (_, key, val) => {
            varMap[key] = val.trim();
          });
          // Override with theme vars
          Object.entries(theme)
            .filter(([key]) => key.startsWith("--"))
            .forEach(([key, val]) => {
              varMap[key] = val;
            });
          const merged = Object.entries(varMap)
            .map(([key, val]) => `${key}: ${val};`)
            .join("\n  ");
          return `:root {\n  ${merged}\n}`;
        }
      );

      count++;
      const label = `[${count}/${total}] ${template.id}-${themeId}`;
      process.stdout.write(`${label}...`);

      try {
        const imageBuffer = await nodeHtmlToImage({
          html: themedHtml,
          content: template.sample,
          puppeteerArgs: {
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          },
          selector: "body",
          type: "png",
        });

        const buf = Buffer.isBuffer(imageBuffer)
          ? imageBuffer
          : Buffer.from(imageBuffer);

        if (hasSharp) {
          // Resize to 300x375 thumbnail
          await sharp(buf)
            .resize(300, 375, { fit: "cover" })
            .png({ quality: 85 })
            .toFile(outputFile);
        } else {
          fs.writeFileSync(outputFile, buf);
        }

        console.log(` done (${(buf.length / 1024).toFixed(0)}KB → ${(fs.statSync(outputFile).size / 1024).toFixed(0)}KB)`);
      } catch (err) {
        console.log(` FAILED: ${err.message}`);
      }
    }
  }

  console.log(`\nGenerated ${count} preview images in ${OUTPUT_DIR}`);
}

main().catch(console.error);
