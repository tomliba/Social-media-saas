import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "crypto";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// In-memory Prisma store — same design as credits.test.ts, extended with
// `plan` on the user (needed by the animation gate) and `user.findFirst`
// (needed by the Lemon Squeezy webhook's findUser). The credit functions
// (spend/refund/grant) run for real against this store, so ledger assertions
// reflect real behavior.
// ─────────────────────────────────────────────────────────────────────────
const store = vi.hoisted(() => ({
  users: new Map<
    string,
    {
      id: string;
      creditBalance: number;
      plan: string;
      customerPortalUrl?: string | null;
      lemonSqueezyCustomerId?: string | null;
    }
  >(),
  txs: [] as Array<{
    id: string;
    userId: string;
    delta: number;
    balanceAfter: number;
    type: string;
    reason: string | null;
    jobId: string | null;
    externalEventId: string | null;
    createdAt: Date;
  }>,
}));

vi.mock("@/lib/prisma", () => {
  const tx = {
    $queryRaw: async (_s: TemplateStringsArray, userId: string) => {
      const u = store.users.get(userId);
      return u ? [{ creditBalance: u.creditBalance }] : [];
    },
    creditTransaction: {
      findUnique: async ({ where }: any) => {
        if (where.jobId_type) {
          return (
            store.txs.find(
              (t) =>
                t.jobId === where.jobId_type.jobId && t.type === where.jobId_type.type
            ) ?? null
          );
        }
        if ("externalEventId" in where) {
          return store.txs.find((t) => t.externalEventId === where.externalEventId) ?? null;
        }
        return null;
      },
      findFirst: async ({ where }: any) =>
        store.txs.find((t) => t.jobId === where.jobId && t.delta < 0) ?? null,
      create: async ({ data }: any) => {
        const row = {
          id: `tx_${store.txs.length + 1}`,
          reason: null,
          jobId: null,
          externalEventId: null,
          createdAt: new Date(),
          ...data,
        };
        store.txs.push(row);
        return row;
      },
      count: async ({ where }: any) =>
        store.txs.filter((t) => t.userId === where.userId).length,
    },
    user: {
      update: async ({ where, data }: any) => {
        const u = store.users.get(where.id);
        if (u) Object.assign(u, data);
        return u ? { ...u } : null;
      },
      findUnique: async ({ where }: any) => {
        const u = store.users.get(where.id);
        return u ? { ...u } : null;
      },
      findUniqueOrThrow: async ({ where }: any) => {
        const u = store.users.get(where.id);
        if (!u) throw new Error("User not found");
        return { ...u };
      },
      findFirst: async ({ where }: any) => {
        for (const u of store.users.values()) {
          if (
            where.lemonSqueezyCustomerId !== undefined &&
            u.lemonSqueezyCustomerId === where.lemonSqueezyCustomerId
          ) {
            return { ...u };
          }
        }
        return null;
      },
    },
  };
  return { prisma: { ...tx, $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } };
});

// Auth + Flask render are mocked; everything else is real.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/flask-render", () => ({
  renderVideoViaFlask: vi.fn(),
  renderPostViaFlask: vi.fn(),
}));

import { triggerVideoRenders, type VideoRenderRequest } from "@/app/actions/create-videos";
import { triggerPostRenders, type PostRenderRequest } from "@/app/actions/create-posts";
import { POST as lemonWebhook } from "@/app/api/webhooks/lemonsqueezy/route";
import { PLAN_MONTHLY_CREDITS, TOPUP_PACKS, type VideoFormat } from "@/lib/credits/config";
import { auth } from "@/lib/auth";
import { renderVideoViaFlask, renderPostViaFlask } from "@/lib/flask-render";

const mockedAuth = vi.mocked(auth);
const mockedRenderVideo = vi.mocked(renderVideoViaFlask);
const mockedRenderPost = vi.mocked(renderPostViaFlask);

// ── helpers ──
function seedUser(id: string, creditBalance: number, plan = "free") {
  store.users.set(id, { id, creditBalance, plan });
}
function balanceOf(id: string) {
  return store.users.get(id)!.creditBalance;
}
function txsByType(type: string) {
  return store.txs.filter((t) => t.type === type);
}
function asSession(id: string) {
  // Test stub for the NextAuth session — only `user.id` is read by the actions.
  return { user: { id } } as unknown as Awaited<ReturnType<typeof auth>>;
}
function videoReq(o: { format: VideoFormat; durationSeconds: number; title?: string }): VideoRenderRequest {
  return {
    title: o.title ?? "Test video",
    script: "hello world",
    template: "Did You Know",
    format: o.format,
    durationSeconds: o.durationSeconds,
    settings: {
      tone: "Regular",
      presenter: "Doctor",
      voice: "voice-id",
      background: "Stock footage",
      duration: `${o.durationSeconds}s`,
      layout: "Standard",
    },
  };
}
function postReq(): PostRenderRequest {
  return {
    pgJobId: "pg1",
    selectedIdeas: [1, 2],
    ideaTopics: ["topic a", "topic b"],
    format: "image_post_ai",
    ideas: 2,
    settings: { tone: "Funny", platform: "Instagram" },
  };
}
function sign(body: string, secret = "test_secret") {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}
function webhookReq(payload: unknown): NextRequest {
  const body = JSON.stringify(payload);
  return new Request("http://test/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": sign(body) },
    body,
  }) as unknown as NextRequest;
}

beforeEach(() => {
  store.users.clear();
  store.txs.length = 0;
  vi.clearAllMocks();
  vi.stubEnv("TRIGGER_SECRET_KEY", ""); // force the Direct Flask path (no Trigger.dev)
  vi.stubEnv("LEMONSQUEEZY_WEBHOOK_SECRET", "test_secret");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

// ─────────────────────────────────────────────────────────────────────────
// Charge path — triggerVideoRenders / triggerPostRenders
// ─────────────────────────────────────────────────────────────────────────

describe("charge path", () => {
  it("a charging video request deducts the exact cost and writes exactly one ledger row", async () => {
    seedUser("u1", 100, "pro");
    mockedAuth.mockResolvedValue(asSession("u1"));
    mockedRenderVideo.mockResolvedValue(
      { videoUrl: "https://cdn/test.mp4" } as Awaited<ReturnType<typeof renderVideoViaFlask>>
    );

    const res = await triggerVideoRenders([videoReq({ format: "skeleton", durationSeconds: 30 })]);

    expect(res).toMatchObject({ ok: true });
    expect(balanceOf("u1")).toBe(85); // skeleton = 15
    const spends = txsByType("render_spend");
    expect(spends).toHaveLength(1);
    expect(spends[0].delta).toBe(-15);
    expect(mockedRenderVideo).toHaveBeenCalledTimes(1);
  });

  it("a non-Pro animation request returns plan_not_allowed, charges nothing, and never dispatches", async () => {
    for (const plan of ["free", "creator"] as const) {
      store.users.clear();
      store.txs.length = 0;
      vi.clearAllMocks();
      seedUser("u2", 100, plan);
      mockedAuth.mockResolvedValue(asSession("u2"));

      const res = await triggerVideoRenders([
        videoReq({ format: "animated_character", durationSeconds: 60 }),
      ]);

      expect(res).toMatchObject({
        ok: false,
        error: "plan_not_allowed",
        format: "animated_character",
      });
      expect(balanceOf("u2")).toBe(100);
      expect(store.txs).toHaveLength(0);
      expect(mockedRenderVideo).not.toHaveBeenCalled();
    }
  });

  it("rejects an insufficient balance before charging or dispatching", async () => {
    seedUser("u3", 5, "pro");
    mockedAuth.mockResolvedValue(asSession("u3"));

    const res = await triggerVideoRenders([videoReq({ format: "skeleton", durationSeconds: 30 })]);

    expect(res).toMatchObject({ ok: false, error: "insufficient_credits", needed: 15, balance: 5 });
    expect(balanceOf("u3")).toBe(5);
    expect(store.txs).toHaveLength(0);
    expect(mockedRenderVideo).not.toHaveBeenCalled();
  });

  it("refunds on render failure so the balance nets back to the original", async () => {
    seedUser("u4", 100, "pro");
    mockedAuth.mockResolvedValue(asSession("u4"));
    mockedRenderVideo.mockRejectedValue(new Error("render boom"));

    const res = await triggerVideoRenders([videoReq({ format: "skeleton", durationSeconds: 30 })]);

    expect(res).toMatchObject({ ok: true });
    expect(balanceOf("u4")).toBe(100); // spent 15, refunded 15
    expect(txsByType("render_spend")).toHaveLength(1);
    expect(txsByType("refund")).toHaveLength(1);
    expect(txsByType("refund")[0].delta).toBe(15);
  });

  // Bonus (covers create-posts.ts new cost API; remove if you want to keep to the five).
  it("a charging post request deducts the per-idea cost and writes one ledger row", async () => {
    seedUser("p1", 100, "pro");
    mockedAuth.mockResolvedValue(asSession("p1"));
    mockedRenderPost.mockResolvedValue({ results: [], succeeded: 2, failed: 0 });

    const res = await triggerPostRenders(postReq()); // image_post_ai, 2 ideas → 40

    expect(res).toMatchObject({ ok: true });
    expect(balanceOf("p1")).toBe(60);
    const spends = txsByType("post_spend");
    expect(spends).toHaveLength(1);
    expect(spends[0].delta).toBe(-40);
    expect(mockedRenderPost).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Lemon Squeezy webhook grants (the real gap — lemonsqueezy.test.ts only
// covers signature verification)
// ─────────────────────────────────────────────────────────────────────────

describe("lemonsqueezy webhook grants", () => {
  it("grants the plan allotment on subscription_payment_success, idempotent on event id", async () => {
    seedUser("w1", 0, "creator");

    const payload = {
      meta: { event_name: "subscription_payment_success", custom_data: { user_id: "w1" } },
      data: { id: "evt_sub_1", attributes: { customer_id: "cust1", status: "active" } },
    };

    const res = await lemonWebhook(webhookReq(payload));
    expect(res.status).toBe(200);
    expect(balanceOf("w1")).toBe(PLAN_MONTHLY_CREDITS.creator); // 600
    expect(txsByType("subscription_grant")).toHaveLength(1);

    // Replay the same delivery — must not double-grant.
    const res2 = await lemonWebhook(webhookReq(payload));
    expect(res2.status).toBe(200);
    expect(balanceOf("w1")).toBe(PLAN_MONTHLY_CREDITS.creator);
    expect(txsByType("subscription_grant")).toHaveLength(1);
  });

  it("grants pack credits on a top-up order_created, idempotent on event id", async () => {
    seedUser("w2", 0);
    const original = TOPUP_PACKS.length;
    TOPUP_PACKS.push({ credits: 500, lemonSqueezyVariantId: "test_topup_500", label: "Test 500" });
    try {
      const payload = {
        meta: { event_name: "order_created", custom_data: { user_id: "w2" } },
        data: {
          id: "evt_ord_1",
          attributes: { customer_id: "cust2", first_order_item: { variant_id: "test_topup_500" } },
        },
      };

      const res = await lemonWebhook(webhookReq(payload));
      expect(res.status).toBe(200);
      expect(balanceOf("w2")).toBe(500);
      expect(txsByType("topup")).toHaveLength(1);

      const res2 = await lemonWebhook(webhookReq(payload));
      expect(res2.status).toBe(200);
      expect(balanceOf("w2")).toBe(500);
      expect(txsByType("topup")).toHaveLength(1);
    } finally {
      TOPUP_PACKS.length = original; // restore the shared module array
    }
  });
});
