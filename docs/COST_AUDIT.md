# Cost Audit — Post / Carousel Tier

Canonical provider-cost figures for the post/carousel product tier and the
margin decisions made from them. Source of truth for credit pricing of posts.

_Last updated: 2026-06-19._

## Provider costs (measured / quoted)

| Item | Provider | Cost |
|---|---|---|
| Carousel slide image | Nano Banana Pro | **$0.134 / slide** |
| Carousel all-in (5 / 8 / 10 / 15 slides) | Nano Banana Pro | **~$0.67 / $1.07 / $1.34 / $2.01** |
| Single ad (1 image) | Nano Banana Pro | **~$0.15** |
| AI image post (2 images) | Nano Banana Pro | **~$0.30** |
| Post cloner (1 image) | Nano Banana Pro | **~$0.15** |
| Free HTML overlay carousel | none (HTML render) | **~$0** |

## Credit value by plan

| Plan | Price / credits | $ per credit |
|---|---|---|
| Creator | $24.99 / 600 | **$0.0417** |
| Pro | $59.99 / 2000 | **$0.030** |

## Margin decision (2026-06-19)

The post/carousel pricing was never the problem — `postCost()` already prices
paid carousels at **15 credits/slide**. At the Pro rate that is **$0.45/slide
revenue vs $0.134 cost ≈ 70% margin**. The leak was that the **`/create/ai-carousel`
flow (Nano Banana Pro image carousels) never charged anything** — it only showed
a display `CostBadge` and saved images straight to the library.

Decisions:

1. **Close the leak.** Wire `ai-carousel` to charge through the existing
   `chargePost` / `spendCredits` path using `postCost(carousel, { slides })`,
   debit **before** generating, refund on failure (same pattern as ad-creative).
   Keep 15 credits/slide. **Do NOT switch off Nano Banana Pro** — margin is healthy
   once it charges.
2. **Gate by plan (server-side).** Paid image carousels (Nano Banana Pro) are
   **Creator+ only**. Free tier keeps the free **HTML overlay** carousel
   (`carousel_designed`) only.
3. **Slide caps (server-side safety):** Creator ≤ 10, Pro ≤ 15.
4. **Image-path switch deferred** — margin is fine once it charges.

## Future cost levers (NOT changing now)

If per-slide cost ever needs to come down, options in order of savings:

| Lever | Cost / slide | Tradeoff |
|---|---|---|
| Free HTML overlay (reuse template renderer) | ~$0 | Lower visual fidelity than baked images |
| Nano Banana 2 | $0.02–0.04 | Big cut; quality vs Pro TBD |
| Batch API | ~$0.067 | ~2× cheaper; async / slower |
| Nano Banana Pro (current) | $0.134 | Highest quality; current choice |
