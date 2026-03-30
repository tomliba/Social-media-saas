// ── Carousel template definitions ──
// Maps the 10 HTML templates in /carousel_templates/ to their metadata and placeholder structures

export interface CarouselTemplate {
  id: string;
  name: string;
  filename: string;
  icon: string;
  description: string;
  /** Handlebars placeholders this template expects per slide */
  placeholders: string[];
  /** How Gemini should structure content for this template */
  contentPrompt: string;
}

export const carouselTemplates: CarouselTemplate[] = [
  {
    id: "editorial",
    name: "Editorial",
    filename: "01_editorial (1).html",
    icon: "article",
    description: "Bold headline + body text + bullet points",
    placeholders: ["sectionTitle", "sectionTitleAccent", "bodyText", "bullet1", "bullet2", "bullet3", "annotation", "handle"],
    contentPrompt: "a bold section title (split into main + accent word), a body paragraph, 3 bullet points, and a handwritten annotation",
  },
  {
    id: "magazine",
    name: "Magazine",
    filename: "02_magazine (1).html",
    icon: "menu_book",
    description: "Magazine-style with tag, headline, subtitle",
    placeholders: ["tag", "slideNumber", "totalSlides", "headline", "subtitle", "initial", "displayName", "handle"],
    contentPrompt: "a category tag, a magazine headline, a subtitle paragraph, and an author display name",
  },
  {
    id: "split",
    name: "Split",
    filename: "03_split.html",
    icon: "vertical_split",
    description: "Bold split-screen text layout",
    placeholders: ["slideNumber", "totalSlides", "sectionLabel"],
    contentPrompt: "a section label — the template handles visual layout automatically",
  },
  {
    id: "centered",
    name: "Centered",
    filename: "04_centered.html",
    icon: "format_align_center",
    description: "Minimal centered text, two lines",
    placeholders: ["slideNumber", "textLine1", "textLine2"],
    contentPrompt: "two impactful text lines — one main statement and one supporting line",
  },
  {
    id: "quote",
    name: "Quote",
    filename: "05_quote.html",
    icon: "format_quote",
    description: "Large quote with attribution",
    placeholders: ["quoteText", "author"],
    contentPrompt: "a powerful quote and its author attribution",
  },
  {
    id: "stats",
    name: "Stats",
    filename: "06_stats.html",
    icon: "monitoring",
    description: "Big number + explanation + percentage",
    placeholders: ["label", "number", "unit", "explanation", "percentage", "source"],
    contentPrompt: "a category label, a large statistic number with unit, an explanation paragraph, a percentage highlight, and a source citation",
  },
  {
    id: "comparison",
    name: "Comparison",
    filename: "07_comparison (1).html",
    icon: "compare",
    description: "Left vs right comparison table",
    placeholders: ["leftTitle", "rightTitle", "leftLabel", "leftItem1", "leftItem2", "leftItem3", "leftItem4", "rightLabel", "rightItem1", "rightItem2", "rightItem3", "rightItem4", "handle"],
    contentPrompt: "two column titles, a label for each side, and 4 items per side for comparison",
  },
  {
    id: "checklist",
    name: "Checklist",
    filename: "08_checklist (3).html",
    icon: "checklist",
    description: "Checklist with 5 items (3 checked, 2 pending)",
    placeholders: ["label", "headline", "item1Title", "item1Desc", "item2Title", "item2Desc", "item3Title", "item3Desc", "item4Title", "item4Desc", "item5Title", "item5Desc", "annotation", "handle"],
    contentPrompt: "a category label, a headline, and 5 checklist items each with a title and short description, plus a handwritten annotation",
  },
  {
    id: "timeline",
    name: "Timeline",
    filename: "09_timeline.html",
    icon: "timeline",
    description: "4-phase timeline with labels",
    placeholders: ["label", "phase1Label", "phase1Title", "phase1Desc", "phase2Label", "phase2Title", "phase2Desc", "phase3Label", "phase3Title", "phase3Desc", "phase4Label", "phase4Title", "phase4Desc", "handle"],
    contentPrompt: "a category label and 4 timeline phases each with a phase label (e.g. 'Week 1'), a title, and a description",
  },
  {
    id: "polaroid",
    name: "Polaroid",
    filename: "10_polaroid (1).html",
    icon: "photo_frame",
    description: "Polaroid-style with caption and annotation",
    placeholders: ["imageTag", "captionText", "annotation", "handle"],
    contentPrompt: "an image category tag, a caption text, and a handwritten annotation",
  },
];

// ── Color themes ──

export interface CarouselTheme {
  id: string;
  name: string;
  vars: Record<string, string>;
}

export const carouselThemes: CarouselTheme[] = [
  {
    id: "dark",
    name: "Dark Navy",
    vars: {
      "--bg": "#0D1B2A", "--bg-card": "#152238", "--accent": "#5DCCFF", "--accent2": "#E91E63",
      "--text": "#FFFFFF", "--text-body": "#F0F0F0", "--text-muted": "#94A3B8",
      "--bar-left": "#1976D2", "--bar-right": "#E91E63",
      "--grid": "rgba(26,45,66,.18)",
      "--bad-bg": "#2A1515", "--bad-color": "#FF6B6B", "--good-bg": "#152A18", "--good-color": "#69DB7C",
    },
  },
  {
    id: "light",
    name: "Clean White",
    vars: {
      "--bg": "#FFFFFF", "--bg-card": "#F8F8F8", "--accent": "#E91E63", "--accent2": "#1976D2",
      "--text": "#111111", "--text-body": "#333333", "--text-muted": "#999999",
      "--bar-left": "#111111", "--bar-right": "#111111",
      "--grid": "none",
      "--bad-bg": "#FFF0F0", "--bad-color": "#C62828", "--good-bg": "#E8F5E9", "--good-color": "#2E7D32",
    },
  },
  {
    id: "warm",
    name: "Warm Cream",
    vars: {
      "--bg": "#FAF5EE", "--bg-card": "#F3EDE4", "--accent": "#C67B5C", "--accent2": "#8B5E3C",
      "--text": "#2C1810", "--text-body": "#4A3628", "--text-muted": "#8B6B52",
      "--bar-left": "#D4A574", "--bar-right": "#C67B5C",
      "--grid": "none",
      "--bad-bg": "#F5E6E0", "--bad-color": "#A0522D", "--good-bg": "#E8F0E0", "--good-color": "#5D7A3A",
    },
  },
  {
    id: "neon",
    name: "Neon Dark",
    vars: {
      "--bg": "#0A0A0A", "--bg-card": "#141414", "--accent": "#00FF88", "--accent2": "#00CCFF",
      "--text": "#FFFFFF", "--text-body": "#CCCCCC", "--text-muted": "#555555",
      "--bar-left": "#00FF88", "--bar-right": "#00CCFF",
      "--grid": "rgba(255,255,255,.03)",
      "--bad-bg": "#1A0A0A", "--bad-color": "#FF4444", "--good-bg": "#0A1A0A", "--good-color": "#00FF88",
    },
  },
];

// ── Slide sizes ──

export interface SlideSize {
  id: string;
  label: string;
  width: number;
  height: number;
}

export const slideSizes: SlideSize[] = [
  { id: "instagram", label: "Instagram Post", width: 1080, height: 1350 },
  { id: "square", label: "Square", width: 1080, height: 1080 },
  { id: "story", label: "Story", width: 1080, height: 1920 },
  { id: "linkedin", label: "LinkedIn", width: 1080, height: 1350 },
  { id: "twitter", label: "Twitter", width: 1200, height: 675 },
];

export function getTemplateById(id: string) {
  return carouselTemplates.find((t) => t.id === id);
}

export function getThemeById(id: string) {
  return carouselThemes.find((t) => t.id === id);
}
