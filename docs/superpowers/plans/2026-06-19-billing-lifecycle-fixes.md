# Billing Lifecycle Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make subscription downgrade/grace-period handling correct: cancelled users keep paid features until period end, paused/past_due are handled, and feature gating is driven by subscription *status*, not just the stored plan.

**Architecture:** Introduce one entitlement helper (`effectivePlan(plan, status)`) in the credits config as the single source of truth for "what features may this user use right now." Thread it through every server-side feature gate and the client gating hook. Fix the Lemon Squeezy webhook so `subscription_cancelled` no longer drops to free (only `subscription_expired` does), and add handlers for `subscription_paused` and `subscription_payment_failed`. Re-enable the accounts page's cancelled-state UI and show the portal button for any user who has a portal URL.

**Tech Stack:** Next.js (App Router) route handlers + server actions, Prisma, TypeScript, Vitest. Test runner: `npm test` (`vitest run`), run from `frontend/`. The `@/` alias maps to `frontend/src/`.

**DB migration:** **None required.** All fields used (`User.plan`, `User.subscriptionStatus`, `User.currentPeriodEnd`, `User.customerPortalUrl`, the `@@unique([externalEventId])` on `CreditTransaction`) already exist in `prisma/schema.prisma`. No `prisma migrate deploy` step is needed before deploying this branch. (If Task 1's self-review finds otherwise, STOP and flag it.)

---

## Design decisions (locked during planning)

1. **Entitlement is an allow-list of statuses.** A user is entitled to their paid plan's features when `subscriptionStatus` ∈ {`active`, `on_trial`, `cancelled`, `past_due`}. Everything else (`paused`, `expired`, `unpaid`, `null`, unknown) is treated as **not entitled** → effective plan `free`. `cancelled` is entitled because Lemon Squeezy keeps the subscription live until period end; `expired` (the real end) is not.
   - **Known edge:** a legacy paid user whose `subscriptionStatus` is `null` would be treated as not entitled (effective `free`). New subscriptions always get a status from `subscription_created`, so this only affects pre-existing rows. Surfaced for the reviewer — if such rows exist, backfill their status to `active` before deploy, or add `null` to the allow-list.

2. **`effectivePlan` is defense-in-depth alongside the webhook.** `subscription_expired` still hard-sets `plan: "free"`, but gates also compute `effectivePlan`, so even if events arrive out of order (e.g. a late `subscription_updated` re-stamps the paid variant), a `paused`/`expired` user stays suspended.

3. **Resume/unpause needs no dedicated handler.** The existing `subscription_updated` case already syncs `subscriptionStatus` from `attrs.status`, so when a user resumes, status returns to `active` and entitlement is restored automatically.

4. **The credit-grant path is unchanged.** Credits are granted only on `subscription_payment_success`, which only fires on real payments. Keeping `plan` paid through `cancelled`/`past_due` cannot leak credits.

---

## File structure

| File | Change |
|---|---|
| `frontend/src/lib/credits/config.ts` | Add `ENTITLED_STATUSES`, `isEntitled`, `effectivePlan`. |
| `frontend/src/lib/credits/__tests__/config.test.ts` | Add entitlement unit tests. |
| `frontend/src/app/api/webhooks/lemonsqueezy/route.ts` | Split `cancelled`/`expired`; add `paused` + `payment_failed`. |
| `frontend/src/app/api/webhooks/lemonsqueezy/__tests__/route.test.ts` | New: per-event webhook tests with mock LS payloads. |
| `frontend/src/app/actions/charge-render.ts` | Gate on `effectivePlan` (2 sites). |
| `frontend/src/app/actions/create-videos.ts` | Gate + `isFreeTier` on `effectivePlan`. |
| `frontend/src/app/actions/render-preview.ts` | `isFreeTier` on `effectivePlan`. |
| `frontend/src/app/api/ai-carousel/plan/route.ts` | Gate on `effectivePlan`. |
| `frontend/src/app/api/ai-carousel/generate-slide/route.ts` | Gate on `effectivePlan`. |
| `frontend/src/app/api/credits/balance/route.ts` | Add `entitledPlan` to response. |
| `frontend/src/lib/usePlan.ts` | Expose `entitledPlan`. |
| `frontend/src/components/create/AIStorySetup.tsx` | Gate animation lock on `entitledPlan`. |
| `frontend/src/app/create/video-setup/page.tsx` | Gate format locks on `entitledPlan`. |
| `frontend/src/app/accounts/page.tsx` | Portal button from `customerPortalUrl` alone; add `paused` period line. |

---

### Task 1: Entitlement helpers in credits config

**Files:**
- Modify: `frontend/src/lib/credits/config.ts` (add helpers near the gating section, after `PLAN_FEATURES` / `canUseVideoFormat`)
- Test: `frontend/src/lib/credits/__tests__/config.test.ts` (append)

- [ ] **Step 1: Write the failing tests** — append to `frontend/src/lib/credits/__tests__/config.test.ts`:

```ts
import { isEntitled, effectivePlan } from "@/lib/credits/config";

describe("isEntitled", () => {
  it("entitles active, on_trial, cancelled, past_due", () => {
    for (const s of ["active", "on_trial", "cancelled", "past_due"]) {
      expect(isEntitled(s)).toBe(true);
    }
  });
  it("does not entitle paused, expired, unpaid, null, unknown", () => {
    for (const s of ["paused", "expired", "unpaid", null, undefined, "weird"]) {
      expect(isEntitled(s)).toBe(false);
    }
  });
});

describe("effectivePlan", () => {
  it("keeps the paid plan while entitled (incl. cancelled + past_due)", () => {
    expect(effectivePlan("pro", "active")).toBe("pro");
    expect(effectivePlan("pro", "cancelled")).toBe("pro");
    expect(effectivePlan("creator", "past_due")).toBe("creator");
  });
  it("suspends to free when paused or expired", () => {
    expect(effectivePlan("pro", "paused")).toBe("free");
    expect(effectivePlan("creator", "expired")).toBe("free");
  });
  it("is always free for the free plan regardless of status", () => {
    expect(effectivePlan("free", "active")).toBe("free");
    expect(effectivePlan("free", null)).toBe("free");
  });
});
```

Note: `config.test.ts` already has top-of-file imports from `@/lib/credits/config`; you may either extend that import or add the new `import` line shown above (duplicate imports from the same module are legal in TS/ESM only if names don't collide — to be safe, ADD the two names to the existing import statement instead of a second `import`). Use whichever the existing file makes clean.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- config` (from `frontend/`)
Expected: FAIL — `isEntitled`/`effectivePlan` are not exported.

- [ ] **Step 3: Implement** — in `frontend/src/lib/credits/config.ts`, add after the `canUsePostFormat` function (right before the "Paid image carousels" comment block):

```ts
// ──────────────────────────────────────────────────────────────────────────
// Subscription entitlement
// A user may use their paid plan's features while the subscription is active,
// on trial, cancelled-but-not-yet-expired, or in past_due dunning. Paused,
// expired, unpaid, or unknown/absent statuses are NOT entitled. This is the
// single source of truth for feature gating — gates use effectivePlan(), never
// the raw stored plan, so a cancelled user keeps access until expiry and a
// paused user is suspended immediately.
// ──────────────────────────────────────────────────────────────────────────

export const ENTITLED_STATUSES = ["active", "on_trial", "cancelled", "past_due"] as const;

export function isEntitled(status: string | null | undefined): boolean {
  return !!status && (ENTITLED_STATUSES as readonly string[]).includes(status);
}

/**
 * The plan whose features the user may actually use right now. Equals the
 * stored plan while entitled (see isEntitled); otherwise "free".
 */
export function effectivePlan(plan: PlanName, status: string | null | undefined): PlanName {
  if (plan === "free") return "free";
  return isEntitled(status) ? plan : "free";
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- config` (from `frontend/`)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/credits/config.ts frontend/src/lib/credits/__tests__/config.test.ts
git commit -m "feat(billing): effectivePlan/isEntitled entitlement helpers"
```

---

### Task 2: Fix webhook downgrade/grace events

**Files:**
- Modify: `frontend/src/app/api/webhooks/lemonsqueezy/route.ts`
- Test: `frontend/src/app/api/webhooks/lemonsqueezy/__tests__/route.test.ts` (new)

**Behavior to implement:**
- `subscription_cancelled`: do NOT change `plan`. Set `subscriptionStatus: "cancelled"`. If the payload carries an end date (`attrs.ends_at` or `attrs.renews_at`), store it in `currentPeriodEnd` so the accounts page can show "Access until …".
- `subscription_expired`: set `plan: "free"`, `subscriptionStatus: "expired"`.
- `subscription_paused` (new): do NOT change `plan`. Set `subscriptionStatus: "paused"`.
- `subscription_payment_failed` (new): do NOT change `plan`. Set `subscriptionStatus: "past_due"`.

- [ ] **Step 1: Write the failing tests** — create `frontend/src/app/api/webhooks/lemonsqueezy/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────
// Capture the data passed to prisma.user.update so we can assert plan/status.
const updateCalls: Array<{ where: unknown; data: Record<string, unknown> }> = [];
const grantCalls: Array<Record<string, unknown>> = [];

const fakeUser = {
  id: "u1",
  plan: "pro",
  subscriptionStatus: "active",
  lemonSqueezyCustomerId: "cust_1",
  lemonSqueezySubscriptionId: "sub_1",
  customerPortalUrl: "https://portal.example/abc",
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async () => fakeUser),
      findFirst: vi.fn(async () => fakeUser),
      update: vi.fn(async (args: { where: unknown; data: Record<string, unknown> }) => {
        updateCalls.push(args);
        return { ...fakeUser, ...args.data };
      }),
    },
    webhookEvent: { create: vi.fn(async () => ({})) },
  },
}));

vi.mock("@/lib/credits", () => ({
  grantCredits: vi.fn(async (args: Record<string, unknown>) => {
    grantCalls.push(args);
    return { transaction: { id: "tx_1" }, idempotent: false };
  }),
}));

// Always accept the signature so we exercise the handler body.
vi.mock("@/lib/lemonsqueezy", () => ({
  verifyLemonSqueezySignature: () => true,
}));

import { POST } from "@/app/api/webhooks/lemonsqueezy/route";

function makeReq(eventName: string, attributes: Record<string, unknown>) {
  const body = JSON.stringify({
    meta: { event_name: eventName, custom_data: { user_id: "u1" } },
    data: { id: "sub_1", type: "subscriptions", attributes },
  });
  return new Request("http://localhost/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: { "x-signature": "ignored", "content-type": "application/json" },
    body,
  }) as unknown as import("next/server").NextRequest;
}

function lastUpdateData() {
  return updateCalls[updateCalls.length - 1]?.data ?? {};
}

beforeEach(() => {
  updateCalls.length = 0;
  grantCalls.length = 0;
});

describe("lemonsqueezy webhook — lifecycle events", () => {
  it("subscription_cancelled keeps the plan and sets status cancelled", async () => {
    const res = await POST(makeReq("subscription_cancelled", {
      customer_id: "cust_1",
      status: "cancelled",
      ends_at: "2099-01-01T00:00:00Z",
    }));
    expect(res.status).toBe(200);
    const data = lastUpdateData();
    expect(data.plan).toBeUndefined(); // plan NOT touched
    expect(data.subscriptionStatus).toBe("cancelled");
    expect(data.currentPeriodEnd).toEqual(new Date("2099-01-01T00:00:00Z"));
  });

  it("subscription_expired drops the plan to free", async () => {
    await POST(makeReq("subscription_expired", { customer_id: "cust_1", status: "expired" }));
    const data = lastUpdateData();
    expect(data.plan).toBe("free");
    expect(data.subscriptionStatus).toBe("expired");
  });

  it("subscription_paused suspends via status, keeps the plan", async () => {
    await POST(makeReq("subscription_paused", { customer_id: "cust_1", status: "paused" }));
    const data = lastUpdateData();
    expect(data.plan).toBeUndefined();
    expect(data.subscriptionStatus).toBe("paused");
  });

  it("subscription_payment_failed sets past_due, keeps the plan", async () => {
    await POST(makeReq("subscription_payment_failed", { customer_id: "cust_1" }));
    const data = lastUpdateData();
    expect(data.plan).toBeUndefined();
    expect(data.subscriptionStatus).toBe("past_due");
  });

  it("subscription_payment_success grants the current plan's credits", async () => {
    await POST(makeReq("subscription_payment_success", { customer_id: "cust_1" }));
    expect(grantCalls.length).toBe(1);
    expect(grantCalls[0].amount).toBe(3000); // PLAN_MONTHLY_CREDITS.pro
    expect(grantCalls[0].type).toBe("subscription_grant");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- webhooks/lemonsqueezy` (from `frontend/`)
Expected: FAIL — `subscription_paused`/`subscription_payment_failed` fall through to default (no update), and `subscription_cancelled` currently sets `plan: "free"`.

- [ ] **Step 3: Implement** — in `frontend/src/app/api/webhooks/lemonsqueezy/route.ts`, replace the combined cancelled/expired case (the block beginning `case "subscription_cancelled":` and `case "subscription_expired": {`) with these four cases:

```ts
      case "subscription_cancelled": {
        // Cancellation is scheduled: the user keeps their paid plan and features
        // until the period actually ends (subscription_expired). Only mark status
        // and record the access-until date so the account page can show it.
        const user = await findUser(attrs.customer_id, customData);
        if (!user) {
          handlerError = "user not found";
          break;
        }
        resolvedUserId = user.id;
        const endsAt = attrs.ends_at ?? attrs.renews_at;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: "cancelled",
            currentPeriodEnd: endsAt ? new Date(String(endsAt)) : user.currentPeriodEnd,
          },
        });
        handled = true;
        break;
      }

      case "subscription_expired": {
        // The real end of access — now drop to free.
        const user = await findUser(attrs.customer_id, customData);
        if (!user) {
          handlerError = "user not found";
          break;
        }
        resolvedUserId = user.id;
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: "free", subscriptionStatus: "expired" },
        });
        handled = true;
        break;
      }

      case "subscription_paused": {
        // Paused: keep the plan record so resuming restores access, but suspend
        // entitlement via status (effectivePlan treats "paused" as not entitled).
        const user = await findUser(attrs.customer_id, customData);
        if (!user) {
          handlerError = "user not found";
          break;
        }
        resolvedUserId = user.id;
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: "paused" },
        });
        handled = true;
        break;
      }

      case "subscription_payment_failed": {
        // Dunning: keep access (still entitled) but flag past_due so the account
        // page reflects it. If dunning ultimately fails, subscription_expired
        // (handled above) drops the user to free.
        const user = await findUser(attrs.customer_id, customData);
        if (!user) {
          handlerError = "user not found";
          break;
        }
        resolvedUserId = user.id;
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: "past_due" },
        });
        handled = true;
        break;
      }
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- webhooks/lemonsqueezy` (from `frontend/`)
Expected: PASS (all 5 lifecycle tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/webhooks/lemonsqueezy/route.ts frontend/src/app/api/webhooks/lemonsqueezy/__tests__/route.test.ts
git commit -m "fix(billing): correct cancelled/expired/paused/payment_failed webhook handling"
```

---

### Task 3: Thread effectivePlan through server-side gates

**Files (all Modify):**
- `frontend/src/app/actions/charge-render.ts` (lines ~44 and ~84)
- `frontend/src/app/actions/create-videos.ts` (lines ~106-113)
- `frontend/src/app/actions/render-preview.ts` (lines ~19-22)
- `frontend/src/app/api/ai-carousel/plan/route.ts` (line ~13)
- `frontend/src/app/api/ai-carousel/generate-slide/route.ts` (line ~27)

No new tests in this task (gating logic itself is unit-tested in Task 1; these are wiring changes). Verification is typecheck + full suite + the manual check at the end.

- [ ] **Step 1: charge-render.ts — import + both gates.** In `frontend/src/app/actions/charge-render.ts`, add `effectivePlan` to the existing `@/lib/credits` import. Then replace the two plan-derivation sites:

`chargeVideo` (was lines 44-45):
```ts
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, subscriptionStatus: true },
  });
  const plan = effectivePlan((user?.plan as PlanName) ?? "free", user?.subscriptionStatus);
```

`chargePost` (was lines 84-85):
```ts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, subscriptionStatus: true },
    });
    const plan = effectivePlan((user?.plan as PlanName) ?? "free", user?.subscriptionStatus);
```

(`@/lib/credits/index.ts` does `export * from "./config"`, so `effectivePlan` is already re-exported from the `@/lib/credits` barrel — no barrel edit needed. Just add it to this file's existing `@/lib/credits` import list.)

- [ ] **Step 2: create-videos.ts gate + isFreeTier.** In `frontend/src/app/actions/create-videos.ts`, add `effectivePlan` to the `@/lib/credits` import. Replace the select + plan derivation (was lines 106-113):

```ts
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, subscriptionStatus: true },
  });
  const plan = effectivePlan((user?.plan as PlanName) ?? "free", user?.subscriptionStatus);
  // Free tier (incl. suspended paid plans) gets watermark + 720p in the backend
  // render. Derived from the EFFECTIVE plan here (server-side, authoritative).
  const isFreeTier = plan === "free";
```

- [ ] **Step 3: render-preview.ts isFreeTier.** In `frontend/src/app/actions/render-preview.ts`, add `effectivePlan` to its `@/lib/credits` (or `@/lib/credits/config`) import — match the file's existing import source for `PlanName`. Replace (was lines 19-22):

```ts
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, subscriptionStatus: true },
      })
    : null;
  const plan = effectivePlan((user?.plan as PlanName) ?? "free", user?.subscriptionStatus);
  const isFreeTier = plan === "free";
```

- [ ] **Step 4: ai-carousel/plan/route.ts gate.** In `frontend/src/app/api/ai-carousel/plan/route.ts`, change the import to `import { canUseImageCarousel, effectivePlan, type PlanName } from "@/lib/credits/config";` and replace lines ~13-14:

```ts
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, subscriptionStatus: true },
  });
  const plan = effectivePlan((user?.plan as PlanName) ?? "free", user?.subscriptionStatus);
  if (!canUseImageCarousel(plan)) {
```

- [ ] **Step 5: ai-carousel/generate-slide/route.ts gate.** In `frontend/src/app/api/ai-carousel/generate-slide/route.ts`, add `effectivePlan` to its config import and replace lines ~27-28:

```ts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, subscriptionStatus: true },
    });
    const plan = effectivePlan((user?.plan as PlanName) ?? "free", user?.subscriptionStatus);
```

- [ ] **Step 6: Typecheck + full suite.**

Run (from `frontend/`): `npx tsc --noEmit && npm test`
Expected: tsc clean; tests pass (the pre-existing `integration.test.ts` reconcile-cron/`R2_PUBLIC_URL` failure is unrelated and also fails on master — do not try to fix it here).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/actions/charge-render.ts frontend/src/app/actions/create-videos.ts frontend/src/app/actions/render-preview.ts frontend/src/app/api/ai-carousel/plan/route.ts frontend/src/app/api/ai-carousel/generate-slide/route.ts
git commit -m "fix(billing): gate paid features on effectivePlan (status-aware)"
```

---

### Task 4: Client gating reflects entitlement

**Files (all Modify):**
- `frontend/src/app/api/credits/balance/route.ts`
- `frontend/src/lib/usePlan.ts`
- `frontend/src/components/create/AIStorySetup.tsx`
- `frontend/src/app/create/video-setup/page.tsx`

- [ ] **Step 1: balance route returns entitledPlan.** In `frontend/src/app/api/credits/balance/route.ts`, import the helper and add the field. Replace the body of `GET`'s return section:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectivePlan, type PlanName } from "@/lib/credits/config";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { creditBalance: true, plan: true, subscriptionStatus: true },
  });
  const plan = (user?.plan as PlanName) ?? "free";
  return NextResponse.json({
    balance: user?.creditBalance ?? 0,
    plan,                                            // raw plan, for display (sidebar)
    entitledPlan: effectivePlan(plan, user?.subscriptionStatus), // for feature gating
    subscriptionStatus: user?.subscriptionStatus ?? null,
  });
}
```

- [ ] **Step 2: usePlan exposes entitledPlan.** In `frontend/src/lib/usePlan.ts`, extend `PlanInfo` and the state:

```ts
export interface PlanInfo {
  plan: PlanName;          // raw plan (display)
  entitledPlan: PlanName;  // status-aware plan (gating)
  balance: number;
  loading: boolean;
}

export function usePlan(): PlanInfo {
  const [info, setInfo] = useState<PlanInfo>({ plan: "free", entitledPlan: "free", balance: 0, loading: true });

  useEffect(() => {
    let active = true;
    fetch("/api/credits/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d) {
          setInfo({
            plan: (d.plan as PlanName) ?? "free",
            entitledPlan: (d.entitledPlan as PlanName) ?? (d.plan as PlanName) ?? "free",
            balance: d.balance ?? 0,
            loading: false,
          });
        } else if (active) {
          setInfo((s) => ({ ...s, loading: false }));
        }
      })
      .catch(() => active && setInfo((s) => ({ ...s, loading: false })));
    return () => {
      active = false;
    };
  }, []);

  return info;
}
```

- [ ] **Step 3: AIStorySetup gates on entitledPlan.** In `frontend/src/components/create/AIStorySetup.tsx` line ~290, change:

```ts
  const { entitledPlan: plan } = usePlan();
```

(Aliasing `entitledPlan` to `plan` keeps the rest of the component — `canUseVideoFormat(plan, …)` — unchanged.)

- [ ] **Step 4: video-setup gates on entitledPlan.** In `frontend/src/app/create/video-setup/page.tsx` line ~311, change:

```ts
  const { entitledPlan: plan } = usePlan();
```

- [ ] **Step 5: Typecheck.**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: clean. (If any other call site destructures `usePlan()` and TS complains about the new required `entitledPlan` field, that's fine — it's additive; existing destructures of `{ plan }` / `{ balance }` keep working.)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/api/credits/balance/route.ts frontend/src/lib/usePlan.ts frontend/src/components/create/AIStorySetup.tsx frontend/src/app/create/video-setup/page.tsx
git commit -m "fix(billing): client feature locks use status-aware entitledPlan"
```

---

### Task 5: Accounts page — portal button + cancelled/paused UI

**Files:**
- Modify: `frontend/src/app/accounts/page.tsx`

- [ ] **Step 1: Portal button for anyone with a portal URL.** In `frontend/src/app/accounts/page.tsx`, change the `canManage` derivation (was line 72) from:

```ts
  const canManage = isPaid && !!user?.customerPortalUrl;
```
to:
```ts
  // Show the portal to anyone who has a portal URL — cancelled, paused, and
  // past_due users still need it to un-cancel or fix payment.
  const canManage = !!user?.customerPortalUrl;
```

- [ ] **Step 2: Add a paused period line.** In the same file, extend the `periodLine` derivation (was lines 75-84) so paused has its own message and cancelled/past_due still read correctly now that plan stays paid:

```ts
  // Renewal / expiry line derived from currentPeriodEnd + status.
  let periodLine: string | null = null;
  if (isPaid) {
    if (status === "paused") {
      periodLine = "Subscription paused — resume to restore access";
    } else if (status === "cancelled" || status === "expired") {
      periodLine = periodEnd ? `Access until ${formatDate(periodEnd)}` : "Subscription ending";
    } else if (status === "past_due") {
      periodLine = periodEnd
        ? `Payment past due · access until ${formatDate(periodEnd)}`
        : "Payment past due";
    } else if (periodEnd) {
      periodLine = `Renews ${formatDate(periodEnd)}`;
    }
  }
```

- [ ] **Step 3: Typecheck + build the page renders.**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Manual verification (dev server).**

Run (from `frontend/`): `npm run dev`. There is no seeded paid user, so verify via DB or trust the unit-tested webhook + the typecheck. At minimum, confirm `/accounts` renders for a signed-in free user (shows "Upgrade", no portal button) without runtime error.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/accounts/page.tsx
git commit -m "fix(billing): account page portal button + cancelled/paused/past_due states"
```

---

## Final verification (after all tasks)

- [ ] From `frontend/`: `npx tsc --noEmit` → clean.
- [ ] From `frontend/`: `npm test` → all pass except the known pre-existing `integration.test.ts` reconcile-cron failure (`R2_PUBLIC_URL` unset; fails identically on master).
- [ ] Confirm no `prisma migrate` is needed (no `schema.prisma` change in the diff: `git diff --stat master -- frontend/prisma/schema.prisma` is empty).

## Notes for the implementer

- **No DB migration.** If you find yourself editing `prisma/schema.prisma`, stop — the plan does not require it.
- The authoritative gates are server-side (Tasks 2 + 3). The client (Task 4) is UX only; a user who bypasses a client lock is still blocked server-side and receives watermark/720p via the `isFreeTier` derivation.
- Lemon Squeezy status strings used here: `active`, `on_trial`, `paused`, `past_due`, `cancelled`, `expired`. `subscription_updated` remains the catch-all that re-syncs `subscriptionStatus`, which is how resume/unpause restores entitlement.
