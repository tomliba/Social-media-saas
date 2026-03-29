# Social Media Content Creator SaaS — Product Spec v2

## PRODUCT VISION

AI content creation + scheduling SaaS for creators and personal brands. Two modes: **Create** (hands-on content creation) and **Autopilot** (fully automated cross-platform posting). Positioned as the AI content co-pilot that does 90% of the work but keeps the creator in control of the final 10%.

Target audience: Content creators with 10K-1M+ followers who need to post daily but don't have time. Distribution channel: @doctor_curses (1M+ Instagram followers) and @proffesor_historgasm.

Pitch: "Create a week of content before lunch."

---

## ARCHITECTURE

### Two-Service Setup

**Service 1: Next.js Frontend (Vercel)**
- Everything the user sees and touches
- Auth, database, calendar, template picker, script editor, settings
- Trigger.dev for background job scheduling
- Ayrshare for multi-platform posting
- Fast edge-deployed globally via Vercel's CDN (70+ cities)
- Scales automatically — 10 users or 10,000, no config needed

**Service 2: Flask Video/Post Engine (Railway)**
- Existing Contact Creator codebase (`C:\Claude projects\Contact_creator`)
- All heavy processing: Remotion renders, TTS, Whisper, Pexels, Gemini
- Exposed as REST API (JSON responses)
- No timeout limits (106s video renders)
- GitHub: tomliba/Contact-creator
- Scales horizontally — add more Railway workers when needed

**Why two services:**
- Video render takes ~106s — exceeds Vercel's 60s function timeout
- Python dependencies (pydub, rembg, Pillow, Whisper) have no TypeScript equivalents
- Existing pipeline is battle-tested (188 tests passing)
- User never waits on Railway directly — async job model
- Each service scales independently (frontend scaling is free on Vercel, render scaling = more Railway workers)

**How they connect:**
```
User → Next.js (Vercel) → Trigger.dev → Flask API (Railway) → returns video URL → Trigger.dev → Ayrshare → posts to platforms
```

**Scaling at 5,000 subscribers with autopilot:**
```
Vercel (auto-scales, no config needed)
  → Trigger.dev (distributes jobs across workers)
      → Railway Worker 1  ─┐
      → Railway Worker 2   │  renders in parallel
      → Railway Worker 3   │  
      → Railway Worker 4   │
      → Railway Worker 5  ─┘
  → Ayrshare (posts results to platforms)
```

### Key Infrastructure
- **Trigger.dev v3** — background jobs, delayed scheduling, parallel renders, cron for autopilot
- **Ayrshare** — unified API posting to 13+ platforms (IG, TikTok, X, LinkedIn, YouTube, Threads, Pinterest, Reddit, etc.)
- **PostgreSQL** — database (existing on Railway)
- **Lemon Squeezy** — billing (existing)
- **Google OAuth** — auth (existing)

---

## DESIGN DIRECTION

### Visual Style
- **Light mode** — NOT dark mode. Target users are creators on Instagram, not developers. Clean, warm, approachable.
- **Canva meets CapCut meets Later** — visual, creator-focused, content-forward
- **Primary accent**: Purple/violet (#7C3AED)
- **Warm neutrals** with soft shadows and rounded corners (16px)
- **Visual-first**: Big thumbnails, video previews, visual content cards everywhere. Never show raw data or text-heavy layouts.
- **Mobile-first thinking** even on desktop — big touch targets, one action per section, no clutter

### Design Principles
1. **Show output, not process** — every screen should make the creator see their content, not interface elements
2. **One action per section** — never overwhelm with multiple choices in the same visual space
3. **Visual over text** — use thumbnails, previews, icons instead of text descriptions
4. **Warm and creative** — this is a creator tool, not enterprise software
5. **Mobile-ready thinking** — big touch targets, cards not tables, vertical scrolling
6. **Social proof from creators** — real creator faces, handles, follower counts. Not corporate logos
7. **The CTA is always clear** — one obvious next step per screen, always in purple
8. **Before/after sells** — whenever possible show the contrast between the old way and the new way

### Design Reference Apps
- **Canva** — big visual template grid, one-click to start creating, output-forward
- **CapCut** — creator-focused video tool, simple flow, visual settings not text dropdowns
- **Later** — Instagram grid preview, visual calendar, content looks like content not data

---

## TWO MODES

### Create Mode (Phase 1 — build first)
User actively creates content. Picks format, then input method, then configures and generates. Hands-on, one format at a time. Can batch up to 5 at once. Async rendering — user submits and walks away, content renders in background, notifications when ready.

### Autopilot Mode (Phase 2 — build later)
One button, full content factory. System automatically generates content across ALL formats and ALL platforms at once — video for Reels, carousel for IG feed, thread for X, caption for LinkedIn. User turns it on, content flows. This is a completely separate feature from Create mode, not just "Create with more automation."

---

## CREATE MODE — FULL FLOW

### Step 0: Format Picker
User picks what type of content to create. Shown as LARGE visual cards (not tiny tabs):
- **Video** (most prominent, "Most popular" badge) — AI explainers, tutorials, stories, myth busters
- **Image Post** — AI-generated images with captions
- **Carousel** — Educational slides for Instagram
- **Text** — Captions, threads, hooks for any platform

### Step 0.5: Input Method
After picking a format, user chooses HOW to start. Shown as clean horizontal cards:

1. **Templates** (highlighted as recommended) — Pick a viral format, get 10 AI ideas. Shows pills: "Did You Know", "Myth Buster", "X vs Y", etc. This is the main path at launch.
2. **Free type** (add later) — Just describe what you want, AI figures out the rest
3. **Viral link** (add later) — Paste a URL to a trending video/post, AI analyzes and creates your version
4. **Upload content** (add later) — Upload a PDF, document, or paste text, AI transforms it into content
5. **Viral right now** (add later) — Curated trending formats (e.g., skeleton videos via Gemini + Kling). Tom manually adds these when trends emerge. Each pre-fills ALL settings — template, topic angle, visual style, background type. One tap to recreate.

**Launch with Templates only.** Other input methods are additional entry points into the same pipeline — they can be added one at a time without changing any downstream code.

---

## CREATE MODE — VIDEO PIPELINE (fully mapped)

### Screen 1: Template + Idea Selection

**Template grid:** Did You Know, X vs Y, Myth Buster, Story Time, Top 5, How-To, Hot Take, What Happens If

User taps a template → AI generates 10 viral ideas based on template + user's niche. Each idea shown as a card with:
- Checkbox (select up to 5)
- Bold idea title
- Niche tag

User selects 1-5 ideas → taps "Continue"

### Screen 2: Script + Settings

**Script cards section:**
AI generates scripts for ALL selected ideas simultaneously. Each shown as an editable card:
- Card header: "Video 1 of 5"
- Idea title
- Editable script text area
- "Regenerate" button
- Checkbox to include/exclude

**Settings pills (below all script cards):**
Horizontal row of rounded pill buttons showing current selection:
- **Tone**: Funny / Serious / Cursing / Edgy-Controversial
- **Presenter**: Animated character (pick which) / HeyGen avatar (pro) / Text only / Upload own
- **Voice**: Fish Audio TTS voices (10-15 options, independent of character) / Upload own (future)
- **Background**: Stock footage (Pexels) / AI images (Gemini) / Kling video (pro) / Upload own
- **Duration**: 15s / 30s / 60s / AI picks best
- **Layout**: Character + background / Split screen / Text only
- **Music**: Trending audio / None / Upload (future)

**Settings behavior:**
- SHARED across all videos by default
- User can tap into individual script card to override settings for that specific video
- Pre-filled from user defaults if set in preferences
- If no defaults set, user picks on the spot
- Small muted text: "Using your defaults · Tap any to change for this batch"

**CTA button:** "Create 5 videos ✨" (number updates based on selection)
Below: "Videos render in the background · We'll notify you when ready · ~7 min estimated"

### Screen 3: Review + Schedule (async)

After hitting "Create all":
- User sees confirmation: "Your videos are being created!"
- User is FREE — can create more content, browse ideas, or close the app
- All videos render in PARALLEL as separate Trigger.dev jobs on Railway
- Each job is independent — if one fails, others still finish

**Review screen shows:**

Ready video cards:
- Large video preview in phone-shaped frame with play button
- Video title
- Platform selector (IG, TikTok, YT, X, LinkedIn icons — toggle on/off)
- Caption preview (collapsible)
- Action buttons: "Schedule" (primary), "Post now" (outlined), discard (icon)
- Inline date/time picker if Schedule is tapped

Rendering video cards:
- Shimmer/skeleton loading placeholder
- Title still visible
- Progress text: "Generating audio..." or "Rendering video..."
- Action buttons disabled

### User Defaults / Preferences
Users CAN set default values in preferences (not required):
- Default niche
- Default tone
- Default character
- Default background style
- Default duration
- Default language

These pre-fill settings pills so repeat users fly through creation in under 60 seconds. Over time, users can automate more steps in preferences (always use "Did You Know" template, AI picks ideas, skip script review, etc.).

### Video Templates (Gemini prompt variations)
Each template is a different Gemini prompt that structures the script differently:

| Template | Script Structure | Example |
|---|---|---|
| Did You Know | Hook fact → explanation → mind-blow → CTA | "Did you know octopuses have 3 hearts?" |
| X vs Y | Setup both → compare point by point → verdict | "Coffee vs Green Tea — which is better?" |
| Myth Buster | State myth → "but actually" → truth → proof | "Cracking knuckles does NOT cause arthritis" |
| Story Time | Hook → build tension → climax → resolution | "In 1971, a man jumped from a plane with $200K..." |
| Top 5 | Hook → countdown 5 to 1 → surprise #1 → CTA | "5 foods secretly destroying your gut" |
| How-To | Problem → step-by-step solution → result | "Fall asleep in 2 minutes — military method" |
| Hot Take | Controversial claim → defense → evidence | "Stretching before exercise is useless" |
| What Happens If | Hypothetical → timeline of effects → conclusion | "What if you stopped eating sugar for 30 days?" |

Adding a new template = adding a new Gemini prompt file. Zero code changes.

### Rendering Pipeline (existing, on Railway)
```
generate_script(topic, tone, template, language, duration)
  → run_parallel_generation(script, voice_id, scenes, keywords)
      ├── Thread A: Fish Audio TTS → MP3
      └── Thread B: Pexels video clips → trimmed MP4s
  → get_word_timestamps(audio, fish_timestamps)
      └── Whisper API → word-level timestamps
  → render_with_remotion(audio, backgrounds, character, timestamps)
      └── Video.tsx → composites everything → final MP4
```

**Timing (~30s video):** Script ~12s, TTS+Pexels ~15s (parallel), Whisper ~5s, Remotion ~83s. **Total: ~106s**

---

## CREATE MODE — OTHER FORMATS (to be mapped in detail)

### Image Post
- Existing pipeline in `post_generator.py`
- Topic → AI generates image + caption
- Gemini image generation
- Already has trending topics, 10 ideas, batch generation

### Carousel
- Topic → AI generates 5-8 educational slides
- Each slide = Gemini-generated image with text
- New but lightweight to build on top of existing post pipeline

### Quote Card
- Styled text on a background
- Simplest format — Gemini generates quote, rendered as image

### Caption + Hooks
- Text only — Gemini generates multiple hook variations + full caption
- Lightest format, no rendering needed

### Thread
- Multi-part text optimized for X or LinkedIn
- Gemini generates, per-post editor

### Text on Video (no character)
- Bold animated text over stock footage or gradients
- No character, no TTS — uses trending audio or silence
- 6-15 seconds, fastest to produce

---

## AUTOPILOT MODE (Phase 2 — build after Create mode launches)

One button system — completely separate from Create mode.

**What it does:** Generates content across ALL formats for ALL platforms simultaneously:
- Video → Instagram Reels, TikTok, YouTube Shorts
- Carousel → Instagram Feed
- Thread → X
- Caption → LinkedIn

**Setup (one time):**
- Niche / topics
- Content types to generate (video, carousel, thread, caption — checkboxes with platform mapping)
- Style: tone, character, background preference
- Schedule: frequency (daily / 5x week / 3x week), time, which days
- Review mode: "Queue for review" (recommended) vs "Full auto" (Pro plan)

**Daily operation:**
- Trigger.dev cron fires at scheduled time
- Generates idea → creates content pack across all selected formats
- If "Queue for review": drops everything in dashboard as drafts, notifies user
- If "Full auto": posts immediately via Ayrshare

---

## LANDING PAGE STRATEGY

### Hero Section
- Left: Bold headline "Make a week of content before lunch" + subheadline + CTA "Start creating — it's free" + "No credit card needed"
- Right: Phone mockup with auto-scrolling carousel showing different content types the app creates (character video, carousel, quote card, thread). Can be swapped for autoplay video later.
- Below hero: "Used by 10,000+ creators on" + platform icons (Instagram, TikTok, YouTube, Threads, LinkedIn)

### Before/After Section (highest conversion impact)
Two columns:
- "The old way" (grayed out): Research 45min → Write script 30min → Record/animate 2hrs → Edit 1hr → Post each platform 20min = "4+ hours for one video"
- "With [app name]": Pick template 5sec → Choose idea 10sec → Review script 30sec → Hit Create = "2 minutes"

### What You Can Create
Horizontal scrollable row of phone-shaped frames showing actual output:
- Animated character explainer video
- Carousel post
- Quote card image
- X thread
- Text-on-video
Each labeled below: 'AI Video', 'Carousel', 'Quote Card', 'Thread', 'Text Video'

### Creator Testimonials
Not corporate logos — real creator faces, handles, follower counts, quotes about the tool, thumbnails of content they made with it.

### Pricing Section
4 tier cards (see Pricing below), Creator plan highlighted as "Most popular"

### Final CTA
"Your competitors are posting every day. Are you?" + "Start creating for free" button

---

## PAGE MAP

### Launch Pages
1. **Landing page** — converts Instagram traffic (hero with video output, before/after, content examples, testimonials, pricing)
2. **Pricing page** — 4 tiers
3. **Login / Sign up** — Google OAuth + email
4. **Onboarding** — connect social platforms + set niche + set defaults (optional, not required)
5. **Dashboard / Calendar** — home hub, visual content calendar showing thumbnails (like Later/Planoly, NOT a spreadsheet)
6. **Create: Format picker + Input method** — choose video/image/carousel/text, then choose how to start (template/free type/viral link/upload/trending)
7. **Create: Template + Ideas** (for video) — template grid → 10 ideas → select up to 5
8. **Create: Script + Settings** — batch script review + settings pills
9. **Create: Review** — async, content trickles in, preview + schedule each
10. **Connected accounts** — manage platform connections
11. **Preferences** — defaults for tone, character, background, niche, etc.
12. **Autopilot setup** — niche, content types, style, schedule, review mode (Phase 2)
13. **Analytics** — basic post performance (later)
14. **Account / Billing** — plan management via Lemon Squeezy

### Dashboard Design
- Visual content calendar (NOT a spreadsheet grid)
- Each day column shows actual content as VISUAL CARDS with thumbnails
- Video cards: thumbnail frame + play button + duration badge + platform icons
- Image cards: actual generated image
- Text cards: first line of text in styled card
- Status dots: green = published, purple = scheduled, gray = draft, amber pulse = rendering
- Notification banner when videos are ready for review
- Feels like looking at your Instagram grid for the future

---

## PRICING

| Tier | Price | Videos/mo | Posts/mo | Features |
|---|---|---|---|---|
| Free | $0 | 3 (720p, watermark) | 10 | Create mode, 1 platform |
| Starter | $12/mo | 20 | 50 | Create mode, all platforms |
| Creator ⭐ | $24/mo | 60 | 150 | + Autopilot (draft/review mode) |
| Pro | $49/mo | 200 | Unlimited | + Full auto + AI video backgrounds + HeyGen avatars |

---

## EXISTING CODEBASE REUSE MAP

### Fully Reusable (keep as-is on Railway)
- `video_generator.py` — entire video pipeline (2000+ lines)
- `post_generator.py` — post generation pipeline
- `app/remotion_renderer.py` — Remotion render wrapper
- `video-renderer/` — entire Remotion project (Video.tsx, lip sync, captions)
- `characters/` — 16 characters with body frames, mouth PNGs, config.json
- `app/billing.py` — Lemon Squeezy integration
- `app/auth.py` — Google OAuth, email verification
- `app/models.py` — User + Generation models (extend, don't rewrite)

### Needs Modification (on Railway)
- `video_generator.generate_script()` — add `template` parameter that selects from prompt files
- Add new endpoint: `generate_video_ideas(template, niche)` — returns 10 viral ideas (similar to existing `/pg/generate_ideas`)
- Flask routes — ensure all return clean JSON (some may currently return HTML)
- API authentication — add API key or JWT verification for requests from Next.js

### Replaced by Next.js
- All `templates/` Jinja2 HTML files — landing, dashboard, video_generator, post_generator, etc.
- Frontend UI logic — replaced by React components
- SSE progress streams — replaced by Trigger.dev job status polling

### New (in Next.js)
- Template system UI (template picker, idea browser)
- Batch script editor (multi-card layout with shared settings pills)
- Trigger.dev task definitions (publish-post, render-video, autopilot-daily)
- Ayrshare integration (platform posting)
- Content calendar view (visual, thumbnail-based)
- Async job status + notification system
- Format picker + input method selection

---

## ENVIRONMENT VARIABLES

### Existing (Railway — Flask)
```
SECRET_KEY, DATABASE_URL, GEMINI_API_KEY, FISH_API_KEY,
OPENAI_API_KEY, PEXELS_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_WEBHOOK_SECRET,
LEMON_SQUEEZY_STORE_ID, LEMON_SQUEEZY_VARIANT_*,
APP_URL, MAIL_* (SMTP config)
```

### New (Vercel — Next.js)
```
RAILWAY_API_URL (Flask backend URL)
TRIGGER_DEV_API_KEY
AYRSHARE_API_KEY
NEXT_PUBLIC_* (client-side vars)
```

---

## OPEN-SOURCE COMPONENTS TO USE

### Phase 1 (now — video pipeline):
- Ayrshare SDK: `npm install social-media-api` — use for all platform posting
- Ayrshare demo repo (github.com/ayrshare/social-api-demo) — reference for platform selection UI, media upload flow, and scheduled posting patterns
- Lemon Squeezy JS SDK: `npm install @lemonsqueezy/lemonsqueezy.js` — billing, checkout, and subscription management in Next.js
- Trigger.dev examples repo (github.com/triggerdotdev/examples) — reference the nextjs-server-actions and realtime-fal-ai-image-gen patterns for async video rendering
- Remotion prompt-to-video template (github.com/remotion-dev/template-prompt-to-video) — reference for AI script → video rendering architecture. Do NOT install — our video rendering stays on the Flask/Railway backend. This is architecture reference only.
- Trigger.dev blog tutorial on social media scheduling: trigger.dev/blog/schedule-your-posts-with-nextjs — reference for the Next.js + Trigger.dev scheduling pattern

### Phase 2 (dashboard upgrade):
- FullCalendar React: `npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction` — replace the current mock calendar with a real drag-and-drop content calendar
- @automattic/social-previews: `npm install @automattic/social-previews` — show pixel-accurate previews of how posts look on Instagram, X, LinkedIn before publishing

### Phase 3 (editor upgrade):
- Tiptap or Novel — rich text editor for script editing with AI autocompletion
- TanStack Table + shadcn Data Table — for batch content management

### Phase 4 (autopilot):
- facebook/bart-large-mnli via HF Inference API — zero-shot content classification, 100x cheaper than Gemini for tagging hundreds of posts
- cardiffnlp/tweet-topic-21-multi — auto-tag content into social media topic categories
- cardiffnlp/twitter-roberta-base-sentiment-latest — sentiment gate to catch negative tone before auto-posting

---

## BUILD ORDER

### Phase 1: Create Mode — Video (weeks 1-3)
1. Set up Next.js project with auth (Google OAuth) and database
2. Build landing page (match Stitch designs)
3. Add template prompt files to Contact Creator Flask app
4. Add video idea generation endpoint to Flask app
5. Build format picker + input method UI
6. Build template picker + idea browser UI
7. Build batch script editor + settings pills UI
8. Integrate Trigger.dev for async video rendering
9. Build review/preview screen with async notification
10. Integrate Ayrshare for posting
11. Build visual content calendar / dashboard
12. Deploy: Next.js to Vercel, Flask stays on Railway

### Phase 2: Other Formats (weeks 3-4)
- Image post, carousel, quote card, caption, thread
- Each format uses existing post_generator.py or lightweight Gemini calls
- Same pipeline: format picker → input → generate → settings → review → schedule

### Phase 3: Additional Input Methods (weeks 4-5)
- Free type (text box, AI picks structure)
- Viral link (paste URL, AI analyzes and remixes)
- Upload content (PDF/text → AI transforms)
- Viral right now (curated trending formats)

### Phase 4: Polish (week 5-6)
- Pricing page + Lemon Squeezy integration in Next.js
- Onboarding flow
- Analytics basics
- Phone mockup carousel on landing page

### Phase 5: Autopilot (month 2-3)
- Autopilot setup page
- Daily cron via Trigger.dev
- Cross-platform content pack generation (video + carousel + thread + caption from one idea)
- Auto-post vs queue-for-review toggle

---

## KEY DECISIONS LOG

1. **Two services** — Next.js (Vercel) + Flask (Railway). Video renders can't run on Vercel (106s > 60s limit). Ideal architecture for scaling.
2. **Async rendering** — user submits and walks away, videos render in background, notifications when ready. Never block the user.
3. **Batch creation** — select up to 5 ideas, all render in parallel as separate Trigger.dev jobs.
4. **Templates as prompts** — each video template is a Gemini prompt file, not a code change. Adding templates = adding text files.
5. **Settings as defaults** — set once in preferences, override per-video via pills. Not required — new users pick on the spot.
6. **Ayrshare for posting** — single API for 13+ platforms, handles OAuth/tokens/formatting. No building individual platform integrations.
7. **Trigger.dev for scheduling** — delayed jobs (scheduled posts), parallel renders, cron (autopilot).
8. **Create and Autopilot are separate features** — Create is hands-on one-format-at-a-time. Autopilot is one-button cross-platform content factory generating ALL formats for ALL platforms.
9. **Character is a setting, not the feature** — templates and content types are the star, character/presenter is one of many settings pills.
10. **Viral tab curated by Tom** — manually add trending formats (skeleton videos, etc.), each pre-fills all settings. Zero engineering complexity.
11. **Design first in Stitch** — light mode, creator-focused (Canva/CapCut/Later feel), visual-first. Establish design language before coding.
12. **Don't rewrite the Flask pipeline** — wrap it in a better frontend and add scheduling on top. ~60% of the product already exists.
13. **Landing page shows output, not features** — phone mockup with auto-scrolling content carousel, before/after time comparison, creator testimonials.
14. **Input methods are separate entry points** — templates, free type, viral link, upload, curated viral all feed into the same downstream pipeline. Build templates first, add others later.
15. **Light mode default** — target users are creators on Instagram, not developers. Warm, visual, approachable design.
16. **Dashboard is visual** — content shown as thumbnails in a calendar (like Later/Planoly), not as a data table.
