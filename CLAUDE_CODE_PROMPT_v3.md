# IMAGE POST SYSTEM — EXTEND EXISTING FLOW

## IMPORTANT: This builds ON TOP of what already exists. Do NOT delete or rewrite existing working code unless noted. Do NOT create new HTML template files — we're keeping the existing 4 templates for now.

## READ THESE FILES FIRST (before making any changes)
- `frontend/src/lib/carousel-templates.ts` — existing template + theme definitions (THE source of truth)
- `frontend/src/app/create/templates/image-templates-section.tsx` — existing 4-step flow
- `frontend/src/app/create/templates/page.tsx` — tone selector + templates page
- `frontend/src/app/create/editor/page.tsx` — editor/renderer
- `frontend/src/app/api/generate-image-post-ideas/route.ts` — AI idea generation
- `frontend/src/app/api/render-carousel/route.ts` — HTML→PNG rendering (Puppeteer)
- `frontend/src/components/create/FormatPicker.tsx` — format picker entry
- `frontend/src/components/create/InputMethodSelection.tsx` — input method selection

---

## WHAT ALREADY EXISTS (keep all of this working)

### Templates (in carousel-templates.ts as `imagePostTemplates`)
- Centered (04_centered.html) — placeholders: slideNumber, textLine1, textLine2
- Quote (05_quote.html) — placeholders: quoteText, author
- Stats (06_stats.html) — placeholders: label, number, unit, explanation, percentage, source
- Polaroid (10_polaroid.html) — placeholders: imageTag, captionText, annotation, handle

### Themes (in carousel-templates.ts as `carouselThemes`)
12+ themes with 40+ CSS custom properties each. Injected into HTML template :root {} at render time.

### Current flow
1. /create → FormatPicker → pick "Image Post" → InputMethodSelection → "Pick a template"
2. /create/templates?format=image → ImageTemplatesSection:
   - Step "layout": pick template (4 cards)
   - Step "theme": pick color theme (12+ themes)
   - Step "topic": enter topic
   - Step "ideas": review 10 AI ideas, select up to 5
3. /create/editor → generates slide content → renders PNG → saves to library

### State management
Local React useState in ImageTemplatesSection:
- step: "layout" | "theme" | "topic" | "ideas"
- selectedLayout, selectedTheme, topic, ideas[], selectedIdeas, loading

### APIs
- POST /api/generate-image-post-ideas — Gemini generates 10 ideas
- POST /api/generate-carousel-slides — generates placeholder values per idea
- POST /api/render-carousel — HTML template + theme CSS → Puppeteer → PNG

---

## CHANGES TO MAKE

### 1. ADD TEXT SOURCE SELECTION to ImageTemplatesSection

Currently the flow is: layout → theme → topic → ideas.

Change it to: layout → theme → **source** → topic/input → ideas.

After theme selection, add a new step "source" that shows 5 option cards:

```tsx
type TextSource = "ai_ideas" | "custom_text" | "from_link" | "from_file" | "custom_prompt";
```

Update the step type:
```tsx
type Step = "layout" | "theme" | "source" | "topic" | "ideas";
```

Each text source is an option card with icon, title, description. When selected, it expands an inline input below the card:

1. **"AI writes it"** (star icon) — "Get 10 ideas, pick your favorite"
   - Shows topic text input below when selected
   - Action button: "Generate 10 ideas"
   - Goes to existing ideas step
   - This is the DEFAULT selected option

2. **"I'll write it"** (pencil icon) — "Paste or type your own text"
   - Shows textarea below when selected
   - Action button: "Preview post"
   - SKIPS the ideas step, goes directly to editor with the user's text filling the template

3. **"From a link"** (link icon) — "Paste YouTube, TikTok, Instagram or article URL"
   - Shows URL text input below when selected
   - Action button: "Analyze & generate ideas"
   - Goes to ideas step (backend extracts content from URL, generates ideas based on it)

4. **"From a file"** (file icon) — "Upload PDF, document, or article"
   - Shows file upload area below when selected (accept .pdf, .docx, .txt)
   - Action button: "Read & generate ideas"
   - Goes to ideas step (backend extracts text from file, generates ideas based on it)

5. **"Describe what you want"** (gear icon, labeled "power user") — "Tell AI what to write in your own words"
   - Shows textarea below when selected
   - Action button: "Generate from prompt"
   - Goes to ideas step (backend uses their description as Gemini context)

Add to component state:
```tsx
const [textSource, setTextSource] = useState<TextSource>("ai_ideas");
const [sourceInput, setSourceInput] = useState(""); // URL, custom text, or custom prompt
const [sourceFile, setSourceFile] = useState<File | null>(null);
```

The "source" step replaces the current "topic" step. The topic input moves INSIDE the "AI writes it" card (since topic is only needed for that source). The action button label changes based on selected source.

Validation before the action button is enabled:
- ai_ideas: topic must be filled
- custom_text: textarea must have text
- from_link: URL input must be filled
- from_file: file must be uploaded
- custom_prompt: textarea must have text

### 2. ADD PHOTO UPLOAD SUPPORT

For templates that support photos (Quote and Polaroid already have author/handle fields — add `supportsPhoto: true` to their definitions in carousel-templates.ts).

In the "source" step, BELOW the text source cards and ABOVE the action button, show a divider then:

**Photo upload section** (only visible when selected template has `supportsPhoto === true`):
- Section label: "Your photo (optional)"
- Upload area: dashed border box with camera icon, "Upload your photo", subtitle "Shows next to your name in this template"
- Accepts image files: .jpg, .jpeg, .png, .webp
- After upload: replace upload area with a preview row showing circle-cropped thumbnail + filename + file size + "Change" link
- Upload photo to R2 via new API endpoint (see backend section)

**Name toggle** (only visible when selected template has name/author placeholder fields):
- Checkbox: "Add my name to this post"
- When checked: show text input for display name
- Auto-fill from user settings if available (check if there's a user profile/settings system)

Add to component state:
```tsx
const [photoFile, setPhotoFile] = useState<File | null>(null);
const [photoUrl, setPhotoUrl] = useState<string | null>(null);
const [showName, setShowName] = useState(false);
const [authorName, setAuthorName] = useState("");
```

Pass photoUrl and authorName through to the editor page via URL params.

### 3. UPDATE BACKEND: Idea Generation API

Update `frontend/src/app/api/generate-image-post-ideas/route.ts` to handle different text sources.

Add parameters to the request body:
```ts
{
  topic?: string,          // only for ai_ideas
  niche?: string,          // existing
  templateName: string,    // existing
  tone: string,            // existing
  textSource: TextSource,  // NEW
  sourceInput?: string,    // NEW — URL for from_link, prompt for custom_prompt
}
```

Logic per source:
- **ai_ideas**: existing logic unchanged (topic + niche → Gemini → 10 ideas)
- **from_link**:
  - YouTube URLs → call YouTube Data API v3 to get video title + description + auto-captions
  - Other URLs → fetch page content, extract main text (strip HTML tags)
  - Feed extracted text as context to Gemini along with template info → generate 10 ideas
  - DO NOT use yt-dlp
- **from_file**: handled client-side — extract text from file in the browser, send as sourceInput text
- **custom_prompt**: use their prompt text as additional context for Gemini → generate 10 ideas

The output format stays the same: `{ ideas: [{ title, hook, tag }] }`

### 4. NEW BACKEND: Photo Upload API

Create `frontend/src/app/api/upload-photo/route.ts`:
- Accept POST with multipart file upload
- Upload image to R2 content-library bucket (same bucket used for video renders)
- Return `{ photoUrl: string }` — the public URL of the uploaded image

### 5. UPDATE BACKEND: Render API

Update `frontend/src/app/api/render-carousel/route.ts`:
- Add optional `photoUrl` parameter to the request body
- If photoUrl is provided, inject the photo into the HTML template before rendering:
  - Replace a `{{photoUrl}}` placeholder in the HTML template with an `<img>` tag
  - The img should be circle-cropped: `border-radius: 50%; width: 80px; height: 80px; object-fit: cover;`
- This allows the Quote template to show the user's photo next to the author name

### 6. UPDATE EDITOR PAGE

Update `frontend/src/app/create/editor/page.tsx`:
- Read `photoUrl` from URL params
- Read `textSource` from URL params
- For "custom_text" source: receive the text directly (from URL param or passed state), populate template placeholders, render immediately without going through idea generation
- Pass photoUrl to the render-carousel API call

### 7. ADD `supportsPhoto` TO TEMPLATE DEFINITIONS

In `carousel-templates.ts`, add `supportsPhoto: boolean` to the imagePostTemplate type and set it for each template:
- Centered: `supportsPhoto: false`
- Quote: `supportsPhoto: true` (photo shows next to author name)
- Stats: `supportsPhoto: false`
- Polaroid: `supportsPhoto: false` (it's AI-generated, photo doesn't apply)

Also add `{{photoUrl}}` placeholder support to the Quote HTML template (05_quote.html) — add a circle image element next to the author text that only renders when photoUrl is provided.

---

## BUILD ORDER

Build and test in this order:

1. **Text source step UI** — add the "source" step to ImageTemplatesSection with 5 option cards + inline inputs. Wire up state. The action button should work for "ai_ideas" (existing flow). Other sources can show the UI but don't need to work yet.

2. **Photo upload UI** — add the photo upload section + name toggle to the source step. Wire up state. Upload API can come later — just get the UI working with local file preview.

3. **Photo upload API** — create the /api/upload-photo endpoint, connect the UI to it.

4. **Update idea generation API** — add from_link, from_file, custom_prompt support to the existing endpoint.

5. **Custom text flow** — make "I'll write it" skip the ideas step and go to editor with text pre-filled.

6. **Update editor** — handle new URL params (textSource, photoUrl, sourceInput).

7. **Update render API** — add photoUrl injection into HTML templates.

---

## IMPORTANT NOTES

- Match the EXISTING design patterns. Warm cream aesthetic, purple (#7C3AED) accents, rounded corners. Look at how the existing tone selector and template cards are styled and match that exactly.
- The tone selector at the TOP of the templates page already works — don't touch it.
- The theme system with CSS custom properties already works — don't change it.
- The render-carousel API with Puppeteer already works — don't rewrite it, just add the photoUrl parameter.
- The carousel template system is SHARED across formats — don't break carousel or text post rendering.
- URL params are used to pass data between pages — follow the same pattern.
- Do NOT create new HTML template files — we're using the existing 4 templates only.
- For file text extraction in "from_file": do it client-side in the browser using pdf.js for PDFs and mammoth.js for DOCX. Send the extracted text as sourceInput to the API. This avoids needing server-side file parsing.
