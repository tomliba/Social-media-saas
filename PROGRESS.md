# The Fluid Curator — Build Progress

## Project Structure

```
Social_media_saas/
├── social_media_saas_product_spec_v2.md    # Product spec
├── screenshots/                             # Design references from Google Stitch
│   ├── landing_page_updated_visuals/
│   ├── main_dashboard_visual_planner/
│   ├── create_format_input_selection/
│   ├── templates_idea_selection/
│   ├── batch_script_editor_settings/
│   ├── review_schedule_content/
│   ├── autopilot_setup/
│   └── lumina_creative/
├── PROGRESS.md                              # This file
└── frontend/                                # Next.js 16 app (Vercel)
    ├── .env                                 # Environment variables
    ├── package.json
    ├── tsconfig.json
    ├── prisma/
    │   ├── schema.prisma                    # Database schema
    │   ├── dev.db                           # SQLite dev database
    │   └── migrations/
    └── src/
        ├── app/                             # Pages (App Router)
        ├── components/                      # Shared components
        ├── lib/                             # Auth, Prisma, Gemini configs
        └── middleware.ts                    # Route protection
```

## Tech Stack

- **Framework:** Next.js 16 with App Router, TypeScript, Turbopack
- **Styling:** Tailwind CSS v4 with `@theme` directive for design tokens
- **Fonts:** Plus Jakarta Sans (headlines), Be Vietnam Pro (body) via `next/font/google`
- **Icons:** Google Material Symbols Outlined (CDN)
- **Auth:** NextAuth.js v5 (beta) with JWT sessions
- **Database:** Prisma v5 + SQLite (local dev), will switch to PostgreSQL for production
- **AI:** Google Gemini 2.5 Flash via `@google/generative-ai` SDK
- **Design System:** Light mode, purple primary (#6f33d5), warm neutral surfaces (#f7f6f4)

## Pages Built

### Public Pages
| Route | File | Description |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Landing page — hero, social proof, before/after comparison, content showcase, testimonials, pricing, final CTA, footer |
| `/login` | `src/app/login/page.tsx` | Login page — Google OAuth button + dev credentials login |
| `/signup` | `src/app/signup/page.tsx` | Signup page — Google OAuth button + free tier benefits |
| `/pricing` | *(not yet built)* | Pricing page (public, listed in middleware allow-list) |

### Protected Pages (require auth)
| Route | File | Description |
|-------|------|-------------|
| `/dashboard` | `src/app/dashboard/page.tsx` | Visual content calendar with notification banner, calendar grid (5 columns Mon-Fri), multiple card types (video, carousel, caption draft, rendering), floating action bar |
| `/create` | `src/app/create/page.tsx` | Format picker — 4 large cards (Video, Image Post, Carousel, Text). Selecting one reveals input method section with slide-in animation |
| `/create/templates` | `src/app/create/templates/page.tsx` | **Video:** Template grid (12 templates, 3x4 grid) + niche input + Tone/Duration selectors + Gemini ideas. **Image:** Topic + niche input + Tone selector → Flask `/pg/generate_ideas` for 10 post ideas. Select up to 5, continue to editor |
| `/create/editor` | `src/app/create/editor/page.tsx` | **Video:** Script cards + regenerate + settings pills (presenter, voice w/ audio preview, background, layout). **Image:** Post idea cards with editable hooks + settings pills (platform only). Tone/Duration set on templates page, passed via URL params |
| `/create/review` | `src/app/create/review/page.tsx` | **Video:** Video player + platform toggles + caption + schedule. **Image:** Image gallery with post1/post2 variant thumbnails + caption + platform toggles + schedule. Shared components for platform selector, captions, scheduler, action buttons |
| `/autopilot` | `src/app/autopilot/page.tsx` | Autopilot setup — hero section, on/off toggle, bento grid config (niche, content types, style/tone, schedule with day picker, approval mode) |

### Layouts
| Route | File | Description |
|-------|------|-------------|
| Root | `src/app/layout.tsx` | Root layout with fonts, Material Symbols CDN link |
| `/dashboard/*` | `src/app/dashboard/layout.tsx` | DashboardNav + Sidebar + main content area |
| `/create/*` | `src/app/create/layout.tsx` | DashboardNav + Sidebar + main content area |
| `/autopilot/*` | `src/app/autopilot/layout.tsx` | DashboardNav + Sidebar |

## API Routes

| Endpoint | Method | Input | Output | Status |
|----------|--------|-------|--------|--------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handlers | Session management | Working |
| `/api/generate-ideas` | POST | `{template, niche}` | 10 viral video ideas with titles + tags. Requires stats in 3+ titles | Working (Gemini 2.5 Flash, JSON mode) |
| `/api/generate-scripts` | POST | `{template, ideas[], tone, duration}` | Script per idea with tone/duration-aware generation. 10 tones, 12 templates, banned opening phrases | Working (Gemini 2.5 Flash, JSON mode) |
| `/api/generate-post-ideas` | POST | `{topic, tone, niche, platform}` | Proxies to Flask `/pg/generate_ideas`, returns 10 post ideas with `pg_job_id` | Working |
| `/api/voice-preview` | POST | `{voice_id}` | Proxies to Flask `/vg/voice-preview`, returns MP3 audio sample | Working (used for generating static samples) |
| `/api/generate-carousel-ideas` | POST | `{topic, niche, templateName}` | 10 carousel topic ideas via Gemini 2.5 Flash | Working |
| `/api/generate-carousel-slides` | POST | `{templateId, title, hook, slideCount, tone, niche}` | Slide content per template placeholders via Gemini | Working |
| `/api/generate-text-ideas` | POST | `{topic, niche, tone, platform}` | 10 text post ideas (caption/thread/hook/story) via Gemini | Working |
| `/api/render-carousel` | POST | `{templateId, themeId, slides[], width, height}` | Renders HTML templates to PNG via node-html-to-image | Working |
| `/api/video-proxy` | GET | `?path=/vg/preview/...` | Proxies video files from Flask with API key auth, bypassing Flask `@login_required` | Working |

## Trigger.dev Integration (Async Video Rendering)

- **Package:** `@trigger.dev/sdk` + `@trigger.dev/react-hooks`
- **Config:** `frontend/trigger.config.ts` — project config, 5min max duration, 2 retries
- **Task:** `frontend/trigger/render-video.ts` — `render-video` task
  - Accepts: title, script, template, settings (tone, presenter, background, duration, layout)
  - Returns: title, videoUrl, previewUrl, caption
  - Maps frontend settings to Flask API values (tone → funny_clean/educational/etc., duration → 15/30/60, character → directory names)
  - Real pipeline: POST `/vg/generate_script` (mode: "script") → POST `/vg/start` → SSE `/vg/events/<job_id>` streaming
  - Metadata updates from Flask SSE: parallel (audio+backgrounds) → lipsync → remotion → complete
  - Falls back to ~25s simulation if `FLASK_API_URL` not set
- **Video server action:** `src/app/actions/create-videos.ts` — `triggerVideoRenders()` triggers N parallel jobs, returns run IDs + public access tokens
- **Post task:** `frontend/trigger/render-post.ts` — `render-post` task
  - Accepts: pgJobId, selectedIdeas (numbers), ideaTopics, settings (tone, platform)
  - Calls Flask `/pg/start` with selected ideas → streams `/pg/events/<id>` SSE (step numbers 2-5)
  - Returns: results array with topic, imageUrls, caption per post
- **Post server action:** `src/app/actions/create-posts.ts` — `triggerPostRenders()` triggers single job for all selected ideas
- **Editor integration:** "Create N videos/posts" button calls appropriate server action, stores run handles + format in sessionStorage, redirects to review
- **Review page:** Detects format (video/image) from sessionStorage. Video: each card subscribes via `useRealtimeRun`. Image: single run card that expands into individual post cards on completion, each with image gallery (post1/post2 variants), caption, platform toggles, schedule/post buttons

## Auth Setup

- **NextAuth v5** with split config pattern:
  - `src/lib/auth.config.ts` — lightweight config for Edge middleware (no Prisma imports)
  - `src/lib/auth.ts` — full config with PrismaAdapter for API routes/server components
- **Providers:**
  - Google OAuth (credentials via `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` env vars — placeholder values, add real ones for production)
  - Credentials provider (dev-only) — allows local testing without Google OAuth
- **Session strategy:** JWT (required for Credentials provider compatibility)
- **Middleware** (`src/middleware.ts`): Protects all routes except `/`, `/pricing`, `/login`, `/signup`, `/api/auth/*`, static assets
- **Dev login:** Email input on login page, authenticates instantly for local testing

## Database Schema (Prisma)

```prisma
// NextAuth models
Account    — OAuth provider accounts (Google, etc.)
Session    — User sessions
VerificationToken — Email verification tokens

// App model
User {
  id, email, emailVerified, name, image
  plan          — free | starter | creator | pro
  lemonSqueezyCustomerId, lemonSqueezySubscriptionId
  niche, tone, character, background, duration, layout, language  — user defaults
  videosUsed, videosLimit, postsUsed, postsLimit, usageResetAt   — usage counters
  autopilotEnabled
  createdAt, updatedAt
}
```

## Components

### Landing Page
- `Navbar.tsx` — glass-nav with brand, nav links, CTA
- `HeroSection.tsx` — headline, subheadline, CTA, phone mockup
- `SocialProofStrip.tsx` — "Used by 10,000+ creators" + platform icons
- `ComparisonSection.tsx` — "The old way" vs "With The Fluid Curator" before/after
- `ContentShowcase.tsx` — horizontal scrollable content type previews
- `TestimonialsSection.tsx` — creator testimonials with faces and follower counts
- `PricingSection.tsx` — 4-tier pricing cards
- `FinalCTA.tsx` — closing CTA section
- `Footer.tsx` — footer with links

### Dashboard
- `DashboardNav.tsx` — top navigation bar
- `Sidebar.tsx` — left sidebar with nav items (Home, Create, Autopilot, Accounts, Preferences)
- `NotificationBanner.tsx` — "3 videos ready for review" banner
- `CalendarHeader.tsx` — week navigation header
- `ContentCalendarGrid.tsx` — 5-column calendar with VideoCard, CarouselCard, CaptionDraftCard, RenderingCard, EmptyDaySlot
- `FloatingActionBar.tsx` — bottom floating action bar

### Create Flow
- `FormatPicker.tsx` — 2x2 grid of format cards with selection state
- `InputMethodSelection.tsx` — 5 input method cards, "Pick a template" routes to `/create/templates`

## CSS Utilities (globals.css)

- `.text-gradient` — purple gradient text
- `.primary-gradient` — purple gradient background
- `.glass-nav` — frosted glass navigation bar
- `.no-scrollbar` — hides scrollbars
- `.shimmer` — animated loading skeleton effect

## Environment Variables (.env)

```
DATABASE_URL          — SQLite connection string (file:./dev.db)
AUTH_SECRET           — NextAuth session encryption secret
AUTH_URL              — NextAuth base URL (http://localhost:3000)
AUTH_GOOGLE_ID        — Google OAuth client ID (placeholder)
AUTH_GOOGLE_SECRET    — Google OAuth client secret (placeholder)
GEMINI_API_KEY        — Google Gemini API key (set and working)
FLASK_API_URL         — Flask video backend (http://localhost:5000 for local, Railway URL for prod)
FLASK_API_KEY         — Optional API key for Flask service-to-service auth
TRIGGER_SECRET_KEY    — Trigger.dev secret key (from cloud.trigger.dev)
TRIGGER_PROJECT_REF   — Trigger.dev project reference ID
```

## What's Working

- Full landing page matching Stitch design
- Dashboard with visual content calendar (mock data)
- Complete create flow: format picker → template selection → AI idea generation → AI script generation → review/schedule
- Real Gemini 2.5 Flash integration returning structured JSON
- Auth with dev login, JWT sessions, route protection middleware
- Prisma v5 + SQLite database with User model
- All pages render correctly with design system applied
- Responsive navigation and sidebar
- **Trigger.dev v3 integrated** — parallel render jobs working, "Create N videos" fires N independent background tasks
- **Review page shows live progress** via `useRealtimeRun` hooks — each card displays real-time progress bar + stage label (generating audio, rendering video, etc.) and transitions to the full ready card when complete
- **`render-video.ts` connected to real Flask backend** — calls `/vg/generate_script` (mode: "script"), `/vg/start`, then streams `/vg/events/<job_id>` SSE for live progress. Falls back to simulation if `FLASK_API_URL` not set
- **Review page shows real video player** — HTML5 `<video>` element with controls when render completes, gradient fallback if video URL unavailable
- **Voice system implemented** — voices are independent of characters (see below). Voice settings pill on editor page. Full pipeline tested end-to-end with real Fish Audio voice — 3.6MB video rendered successfully
- **All settings pills functional** — Tone affects Gemini script style + Flask tone param. Duration affects word count + Flask duration. Background controls Pexels vs AI images (Flask `bg_mode`). Layout passed through for future Remotion templates. Voice sends `fishAudioId` override. Platform (image posts only) passed to Flask
- **Image Post format fully built** — format picker → topic input → Flask `/pg/generate_ideas` → idea selection → editor with Tone + Platform pills → Trigger.dev `render-post` task → Flask `/pg/start` + SSE streaming → review page with image gallery + captions. Tested: Flask generates 2 PNG images per post (~1.5-2MB each) + caption text
- **10 tones available** — Funny, Serious, Cursing, Edgy, Motivational, Storytelling, Sarcastic, Shocked, Conspiracy, Friendly. Each has unique prompt instructions for both idea generation and script writing
- **12 video templates** — Did You Know, Myth Buster, X vs Y, Story Time, Top 5, How-To, Hot Take, What Happens If, Before & After, Problem → Solution, Ranking / Tier List, Mini Series. 3-column grid layout
- **Tone & Duration moved to templates page** — selected before script generation so Gemini uses them. Passed to editor via URL params
- **Voice preview instant** — pre-generated static MP3 files load immediately (no Flask roundtrip)
- **Create button loading feedback** — spinner + "Launching render jobs..." text + visual state change when creating
- **Banned opening phrases** — scripts avoid "Did you know", "What if I told you", "Here's the thing", etc.
- **Statistics in titles** — generate-ideas prompt requires numbers/stats in 3+ of 10 titles
- **Landing page CTAs linked** — Login→/login, Get Started→/signup, all pricing cards→/signup
- **Sidebar persists on /create** — added to create layout, highlights active page via `usePathname()`
- **DashboardNav Create button** — routes to /create (was non-functional)
- **Trigger.dev real credentials connected** — `tr_dev_` secret key + `proj_ufmentijdeajuabueicr` project ref. Packages pinned to 4.4.3 (fixes CLI version mismatch)
- **Video renders end-to-end in browser** — full flow tested: generate ideas → select → scripts → "Create videos" → Trigger.dev task fires → Flask pipeline (script → TTS → Pexels backgrounds → lipsync → Remotion) → 23.7MB video in 4m 31s
- **Video playback via API proxy** — `<video>` element loads from `/api/video-proxy` which adds `X-API-Key` to Flask requests, bypassing Flask `@login_required` on preview routes
- **Flask character mouth validation fixed** — now supports nested `mouth/closed.png` directory structure used by most characters (doctor, professor, cowboy, etc.)

## Voice System (Architecture)

Voices are **NOT** tied to characters. Voice is a separate setting chosen independently:
1. **Voice settings pill** on editor page (between Presenter and Background) — users pick a voice independently of character
2. **`src/lib/voices.ts`** — central config file for all Fish Audio voices
3. Each voice has: `name`, `fishAudioId`, `emoji`, optional `previewUrl`
4. Two real voices working: Deep Male Voice (`728f6ff2240d49308e8137ffe66008e2`), Energetic Male Voice (`c203ca8e441c4e8e80562be2eef75a10`)
5. The `render-video` task looks up `fishAudioId` from the voice config and sends it as `voice_id` override to Flask `/vg/start`
6. Characters are visual only (body frames, mouth PNGs), voices are audio only (Fish Audio TTS)
7. **Instant audio preview** — pre-generated 3-second MP3 samples stored as static files in `/public/audio/voices/`. No Flask call needed at preview time
8. To add a new voice: get Fish Audio reference ID from fish.audio, add entry to `voices.ts`, generate preview via `/api/voice-preview` and save to `/public/audio/voices/`

## What's NOT Yet Connected

- **Google OAuth** — placeholder credentials, need real Google Cloud Console project
- **Video rendering** — Full pipeline works end-to-end (script → TTS → backgrounds → lipsync → Remotion → final video). Need Trigger.dev cloud keys to test via the UI (currently tested via curl)
- **Platform posting** — Ayrshare SDK not installed, platform toggle buttons are UI-only
- **Scheduling** — date/time picker on review page is UI-only, no Trigger.dev jobs
- **User preferences** — settings pills don't read/write from database User model
- **Usage tracking** — videosUsed/postsUsed counters not incremented
- **Billing** — Lemon Squeezy not integrated, pricing page not built
- **Real-time updates** — Trigger.dev realtime hooks wired up, but need real TRIGGER_SECRET_KEY to test end-to-end
- **Carousel format fully built** — 10 HTML templates (editorial, magazine, split, centered, quote, stats, comparison, checklist, timeline, polaroid) + 4 color themes (dark, light, warm, neon) + 5 slide sizes + Gemini idea/slide gen + node-html-to-image rendering in Next.js API route + review page with slide gallery
- **Text format fully built** — Topic input → Gemini generates 10 text posts (captions, threads, hooks, stories) → editable text editor → review page with copy button + platform toggles
- **Other input methods** — "Free type", "Viral link", "Upload content", "Viral right now" show "Coming soon"

## Next Steps (from Product Spec Build Order)

### Phase 1: Create Mode — Video (in progress)
- [x] Set up Next.js project with auth and database
- [x] Build landing page
- [ ] Add template prompt files to Flask backend
- [ ] Add video idea generation endpoint to Flask
- [x] Build format picker + input method UI
- [x] Build template picker + idea browser UI
- [x] Build batch script editor + settings pills UI
- [x] Integrate Trigger.dev for async video rendering (task + server action + realtime review page)
- [x] Build review/preview screen (wired to Trigger.dev realtime hooks)
- [x] **Connect Flask backend** — `render-video.ts` calls `/vg/generate_script` → `/vg/start` → SSE `/vg/events/<job_id>` with realtime metadata updates
- [x] **Add API key auth to Flask** — `X-API-Key` header + `ServiceUser` via Flask-Login `request_loader`, CSRF exemption for API requests
- [x] **Voice system** — separate Voice settings pill, `voices.ts` config, `voice_id` override passed to Flask. Full E2E test: real 3.6MB video rendered with Geography Guy voice
- [x] **All settings pills functional** — Tone, Duration, Background, Layout, Voice, Platform all flow end-to-end from UI → server action → Trigger.dev → Flask
- [x] **Image Post format** — full pipeline: format picker → Flask `/pg/generate_ideas` → editor → `render-post` task → Flask `/pg/start` + SSE → review page with image gallery
- [x] Fix UX issues — voice preview speed, create button feedback, tone/duration placement, banned prompts, 10 tones, 12 templates
- [x] **Trigger.dev connected with real credentials** — tasks fire from browser, worker executes, Flask pipeline completes
- [x] **Video renders end-to-end** — 23.7MB video, 4m 31s. Fixed video playback via API proxy + Flask character mouth validation
- [x] Video playback verified — proxy route `/api/video-proxy` correctly proxies Flask video files with API key auth, `<video>` element renders with `onError` fallback to gradient
- [x] Platform toggles on review page — clickable pill buttons with label text, filled icon when active (purple + ring), outline when inactive (gray), toggle on/off
- [x] Caption display on review page — shows full caption text (no truncation), minimum 5 lines visible, "Caption" label header, removed show more/less collapse
- [ ] Add render timer / elapsed time display
- [ ] Build library/history page (past renders)
- [ ] Read/write user defaults from database to settings pills
- [ ] Integrate Ayrshare for posting
- [x] Build visual content calendar / dashboard (UI done with mock data)
- [ ] Deploy: Next.js to Vercel, Flask stays on Railway

### Phase 2: Other Formats
- [x] Image post — full pipeline with Flask `/pg/*` endpoints
- [x] Carousel — 10 HTML templates + 4 themes + Gemini content gen + node-html-to-image rendering + review gallery
- [x] Text post — Gemini text gen + editor + review with copy/paste

### Phase 3: Additional Input Methods
- [ ] Free type, viral link, upload content, viral right now

### Phase 4: Polish
- [ ] Pricing page + Lemon Squeezy billing
- [ ] Onboarding flow
- [ ] Analytics basics

### Phase 5: Autopilot
- [x] Autopilot setup page (UI done)
- [ ] Daily cron via Trigger.dev
- [ ] Cross-platform content pack generation
- [ ] Auto-post vs queue-for-review toggle wired to backend
