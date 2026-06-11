# Async AI-Image Generation — Design / Implementation Plan

- **Date:** 2026-06-11
- **Status:** Plan only — NOT approved for implementation, no code written
- **Scope:** Convert the synchronous AI-image generation flows to the async Trigger.dev pattern already used by video and image-post renders. Flows: (A) AI scene-images (AI story / skeleton / animated character), (B) AI-image carousel slides, (C) ad-creative, (D) meme ad.
- **References:** the sync/async audit (2026-06-11). Templates in-repo: `trigger/render-video.ts`, `trigger/render-post.ts`, `src/app/actions/create-videos.ts`, `src/app/actions/create-posts.ts`, `src/app/api/library/[id]/complete/route.ts`.

## Problem

The image flows hold a Vercel serverless function open synchronously while the Railway backend generates the image(s). During the sustained Gemini-image 503 outage, every image falls back to OpenAI `gpt-image-1` (high quality), which currently exceeds even the **300s Pro cap** — both single-image (ad-creative) and multi-slide (carousel) flows 504 with `FUNCTION_INVOCATION_TIMEOUT`, and nothing reaches the library. Raising `maxDuration` was necessary but is not sufficient; the only structural fix is to stop holding the request open: dispatch the work to Trigger.dev and return immediately, exactly like video.

Audit classification (the targets):
- **AI scene-images** (`/api/generate-scene-images`, `/api/regenerate-scene-image`, `/api/character-review/generate-scene-images` → backend `/vg/generate-scene-images`): SYNC, **many images in one request**, no `maxDuration`. Worst case.
- **AI-image carousel** (`/api/ai-carousel/generate-slide`, sequential per slide), **ad-creative** (`/api/ad-creative/generate`), **meme** (reuses `/api/ai-carousel/generate-slide`): SYNC, 1 image/request, all proxy backend `/pg/generate_ai_slide`.

## Goal / non-goals

**Goal:** every image flow dispatches a background job, the Vercel function returns in <1s, the UI shows progress and the finished asset via Trigger realtime, the library row is created at dispatch and finalized by the completion callback, and credits are charged at dispatch / refunded on background failure.

**Non-goals:** no image-quality change (stays `high`); no change to the backend generation logic (`post_generator.generate_ai_slide`, `/vg/generate-scene-images`); no change to the already-async flows (video, image-post-via-Trigger, Post Cloner, argument); not deleting the marketing or review pages.

## The reusable async blueprint (from video / render-post)

1. **Dispatch (server action):** check balance ≥ cost → `tasks.trigger("<task>", payload)` → returns `{ id (runId), publicAccessToken }`. Vercel function returns immediately.
2. **Charge:** `spendCredits({ userId, amount, jobId: handle.id, type, reason })` right after trigger (charge-at-dispatch). On `InsufficientCreditsError` → cancel the run and return error.
3. **Library row:** `POST /api/library { jobId: handle.id, status: "rendering", format, title }` (created when render starts).
4. **Work on Trigger.dev:** the task calls the Railway backend, uploads to R2, emits progress via `metadata` (for `useRealtimeRun`).
5. **Finalize (completion callback):** task `POST /api/library/[id]/complete` (shared-secret, allow-listed in middleware) with `{ status: "ready", videoUrl, ... }` on success, or `{ status: "failed", error }` on failure.
6. **Refund:** the complete route already calls `refundCredits({ userId, jobId, reason })` automatically when `status === "failed"` — idempotent on `(jobId, "refund")`. Backstop: `/api/cron/reconcile` sweep.
7. **UI:** frontend holds `{ runId, publicAccessToken }` and renders progress/result with `useRealtimeRun(runId, { accessToken })`; the review/library cards already implement this for video/post.

## Credit model in the async world (critical)

Today's image pages (ad-creative/meme) do *client-side* charge-then-PATCH-then-refund. The async model moves this to the **dispatch + callback** seam, matching `create-posts.ts`:

- **Charge point:** in the dispatch **server action**, after `tasks.trigger(...)`, via `spendCredits({ userId, amount: cost, jobId: handle.id, type, reason })`. `cost` from the existing `postCost(format, {...})`. Pre-check `getCreditBalance(userId) >= cost` *before* trigger to fail fast.
- **Refund point:** **only** the completion callback. When the Trigger task fails (any slide/image error, backend 5xx, timeout, crash), the task's `onFailure`/catch posts `POST /api/library/[id]/complete { status: "failed", error }`; that route calls `refundCredits` (idempotent). The frontend never issues refunds in the async model — this removes the "client navigated away → no refund" hole.
- **Idempotency:** `spendCredits` keyed by `jobId`; `refundCredits` idempotent on `(jobId, "refund")`. Re-deliveries of the callback are safe.
- **Backstop:** `/api/cron/reconcile` already refunds jobs stuck in `rendering` past a TTL — covers tasks that die without posting the callback.
- **Edge — charge-after-trigger race:** if `spendCredits` throws `InsufficientCreditsError` after the run was dispatched, the action must **cancel the run** (`runs.cancel(handle.id)`) so no uncharged work proceeds; or, simpler, rely on the failure/reconcile path. Plan: cancel on insufficient, mirroring intent of the existing pre-check.
- **Edge — partial multi-image success** (carousel/scene-images): decide policy explicitly (see per-flow). Default: charge once per job; if the job partially succeeds, **do not** auto-refund (item is usable); if it fully fails, refund. For per-image charging (scene-images regenerate), charge per regenerate call.

## Per-flow plan

### A. AI scene-images (story / skeleton / animated character) — FIRST (worst case)

- **Today:** `AIStorySetup`/`SkeletonSetup`/`animated-character-review` call `POST /api/generate-scene-images` with **all** scenes; backend `/vg/generate-scene-images` generates N images (6-way parallel) in one held request; UI shows per-scene `sceneImageStatus[]`. Scene images are **intermediate assets** (not `ContentItem`s) — the charged library item is the later *video* render (already async via `render-video`).
- **Dispatch change:** replace the synchronous `fetch("/api/generate-scene-images")` with a dispatch that triggers a new Trigger task `render-scene-images` (payload: scenes[] with `text`+`image_prompt`, style, scene_mode). Returns `{ runId, publicAccessToken }`. The setup component stores the handle.
- **Trigger task (`trigger/render-scene-images.ts`):** loops/parallelizes the scenes server-side, calling the backend per-image endpoint (or a streamed `/vg/generate-scene-images`), uploading each to R2, and emitting `metadata` per scene: `{ index, status: "done"|"error", url }`. No Vercel cap.
- **Library row + callback:** **none** — scene images are not library items. State lives in the Trigger run; there is **no completion-callback library write** for this step. (The eventual *video* render keeps its existing `render-video` library row + callback.)
- **Frontend UI:** `AIStorySetup`/`SkeletonSetup` swap their one-shot await for `useRealtimeRun(runId)`, mapping `metadata.scenes[i]` → `sceneImageUrls[i]`/`sceneImageStatus[i]`. The per-scene loading UI already exists; only the data source changes from a single response to realtime metadata.
- **Credits:** **confirm during impl** whether scene-image generation is charged separately. Current reading: it is *not* (charge is at the video render). If unconfirmed-no, **no credit work** is needed for this step. If it turns out to be charged, apply the standard charge-at-dispatch / refund-on-failed-callback (with a lightweight job record instead of a ContentItem).
- **`regenerate-scene-image`:** convert the same way (single-image Trigger run + realtime), or — since it's 1 image and now under the raised cap — optionally leave synchronous in phase 1 and convert in a follow-up. Plan: convert for consistency; low effort.
- **Old sync route:** keep `/api/generate-scene-images` as the **local-dev direct path** (no `TRIGGER_SECRET_KEY`), mirroring `create-posts.ts`'s dual path; in prod the dispatch uses Trigger.

### B. AI-image carousel slides

- **Today:** `/create/ai-carousel` `handleGenerate` loops slides client-side, each `await fetch("/api/ai-carousel/generate-slide")` (sync), shows them in `review-slides`, then "Save to library" creates `ContentItem`(s).
- **Dispatch change:** "Generate" triggers a new task `render-carousel` (payload: planned slides[], topic, tone, style prefix). Server action charges at dispatch (`postCost("carousel", { slides })`), creates **one** `ContentItem` (format `image`/`carousel`, status `rendering`, `jobId = runId`), returns the handle.
- **Trigger task (`trigger/render-carousel.ts`):** loops slides server-side (no cap), calls backend `/pg/generate_ai_slide` per slide (unchanged generation logic), uploads each to R2, emits `metadata.progress` + per-slide previews, then on success `POST /api/library/[id]/complete { status:"ready", videoUrl: <first slide or cover>, ... }` and stores all slide URLs (reuse the image-post multi-image storage shape, e.g. `results[].imageUrls`).
- **Frontend UI:** replace the in-browser generation loop + manual "Save to library" with the existing `useRealtimeRun` review card (the carousel card on `/library` or the review surface), watching progress and rendering slides as they complete. Auto-saved (no separate save click).
- **Partial failure:** if some slides fail, mark item `ready` with the successful slides and a warning, OR `failed`+refund if zero succeed (decide; default: ready-if-any).
- **Old sync route:** keep `/api/ai-carousel/generate-slide` for local-dev direct path and for single-slide **regenerate** in the review UI (1 image, under cap). Prod batch generation goes through Trigger.

### C. Ad-creative

- **Today:** `/create/ad-creative` charges (client) → `POST /api/library` (rendering) → `await fetch("/api/ad-creative/generate")` (the synchronous 504 culprit) → upload + PATCH ready, or PATCH failed + client refund.
- **Dispatch change:** server action triggers `render-ad-creative` (payload: product, description, conceptId, variationIndex), charges at dispatch, creates the `ContentItem` (rendering, `jobId=runId`), returns handle. Remove the client-side charge/refund.
- **Trigger task (`trigger/render-ad-creative.ts`):** builds the prompt (same `STYLE_BLOCK`/`LAYOUT_BLOCK`/concept logic currently in the route), calls backend `/pg/generate_ai_slide`, uploads, posts the completion callback (`ready` / `failed`+auto-refund).
- **Frontend UI:** redirect to `/library` (as today) and watch the item via `useRealtimeRun` / library polling; the library already renders rendering→ready.
- **Old sync route:** `/api/ad-creative/generate` retained for local-dev direct path; the prompt-building logic moves into (or is shared with) the task.

### D. Meme ad

- **Today:** `/create/meme-ad` → `/api/meme-ad/generate-labels` (text, fast — leave sync) then `/api/ai-carousel/generate-slide` (the image, sync) → library PATCH + client refund.
- **Dispatch change:** keep `generate-labels` synchronous (it's fast text). Trigger `render-meme` (or reuse `render-ad-creative` parameterized) for the image step, with the same charge-at-dispatch + library row + callback. Frontend watches via `useRealtimeRun`.
- **Old sync route:** image path through Trigger in prod; keep direct for local dev.

## Execution order

1. **AI scene-images** (worst case; biggest timeout exposure; also exercises the "no library row" variant of the pattern).
2. **AI-image carousel** (multi-image library item; closest to `render-post`).
3. **Ad-creative** (single image; simplest library-item conversion).
4. **Meme** (reuses the ad-creative/image task).

Each step ships independently behind the existing `TRIGGER_SECRET_KEY` dual-path (Trigger in prod, direct Flask locally), so partial rollout is safe.

## Risks & edge cases

- **Charge-after-trigger race** (insufficient credits after dispatch) → cancel the run; reconcile as backstop.
- **Task dies without posting callback** → item stuck `rendering`; `/api/cron/reconcile` refunds + marks failed after TTL. Verify the TTL covers the new (longer) image jobs.
- **Partial multi-image success** (carousel/scene-images) → explicit policy per flow (default ready-if-any for carousel; per-scene status for scene-images).
- **Double-charge / double-refund** → rely on `spendCredits` (jobId-keyed) + `refundCredits` idempotency; add tests.
- **Callback secret / middleware allow-list** → new tasks must use `postCompletionCallback`/`verifyCallbackSecret`; `/complete` already allow-listed.
- **Realtime token exposure** → `publicAccessToken` is per-run and already used client-side for video/post; same trust model.
- **UX change** (carousel: no in-browser generation/preview-before-save) → confirm acceptable; mitigate by streaming per-slide previews via `metadata`.
- **Trigger.dev quota/concurrency** → many image jobs now run on Trigger; confirm plan limits and set task `queue`/concurrency.
- **Local dev without Trigger** → dual-path must remain; the direct Flask path stays for `npm run dev`.

## Test plan

- **Unit:** dispatch action charges exactly once (mock `tasks.trigger` + `spendCredits`); insufficient-credits cancels run and returns error; completion callback `failed` triggers exactly one refund (idempotent on re-delivery); `ready` does not refund.
- **Task-level:** mock the backend image call; assert task posts `ready` with asset URL on success and `failed` with error on backend 5xx; assert partial-failure policy.
- **Integration (local dev, direct path):** run each flow with `TRIGGER_SECRET_KEY` unset → direct Flask path still works (no regression).
- **E2E (prod, gated on outage clearing):** **the upstream Gemini 503 currently makes high-quality generation exceed 300s, so a clean green E2E is only meaningful once Gemini image recovers (or via a temporarily fast path).** Once upstream is healthy: run a multi-slide carousel and a single ad/meme through the live UI; confirm the Vercel function returns in <1s (dispatch), the job runs on Trigger, every slide/image generates at high quality with legible text (visually inspect a rendered image), the item lands in the library `ready`, and credits net-charged once. Then force a failure (e.g. invalid prompt / backend down) and confirm the item flips `failed` and credits are refunded via the callback.
- **Verification harness:** reuse `e2e/qa-carousel.spec.ts` / `qa-ad-creative.spec.ts`, updating them to wait on the async (library `ready`) signal rather than the in-browser slide render, with a generous timeout (jobs run on Trigger, not the request).
- **Refund/reconcile:** simulate a task that never posts the callback; confirm `/api/cron/reconcile` refunds and marks failed.

## Rollout

Per-flow, behind the `TRIGGER_SECRET_KEY` dual path. Deploy scene-images first; verify; then carousel/ad/meme. No quality change. Keep the `maxDuration=300` on the surviving sync routes (local dev / single-image regenerate) as defense-in-depth.

## Open items to confirm during implementation

- Whether AI scene-image generation is charged (determines if credit work is needed for flow A).
- Carousel data model for multiple slide URLs on one `ContentItem` (reuse image-post `results[].imageUrls` shape).
- Trigger.dev concurrency limits / queue config for image tasks.
- `/api/cron/reconcile` TTL vs. worst-case image-job duration.
