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
    id: "scrapbook",
    name: "Scrapbook",
    filename: "11_scrapbook.html",
    icon: "auto_awesome_mosaic",
    description: "Torn card, tape, handwritten notes",
    placeholders: ["headline", "highlightWord", "bodyText", "highlightPhrase", "annotation", "imageDescription", "photoCaption", "handle"],
    contentPrompt: "a headline with one underlined highlight word, body text with a highlighted phrase, a handwritten annotation, an image description, and a photo caption",
  },
  {
    id: "before_after",
    name: "Before & After",
    filename: "12_before_after.html",
    icon: "swap_horiz",
    description: "Side-by-side before vs after comparison",
    placeholders: ["tag", "beforeWord", "afterWord", "subtitle", "beforeItem1", "beforeItem2", "beforeItem3", "beforeItem4", "afterItem1", "afterItem2", "afterItem3", "afterItem4", "handle"],
    contentPrompt: "a category tag, a before word and after word for the title, a subtitle, and 4 items per side for before vs after comparison",
  },
  {
    id: "notes_app",
    name: "Notes App",
    filename: "13_notes_app.html",
    icon: "sticky_note_2",
    description: "iOS Notes-style with checklist and callout",
    placeholders: ["date", "title", "introText", "highlightText", "item1", "item2", "item3", "item4", "calloutText", "bottomText", "handle"],
    contentPrompt: "a date, a title, intro text with a highlighted phrase, 4 checklist items (first 2 checked, last 2 pending), a callout tip, and bold bottom text",
  },
  {
    id: "bold_text",
    name: "Bold Text",
    filename: "14_bold_text.html",
    icon: "format_bold",
    description: "Big bold statement with accent word",
    placeholders: ["tag", "slideNumber", "totalSlides", "mainText", "accentText", "subText", "progressPercent", "handle"],
    contentPrompt: "a category tag, main text and an accent word that pops, supporting subtext, and a progress percentage",
  },
  {
    id: "numbered_steps",
    name: "Numbered Steps",
    filename: "15_numbered_steps.html",
    icon: "format_list_numbered",
    description: "Step-by-step guide with pro tip card",
    placeholders: ["stepNumber", "totalSteps", "stepTitle", "stepDescription", "tipText", "handle"],
    contentPrompt: "a step number and total, a step title, a step description paragraph, and a pro tip",
  },
  {
    id: "do_this_not_that",
    name: "Do This Not That",
    filename: "16_do_this_not_that.html",
    icon: "rule",
    description: "Do vs don't with badges and details",
    placeholders: ["tag", "title", "dontText", "dontDetail", "dontBadge", "doText", "doDetail", "doBadge", "handle"],
    contentPrompt: "a category tag, a title, a don't-do-this text with detail and badge, and a do-this-instead text with detail and badge",
  },
];

// ── Image post templates (single-slide designs) ──

export const imagePostTemplates: CarouselTemplate[] = [
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
      "--text": "#FFFFFF", "--text-body": "#F0F0F0", "--text-muted": "#94A3B8", "--text-label": "#94A3B8",
      "--bar-left": "#1976D2", "--bar-right": "#E91E63", "--grid": "rgba(26,45,66,.18)",
      "--bad-bg": "#2A1515", "--bad-color": "#FF6B6B", "--bad-light": "#3D1C1C", "--bad-border": "#3D1C1C",
      "--good-bg": "#152A18", "--good-color": "#69DB7C", "--good-light": "#1C3D22", "--good-border": "#1C3D22",
      "--bg-gradient-start": "#0D1B2A", "--bg-gradient-mid1": "#162B44", "--bg-gradient-mid2": "#1A3A5C", "--bg-gradient-end": "#3A2070",
      "--fade-color": "rgba(13,27,42,.95)", "--tag-bg": "rgba(255,255,255,.12)",
      "--panel-text": "rgba(255,255,255,.6)", "--panel-divider": "rgba(255,255,255,.4)", "--accent-light": "#152238",
      "--card-bg": "#152238", "--card-shadow": "rgba(0,0,0,.3)", "--tag-bg-overlay": "rgba(0,0,0,.5)",
      "--grid-color": "rgba(93,204,255,.06)", "--glow-color": "rgba(93,204,255,.15)",
      "--paper": "#152238", "--tape": "rgba(93,204,255,.25)", "--doodle": "#3A5C7C",
      "--note-bg": "#152238", "--bar": "#5DCCFF", "--separator": "#1E3450", "--link": "#5DCCFF", "--highlight-bg": "rgba(93,204,255,.15)",
      "--stripe": "rgba(255,255,255,.02)", "--border": "#1E3450", "--divider": "#1E3450",
      "--before-color": "#FF6B6B", "--before-bg": "rgba(255,107,107,.08)", "--after-color": "#69DB7C", "--after-bg": "rgba(105,219,124,.08)",
      "--dont-color": "#FF6B6B", "--dont-bg": "#2A1515", "--dont-border": "rgba(255,107,107,.15)",
      "--do-color": "#69DB7C", "--do-bg": "#152A18", "--do-border": "rgba(105,219,124,.15)",
    },
  },
  {
    id: "light",
    name: "Clean White",
    vars: {
      "--bg": "#FFFFFF", "--bg-card": "#F8F8F8", "--accent": "#E91E63", "--accent2": "#1976D2",
      "--text": "#111111", "--text-body": "#333333", "--text-muted": "#999999", "--text-label": "#999999",
      "--bar-left": "#111111", "--bar-right": "#111111", "--grid": "none",
      "--bad-bg": "#FFF0F0", "--bad-color": "#C62828", "--bad-light": "#FFCDD2", "--bad-border": "#FCE4EC",
      "--good-bg": "#E8F5E9", "--good-color": "#2E7D32", "--good-light": "#C8E6C9", "--good-border": "#C8E6C9",
      "--bg-gradient-start": "#E8EAF6", "--bg-gradient-mid1": "#C5CAE9", "--bg-gradient-mid2": "#9FA8DA", "--bg-gradient-end": "#7986CB",
      "--fade-color": "rgba(255,255,255,.95)", "--tag-bg": "rgba(0,0,0,.08)",
      "--panel-text": "rgba(255,255,255,.7)", "--panel-divider": "rgba(255,255,255,.5)", "--accent-light": "#FCE4EC",
      "--card-bg": "#FFFFFF", "--card-shadow": "rgba(0,0,0,.08)", "--tag-bg-overlay": "rgba(0,0,0,.45)",
      "--grid-color": "rgba(0,0,0,.04)", "--glow-color": "rgba(233,30,99,.08)",
      "--paper": "#FFFFFF", "--tape": "rgba(233,30,99,.15)", "--doodle": "#DDAACC",
      "--note-bg": "#FFFFFF", "--bar": "#E91E63", "--separator": "#E5E5EA", "--link": "#E91E63", "--highlight-bg": "#FCE4EC",
      "--stripe": "rgba(0,0,0,.015)", "--border": "#E5E7EB", "--divider": "#E5E5EA",
      "--before-color": "#C62828", "--before-bg": "#FFF0F0", "--after-color": "#2E7D32", "--after-bg": "#E8F5E9",
      "--dont-color": "#C62828", "--dont-bg": "#FFF5F5", "--dont-border": "rgba(198,40,40,.12)",
      "--do-color": "#2E7D32", "--do-bg": "#F0FFF0", "--do-border": "rgba(46,125,50,.12)",
    },
  },
  {
    id: "warm",
    name: "Warm Cream",
    vars: {
      "--bg": "#FAF5EE", "--bg-card": "#F3EDE4", "--accent": "#C67B5C", "--accent2": "#8B5E3C",
      "--text": "#2C1810", "--text-body": "#4A3628", "--text-muted": "#8B6B52", "--text-label": "#8B6B52",
      "--bar-left": "#D4A574", "--bar-right": "#C67B5C", "--grid": "none",
      "--bad-bg": "#F5E6E0", "--bad-color": "#A0522D", "--bad-light": "#E8D5CC", "--bad-border": "#E8D5CC",
      "--good-bg": "#E8F0E0", "--good-color": "#5D7A3A", "--good-light": "#D4E4C4", "--good-border": "#D4E4C4",
      "--bg-gradient-start": "#F5EDE3", "--bg-gradient-mid1": "#E8D5C4", "--bg-gradient-mid2": "#D4B896", "--bg-gradient-end": "#C67B5C",
      "--fade-color": "rgba(250,245,238,.95)", "--tag-bg": "rgba(44,24,16,.1)",
      "--panel-text": "rgba(255,255,255,.65)", "--panel-divider": "rgba(255,255,255,.45)", "--accent-light": "#F3EDE4",
      "--card-bg": "#FFF8F0", "--card-shadow": "rgba(139,94,60,.12)", "--tag-bg-overlay": "rgba(44,24,16,.4)",
      "--grid-color": "rgba(198,123,92,.06)", "--glow-color": "rgba(198,123,92,.1)",
      "--paper": "#FFF8F0", "--tape": "rgba(198,123,92,.3)", "--doodle": "#C4A882",
      "--note-bg": "#FFF8F0", "--bar": "#C67B5C", "--separator": "#E8D5C4", "--link": "#C67B5C", "--highlight-bg": "rgba(198,123,92,.15)",
      "--stripe": "rgba(44,24,16,.015)", "--border": "#E8D5C4", "--divider": "#D4C4B0",
      "--before-color": "#A0522D", "--before-bg": "rgba(160,82,45,.06)", "--after-color": "#5D7A3A", "--after-bg": "rgba(93,122,58,.06)",
      "--dont-color": "#A0522D", "--dont-bg": "#F5E6E0", "--dont-border": "rgba(160,82,45,.12)",
      "--do-color": "#5D7A3A", "--do-bg": "#E8F0E0", "--do-border": "rgba(93,122,58,.12)",
    },
  },
  {
    id: "neon",
    name: "Neon Dark",
    vars: {
      "--bg": "#0A0A0A", "--bg-card": "#141414", "--accent": "#00FF88", "--accent2": "#00CCFF",
      "--text": "#FFFFFF", "--text-body": "#CCCCCC", "--text-muted": "#555555", "--text-label": "#555555",
      "--bar-left": "#00FF88", "--bar-right": "#00CCFF", "--grid": "rgba(255,255,255,.03)",
      "--bad-bg": "#1A0A0A", "--bad-color": "#FF4444", "--bad-light": "#2D1010", "--bad-border": "#2D1010",
      "--good-bg": "#0A1A0A", "--good-color": "#00FF88", "--good-light": "#0D2D0D", "--good-border": "#0D2D0D",
      "--bg-gradient-start": "#0A0A0A", "--bg-gradient-mid1": "#0A1A0A", "--bg-gradient-mid2": "#0A2A1A", "--bg-gradient-end": "#003322",
      "--fade-color": "rgba(10,10,10,.95)", "--tag-bg": "rgba(0,255,136,.12)",
      "--panel-text": "rgba(0,255,136,.6)", "--panel-divider": "rgba(0,255,136,.4)", "--accent-light": "#141414",
      "--card-bg": "#141414", "--card-shadow": "rgba(0,255,136,.1)", "--tag-bg-overlay": "rgba(0,0,0,.6)",
      "--grid-color": "rgba(0,255,136,.04)", "--glow-color": "rgba(0,255,136,.12)",
      "--paper": "#141414", "--tape": "rgba(0,255,136,.2)", "--doodle": "#005533",
      "--note-bg": "#141414", "--bar": "#00FF88", "--separator": "#222222", "--link": "#00FF88", "--highlight-bg": "rgba(0,255,136,.12)",
      "--stripe": "rgba(255,255,255,.02)", "--border": "#222222", "--divider": "#222222",
      "--before-color": "#FF4444", "--before-bg": "rgba(255,68,68,.06)", "--after-color": "#00FF88", "--after-bg": "rgba(0,255,136,.06)",
      "--dont-color": "#FF4444", "--dont-bg": "#1A0A0A", "--dont-border": "rgba(255,68,68,.15)",
      "--do-color": "#00FF88", "--do-bg": "#0A1A0A", "--do-border": "rgba(0,255,136,.15)",
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
  return carouselTemplates.find((t) => t.id === id)
    || imagePostTemplates.find((t) => t.id === id);
}

export function getImagePostTemplateById(id: string) {
  return imagePostTemplates.find((t) => t.id === id);
}

export function getThemeById(id: string) {
  return carouselThemes.find((t) => t.id === id);
}
