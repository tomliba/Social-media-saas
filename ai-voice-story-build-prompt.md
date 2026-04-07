# Build Prompt: AI Voice Story Setup Page

## Context

I'm building a Social Media SaaS. The frontend is Next.js at `C:\Claude projects\Social_media_saas\frontend` deployed on Vercel. The backend is Flask at `C:\Claude projects\Contact_creator` deployed on Railway. I use Remotion for video rendering via Trigger.dev.

I already have a working "Character Video" style that uses After Effects puppet-pin animated characters with TTS narration over Pexels stock video backgrounds. Now I need to add a second video style called "AI Voice Story" which is a faceless video format: AI-generated images (via Flux on fal.ai) as scene backgrounds, with TTS narration (Fish Audio) and word-by-word captions, rendered in Remotion.

Read PROGRESS.md in the frontend directory for current state of the project.

## What Already Exists

- Style picker page at `/create/video-styles` with a "Character Video" card (this page was reverted and needs to be re-created, see session summary below)
- Video setup page at `/create/video-setup` for Character Video (also reverted, needs re-creation)
- FormatPicker.tsx component that routes Video format to `/create/video-styles`
- Backend endpoint POST `/vg/generate_script` for Gemini script generation
- Backend endpoint POST `/vg/tts` for Fish Audio TTS
- Backend endpoint POST `/vg/visual-plan` for generating visual asset plan
- Backend endpoint POST `/vg/resolve-assets` for downloading Pexels clips
- Backend endpoint POST `/vg/start` for Remotion render
- Trigger.dev task `render-video.ts` that orchestrates the full pipeline
- Flux integration in `video_generator.py` via `generate_flux_image()` function (fal-ai/flux/schnell, $0.009 per 1080x1920 image)
- `generate_background_image()` in backend still uses Gemini (for ad creatives), NOT Flux

## Video Setup Pages That Were Reverted

The following pages were built and tested but reverted during a WMI crisis. They need to be re-created from scratch with improvements:

- `/create/video-styles/page.tsx` - Style picker grid
- `/create/video-setup/page.tsx` - Combined setup page
- `FormatPicker.tsx` - One-line change: Video card routes to `/create/video-styles`
- `/api/generate-ideas/route.ts` - "Viral Ideas" template

## Task

### Step 1: Re-create the Style Picker Page

`/create/video-styles/page.tsx`

A grid of style cards. Currently two cards:
1. **Character Video** - existing style, navigates to `/create/video-setup?style=character`
2. **AI Voice Story** - new style, navigates to `/create/video-setup?style=ai-story`

Each style card is a config object in an array so more styles can be added later easily. Each card shows a thumbnail image, title, and short description.

### Step 2: Build the AI Voice Story Setup Page

When `/create/video-setup?style=ai-story` is loaded, show the AI Voice Story setup page. This is a single scrollable page (NOT tabs) with these sections in order:

#### Section 1: Header
- Back arrow button (goes to `/create/video-styles`)
- Title: "AI voice story"
- Subtitle: "Create faceless AI-narrated videos"

#### Section 2: Step Indicator
- Three pill badges: "Setup" (active/purple), "Script" (gray), "Review" (gray)
- These update as the user progresses through the flow

#### Section 3: Topic Dropdown
- Dropdown selector with these options:
  - **Custom Prompt** (at top, purple text, opens a textarea)
  - **Popular Topics header**
  - Bible Stories (with "New" badge)
  - Random AI Story
  - Travel Destinations
  - What If?
  - Scary Stories
  - Bedtime Stories
  - Interesting History
  - Urban Legends
  - Motivational
  - Fun Facts
  - Long Form Jokes
  - Life Pro Tips
  - ELI5
  - Philosophy
  - Product Marketing
  - Engagement Bait
- Default selection: "Scary Stories"

#### Section 4: Art Style
- Label: "Art style"
- Subtitle: "Choose the visual style for your scenes"
- Horizontal scrolling row of cards with thumbnail preview images
- Each card: 90px wide, ~120px tall, rounded corners, art style name at bottom
- Art styles (each is just a Flux prompt modifier string):
  - Anime
  - Ghibli
  - Pixel Art
  - Comic
  - Lego
  - Dark Fantasy
  - Watercolor
  - 3D Toon
  - Film Noir
  - Painting
  - Minecraft
  - Whiteboard
  - Creepy Comic
  - Realism
  - Low Poly
  - Charcoal
  - Photo Realism
  - Children's Book
  - GTAV
  - Expressionism
- Selected card gets a purple border
- For now use gradient placeholder backgrounds for thumbnails (we'll replace with real images later)

#### Section 5: Scene Mode
- Label: "Scene mode"
- Subtitle: "How your scenes look and feel"
- Two side-by-side cards in a 2-column grid:

**Card 1: Static (Free)**
- Dark visual preview area with an image icon
- Title: "Static" with green "Free" badge
- Description: "AI images with smooth Ken Burns zoom and pan"
- Selected by default with purple border

**Card 2: Animated (Premium)**
- Dark visual preview area with a play icon
- Title: "Animated" with purple "Premium" badge  
- Description: "Each scene becomes a 3-5s AI video clip via Kling AI"
- This is a major upgrade, not just a toggle. Make it visually prominent.

#### Section 6: Caption Style
- Label: "Caption style"
- 3x3 grid of caption preview cards
- Each card has a dark preview area showing sample text in that style, and a label below
- Caption styles:
  1. **Bold Stroke** - thick white text with black stroke outline
  2. **Red Highlight** - active word turns red
  3. **Sleek** - white text with glow effect
  4. **Karaoke** - active word gets purple background box
  5. **Majestic** - bold italic serif, cinematic
  6. **Beast** - chunky thick stroke text (MrBeast style)
  7. **Elegant** - thin serif with letter spacing
  8. **Pixel** - monospace retro font
  9. **Clarity** - lowercase rounded clean font
- Selected card gets purple border

#### Section 7: Background Music
- Label: "Background music" with "Optional" tag
- List of music tracks, each row has:
  - Colored gradient square icon (left)
  - Track name + short description (middle)
  - Play preview button (right)
- Tracks:
  1. Happy rhythm - Upbeat, energetic (orange/yellow gradient)
  2. Quiet before storm - Tension and anticipation (blue/purple gradient)
  3. Brilliant symphony - Orchestral, majestic (blue gradient)
  4. Breathing shadows - Mysterious, eerie (dark purple gradient)
  5. 8-bit slowed - Eerie chiptune, retro (green gradient)
  6. Deep bass - Dark atmosphere (dark gradient)
- Selected row gets purple border
- "No music" option at bottom
- Default: auto-select based on topic (e.g. Scary Stories defaults to Breathing Shadows)

#### Section 8: Creative Settings
- Label: "Creative settings"
- Subtitle: "Using your defaults. Tap any to change."
- Row of pill buttons:
  - Male voice (opens VoicePickerModal)
  - Normal speed
  - 30 seconds
  - Dramatic (tone)
- Each pill is tappable and opens a popover or modal to change the setting

#### Section 9: Effects (Optional)
- Label: "Effects" with "Optional" tag
- Toggle rows:
  1. **Film grain** - "Old film look with scanlines and noise" - with "New" badge
  2. **Shake effect** - "Eerie motion for horror and thriller" - with "New" badge
- Each has an on/off toggle switch

#### Section 10: End Screen CTA
- Label: "End screen CTA"
- Text input with placeholder "Follow for more!"

#### Section 11: Generate Button
- Full-width purple button: "Generate story ideas"
- Clicking this should eventually call the backend to generate script ideas
- For now, just log the selected config to console

### Step 3: Update FormatPicker.tsx

The Video card in FormatPicker.tsx should route to `/create/video-styles` instead of directly to video setup.

## Design Guidelines

- Match the existing app's design system (check existing pages for reference)
- Use the app's existing purple accent color (#7C3AED or whatever is defined in the theme)
- Dark theme if the app uses dark theme, light theme if light
- Single scrollable page, NO tabs
- All sections stack vertically
- Selected items get a purple border highlight
- Keep it clean and simple, not overwhelming
- Mobile-friendly responsive design

## Important Notes

- This is frontend only for now. Backend changes come later.
- The generate button should collect all selected options into a config object and console.log it for testing
- Art style thumbnails will be gradient placeholders for now
- Music tracks don't need actual audio playback yet, just the UI
- The Scene Mode section should make it very clear that Animated is a significant premium upgrade over Static, not just a small toggle
- Each topic preset will eventually map to a different Gemini system prompt, but for now just store the topic ID
- Each art style will eventually map to a Flux prompt modifier string, but for now just store the style ID

## Config Object Shape

When the user clicks "Generate story ideas", collect this object:

```typescript
{
  style: "ai-story",
  topic: "scary_stories",       // topic preset ID or "custom"
  customPrompt: "",             // if topic is "custom"
  artStyle: "anime",            // art style ID
  sceneMode: "static",          // "static" or "animated"
  captionStyle: "bold_stroke",  // caption style ID
  music: "breathing_shadows",   // music track ID or null
  voice: "geography",           // Fish Audio voice ID
  speed: 1.0,                   // TTS speed
  duration: 30,                 // seconds
  tone: "dramatic",             // tone preset
  effects: {
    filmGrain: false,
    shake: false,
  },
  endScreenCta: "Follow for more!",
}
```

## Session Summary (for context on reverted pages)

Video-setup pages were built, tested, then reverted with `git checkout .` during a WMI crisis. The pages that were created and need to be factored into this build:

- /create/video-styles/page.tsx - Style picker grid with "Character Video" card
- /create/video-setup/page.tsx - Combined setup page (~1072 lines)
- FormatPicker.tsx - One-line change: Video card routes to /create/video-styles
- /api/generate-ideas/route.ts - Added "Viral Ideas" template

Issues found during testing that need to be fixed:
- Large padding gap (pt-24 pb-40) creating blank space on setup page
- Tone and Duration were inside "Pick a template" section - should be pills in Creative Settings
- Niche input was inside "Pick a template" - should be at top of page, always visible
- Motion Graphics missing from Background Mode popover
- No auto-scroll when clicking "Generate viral ideas" button

The Character Video setup page should still work as before. The AI Voice Story setup page is a NEW page that loads when ?style=ai-story is in the URL. Both share the same route `/create/video-setup` but render different content based on the style query param.
