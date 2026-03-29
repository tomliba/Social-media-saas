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
| `/create/templates` | `src/app/create/templates/page.tsx` | Template grid (8 templates) + niche input + AI-generated ideas. Calls `/api/generate-ideas`. Select up to 5 ideas, continue to editor |
| `/create/editor` | `src/app/create/editor/page.tsx` | Script editor — reads selected ideas from URL params, calls `/api/generate-scripts`. Editable script cards with regenerate per-script. Creative settings pills (tone, presenter, background, duration, layout) with popovers |
| `/create/review` | `src/app/create/review/page.tsx` | Review + schedule — interleaved ready/rendering cards. Ready cards: video preview, platform toggles, caption, schedule/post now/delete. Rendering cards: shimmer animation, progress indicator, disabled buttons |
| `/autopilot` | `src/app/autopilot/page.tsx` | Autopilot setup — hero section, on/off toggle, bento grid config (niche, content types, style/tone, schedule with day picker, approval mode) |

### Layouts
| Route | File | Description |
|-------|------|-------------|
| Root | `src/app/layout.tsx` | Root layout with fonts, Material Symbols CDN link |
| `/dashboard/*` | `src/app/dashboard/layout.tsx` | DashboardNav + Sidebar + main content area |
| `/create/*` | `src/app/create/layout.tsx` | DashboardNav only (no sidebar for create flow) |
| `/autopilot/*` | `src/app/autopilot/layout.tsx` | DashboardNav + Sidebar |

## API Routes

| Endpoint | Method | Input | Output | Status |
|----------|--------|-------|--------|--------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handlers | Session management | Working |
| `/api/generate-ideas` | POST | `{template, niche}` | 10 viral video ideas with titles + tags | Working (Gemini 2.5 Flash, JSON mode) |
| `/api/generate-scripts` | POST | `{template, ideas[]}` | Script per idea with template-specific structure | Working (Gemini 2.5 Flash, JSON mode) |

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

## What's NOT Yet Connected

- **Google OAuth** — placeholder credentials, need real Google Cloud Console project
- **Video rendering** — review page uses mock data, not connected to Flask/Railway backend
- **Platform posting** — Ayrshare SDK not installed, platform toggle buttons are UI-only
- **Scheduling** — date/time picker on review page is UI-only, no Trigger.dev jobs
- **User preferences** — settings pills don't read/write from database User model
- **Usage tracking** — videosUsed/postsUsed counters not incremented
- **Billing** — Lemon Squeezy not integrated, pricing page not built
- **Real-time updates** — rendering cards don't poll for actual render progress
- **Image/Carousel/Text formats** — only Video format is wired up end-to-end
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
- [ ] Integrate Trigger.dev for async video rendering
- [x] Build review/preview screen (UI done, async notification not connected)
- [ ] Integrate Ayrshare for posting
- [x] Build visual content calendar / dashboard (UI done with mock data)
- [ ] Deploy: Next.js to Vercel, Flask stays on Railway

### Phase 2: Other Formats
- [ ] Image post, carousel, quote card, caption, thread pipelines

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
