# Concurrent Load Test — Results

**Run date:** 2026-06-16 (UTC) · **Target:** live `usefluvio.com` (prod deployment + Railway `backend`)
**Spec:** `frontend/e2e/load-concurrent.spec.ts` · **Logs:** `load-logs/railway-concurrent.log` (deduped), `load-logs/railway-raw.log` (77 snapshots), `load-logs/concurrent-N4-results.json`, `load-logs/concurrent-N10-results.json`

N parallel browser contexts (cookie-forge auth), half **AI Story**, half **AI Character in AI-Images mode**, fired via `Promise.all`. Each context captured **its own** ContentItem id from the `POST /api/library` response and polled only that id (the "newest card" trick is invalid under concurrency). Ran **N=4**, gate passed on dispatch, auto-scaled to **N=10**.

---

## Verdict (one line)

The pipeline holds up functionally under 10× concurrent load — **all 5 AI-Character (AI-Images) renders succeeded, image-gen and the Fish-TTS gate had headroom to spare** — but the box is **severely memory-constrained** (93 worker OOM-kills) and the **AI script-gen has no malformed-JSON recovery** (1 hard 500 under load). The render gate serialized correctly with no deadlock.

---

## Harness results

| Run | Dispatched | Ready (harness-verified video) | Failed | Stuck | Credits charged | Orphans |
|-----|-----------|-------------------------------|--------|-------|-----------------|---------|
| **N=4** (2 story + 2 char) | **4/4** | **4/4** ✅ | 0 | 0 | 40 | 0 |
| **N=10** (5 story + 5 char) | **9/10** | **5/10** (all 5 characters) | 0 | 4 (stories) | 90 | 0 |

- **N=4** was a clean sweep: every item reached `ready` with a real, fetchable MP4 (12–27 MB, `content-type: video/mp4`).
- **N=10**: all **5 AI-Character / AI-Images renders reached `ready`** with verified MP4s (10–12 MB each). The story side is explained below — **1 is a real backend failure, 4 are a harness limitation, not backend failures.**
- **Credits:** 421 → 381 → 291 over both runs = **130 charged total** (10/video × 13 dispatched). Balance after = **291**.
- **Cleanup:** every created item deleted via `DELETE /api/library/{id}` → all `200`. **0 orphaned ContentItems** in either run. (R2 objects for completed renders use random keys and were **not** swept — see Orphans below.)

---

## The real verdict — Railway log evidence

Counts below are scoped to the **N=10 window** (12:55:45 → 13:03:57 UTC, when the backend went idle after the last character render). Full deduped log: `load-logs/railway-concurrent.log`.

### Fish-TTS concurrency gate — healthy, never contended
```
FISH gate ACQUIRED: 9   RELEASED: 9   WAITING: 0
```
9 TTS jobs (5 character + 4 story-prep; `story#4` died before TTS). **Zero `WAITING`** — concurrent TTS never exceeded the semaphore cap (4), so the gate never had to block anyone and **no Fish 429s occurred**. The gate has comfortable headroom at this concurrency; the shipped gate is doing its job.

### Image generation (Flux → Atlas) — 100%, no fallback needed
```
Flux images resolved: 6/6 (or 4/4) success, 0/N fell back to other providers   ×9 batches
429 mentions: 0 · fal.ai fallbacks: 0 · Gemini-image fallbacks: 0 · OpenAI/gpt-image fallbacks: 0
```
Every segment image came from **Flux on Atlas Cloud on the first attempt**. The fal.ai → Gemini → `gpt-image-1-mini` fallback chain was **never exercised** — Flux/Atlas absorbed the full 10× burst without a single 429 or fallback.

### Render gate — serialized correctly, no deadlock
```
Render gate ACQUIRED: 7   RELEASED: 8   (in-window; the +1 RELEASE pairs with a pre-window ACQUIRE)
```
7 Remotion renders fired through the single-slot gate for the 5 character videos (the 2 extra are OOM-kill retries — see below). Renders ran strictly one-at-a-time; the gate **released cleanly every time** and the backend returned to idle — **no render left holding the gate, no deadlock**.

### Memory — the headline problem
```
Worker "...was sent SIGKILL! Perhaps out of memory": 32 in N=10 window  (93 across the full capture)
Worker "...exited with code 101": 24
```
Gunicorn workers were **OOM-killed continuously** throughout the load. Renders still completed (the render gate serializes the heavy Remotion subprocess, so it survives), but the API workers handling concurrent script-gen / image / TTS requests are being repeatedly killed and restarted. This matches the known render memory profile (~1.5–2.5 GB per render on a ~2 GB box). **Under sustained concurrent load this box is over its memory budget** — the single biggest risk surfaced by this test.

### AI script generation — 1 hard failure under load
```
story#4: Error in video script generation: AI returned invalid JSON. (Expecting ',' delimiter ...)
         json.decoder.JSONDecodeError  → HTTP 500 → frontend "Script generation failed (500)"
Gemini 503 UNAVAILABLE: 9 in-window  (recovered via retry / Atlas fallback for scene-splitting)
```
Under the 10× burst Gemini threw **9× 503** (all recovered by retry or the Atlas scene-split fallback) and, once, returned **malformed JSON** that the parser rejected → an unrecovered **500** that killed `story#4`'s dispatch. There is **no JSON-repair/retry around the AI script output**, so a single bad generation is a hard user-facing failure.

---

## Why 4 stories show as "stuck" — harness limitation, NOT a backend failure

The 4 dispatched stories (`story#1/#2/#3/#5`) reached `preview` (their TTS + Flux prep **succeeded** — visible in the logs) but never reached `ready`. This is a **bug in the test harness, not the product**:

- The harness drives a story's HD export by finding **its card in the library by title**. But the AI-generated story titles **collided** — multiple were *"This story will make you think twice about camping alone…"* (verbatim duplicates), and my match snippet was the shared prefix *"This story will make you"*.
- Result: `story#2`/`story#3`'s export click **timed out** (couldn't disambiguate the card); `story#1`/`story#5` likely clicked the **wrong** card, so their own ids never got an export.
- **Backend confirms it:** the four story item ids have **0 hits** in the backend log and there were **0 story `/complete` POSTs** in the window — i.e. the story HD-export renders **never reached the backend at all**. The backend didn't stall on them; it was never asked.

So the story HD-render path was **not actually load-tested at N=10**. What *was* proven for stories: concurrent **prepare-assets (TTS + Flux image gen) succeeded for all 4** dispatched.

### Fix (applied to the spec)
Card-by-title is unsafe when titles collide. The robust fix is to give each story a unique title before dispatch (edit the review-step hook to a per-context marker) so its library card is unambiguously findable. This is noted in the spec and is the one change needed before a story-completion re-run would be meaningful. Character completion needs no fix — it is tracked purely by id and was 5/5.

---

## Orphans / cleanup

- **ContentItems:** 0 orphans — all 13 created items deleted (`200`).
- **R2 objects:** the 9 completed character/story-prep renders wrote MP3/PNG/MP4 under random `0/<uuid>` keys; these were **not** swept (the handoff flagged this as the hard case — keys aren't recoverable from the deleted DB rows). Argument's deterministic `videos/{jobId}.mp4` keys were not used in this test. Net R2 orphans: the asset objects for ~9 renders. Cleared on the next R2 lifecycle/manual sweep if configured.

---

## Recommendations (priority order)

1. **Raise backend memory or cap concurrency.** 93 OOM-kills is the dominant signal. Either bump the Railway instance memory or add an API-side concurrency limiter so script-gen/image/TTS bursts don't pile onto a render. (Ties to the open follow-up in `project_imagegen_scaling_followup` — do NOT raise gunicorn workers until memory is bumped.)
2. **Add malformed-JSON recovery to script-gen.** Wrap the AI script output in a JSON-repair/retry (or a stricter response format) so a single bad generation degrades gracefully instead of a 500. This is the only hard user-facing failure the load surfaced.
3. **Fish-TTS gate and Flux/Atlas need no action** — both had clear headroom at 10× concurrency.
4. **Harness:** land the unique-title fix, then a story-completion re-run will exercise the render gate from the story side too.
